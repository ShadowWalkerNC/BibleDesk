// BibleDesk — Rate Limiting via Railway PostgreSQL (Drizzle)
//
// SECURITY MODEL — fail-closed:
//  1. If DATABASE_URL is unconfigured, or the store errors,
//     requests are DENIED, never allowed unlimited. Deny-by-default is a
//     deliberate choice: a silent misconfiguration must never turn the
//     limiter into a no-op gate.
//  2. Buckets are namespaced per feature: the bucket key is
//     sha256(namespace + ':' + identity + salt), so one feature's traffic
//     can neither starve nor pollute another's.
//  3. Client identity comes from getClientIp() below, which never trusts
//     the spoofable leftmost `x-forwarded-for` entry.
//
// Owner decision 2026-09-12 (C03): the `ask` bucket is 5 free per day,
// then BYOK (bring-your-own Gemini key). All other buckets keep 15/hour default.

import crypto from 'crypto';
import { getDb } from '@/db';
import { rateLimits } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const DEFAULT_LIMIT = 15; // requests per window
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const ASK_LIMIT = 5; // free server AI answers per window
const ASK_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Well-known per-feature buckets. Pass one of these as the `namespace`
 * option to checkRateLimit.
 */
export const RateLimitNamespace = {
  ask: 'ask',
  church: 'church',
  prayerEscalate: 'prayer:escalate',
  mcp: 'mcp',
  v1: 'v1',
} as const;

export interface RateLimitOptions {
  namespace?: string;
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface HasHeaders {
  headers: { get(name: string): string | null };
}

/**
 * Extract the client identity from request headers.
 * NEVER trusts the leftmost x-forwarded-for entry.
 */
export function getClientIp(req: HasHeaders): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return '127.0.0.1';
}

function hashBucket(namespace: string, identity: string): string {
  return crypto
    .createHash('sha256')
    .update(namespace + ':' + identity + ':' + (process.env.IP_HASH_SALT ?? 'bibledesk'))
    .digest('hex');
}

function denied(windowMs: number): RateLimitResult {
  return { allowed: false, remaining: 0, resetAt: new Date(Date.now() + windowMs) };
}

export async function checkRateLimit(
  identity: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const namespace = options.namespace ?? 'default';
  const isAsk = namespace === RateLimitNamespace.ask;
  const limit = options.limit ?? (isAsk ? ASK_LIMIT : DEFAULT_LIMIT);
  const windowMs = options.windowMs ?? (isAsk ? ASK_WINDOW_MS : DEFAULT_WINDOW_MS);
  const now = new Date();

  // FAIL-CLOSED (1): unconfigured backing store => deny, never unlimited.
  if (!process.env.DATABASE_URL) {
    console.error(
      '[rate-limit] DENY: DATABASE_URL is unconfigured. Refusing request instead of allowing unlimited.'
    );
    return denied(windowMs);
  }

  try {
    const db = await getDb();
    const bucketKey = hashBucket(namespace, identity);
    const windowStart = new Date(now.getTime() - windowMs);

    // Fetch existing record
    const rows = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.id, bucketKey))
      .limit(1);

    const existing = rows[0];

    if (!existing || existing.windowStart < windowStart) {
      // No record or window expired — reset with count=1
      await db
        .insert(rateLimits)
        .values({
          id: bucketKey,
          namespace,
          count: 1,
          windowStart: now,
        })
        .onConflictDoUpdate({
          target: rateLimits.id,
          set: {
            count: 1,
            windowStart: now,
            namespace,
          },
        });
      return { allowed: true, remaining: limit - 1, resetAt: new Date(now.getTime() + windowMs) };
    }

    if (existing.count >= limit) {
      const resetAt = new Date(existing.windowStart.getTime() + windowMs);
      return { allowed: false, remaining: 0, resetAt };
    }

    // Increment counter atomically
    await db
      .update(rateLimits)
      .set({ count: sql`${rateLimits.count} + 1` })
      .where(eq(rateLimits.id, bucketKey));

    return {
      allowed: true,
      remaining: limit - existing.count - 1,
      resetAt: new Date(existing.windowStart.getTime() + windowMs),
    };
  } catch (err: any) {
    console.error(
      '[rate-limit] backing store error:',
      err?.message || err
    );
    throw new Error(`Database unavailable: ${err?.message || 'connection error'}`);
  }
}
