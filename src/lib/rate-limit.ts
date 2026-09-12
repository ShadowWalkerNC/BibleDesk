// BibleDesk — rate limiting via Supabase
// Default: 15 requests per hour per feature bucket.
// EXCEPTION (owner decision 2026-09-12, task C03): the `ask` bucket is
// 5 free AI answers per DAY, then BYOK (bring-your-own Gemini key) for
// unlimited. Marketing, README, and this limiter all state the same policy.
// SECURITY: Uses hashed identities — never store raw IPs or user IDs.
//
// SECURITY MODEL — fail-closed:
//  1. If Supabase (the backing store) is unconfigured, or the store errors,
//     requests are DENIED, never allowed unlimited. Deny-by-default is a
//     deliberate choice: a silent misconfiguration must never turn the
//     limiter into a no-op gate.
//  2. Buckets are namespaced per feature: the bucket key is
//     sha256(namespace + ':' + identity + salt), so one feature's traffic
//     can neither starve nor pollute another's.
//  3. Client identity comes from getClientIp() below, which never trusts
//     the spoofable leftmost `x-forwarded-for` entry.

import crypto from 'crypto';
import { getServerClient } from './supabase';

const DEFAULT_LIMIT = 15; // requests per window
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Owner decision 2026-09-12 (C03): the ask bucket (server-key AI answers)
// is 5 free per day, then BYOK. All other buckets keep the 15/hour default.
const ASK_LIMIT = 5; // free server AI answers per window
const ASK_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Well-known per-feature buckets. Pass one of these as the `namespace`
 * option to checkRateLimit. Add a new entry per rate-limited feature
 * (mcp/v1 are reserved for the API routes added downstream).
 */
export const RateLimitNamespace = {
  ask: 'ask',
  church: 'church',
  prayerEscalate: 'prayer:escalate',
  mcp: 'mcp',
  v1: 'v1',
} as const;

export interface RateLimitOptions {
  /** Feature bucket — isolates limits so features can't starve each other. Defaults to 'default'. */
  namespace?: string;
  /** Max requests per window. Defaults to 15. */
  limit?: number;
  /** Window length in milliseconds. Defaults to 1 hour. */
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/** Minimal request shape for identity extraction (avoids importing next/server here). */
export interface HasHeaders {
  headers: { get(name: string): string | null };
}

/**
 * Extract the client identity from request headers.
 *
 * NEVER trusts the leftmost `x-forwarded-for` entry: a client can inject
 * arbitrary IPs there. Priority:
 *   1. `x-real-ip` — set (overwritten) by the hosting edge / reverse proxy
 *      (Vercel and most proxies set this). Trust assumes the app runs behind
 *      such an edge; a self-hosted deployment without a proxy MUST strip this
 *      header at its edge, or it becomes spoofable.
 *   2. The RIGHTMOST `x-forwarded-for` entry — the hop that connected to our
 *      edge; the only entry the client cannot inject (our edge appends it).
 *   3. `127.0.0.1` as a last resort.
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

// Bucket key: namespaced + hashed, so raw identities never reach the store
// and features can never share a bucket. Fits the rate_limits.ip_hash
// VARCHAR(64) PRIMARY KEY column (hex sha256 = 64 chars).
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
  // C03: the ask bucket enforces the owner-decided 5-free-per-day policy;
  // every other bucket keeps the 15/hour default. Explicit options win.
  const isAsk = namespace === RateLimitNamespace.ask;
  const limit = options.limit ?? (isAsk ? ASK_LIMIT : DEFAULT_LIMIT);
  const windowMs = options.windowMs ?? (isAsk ? ASK_WINDOW_MS : DEFAULT_WINDOW_MS);
  const now = new Date();

  // FAIL-CLOSED (1): unconfigured backing store => deny, never unlimited.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      '[rate-limit] DENY: Supabase is unconfigured. Refusing request instead of allowing unlimited.'
    );
    return denied(windowMs);
  }

  const bucketKey = hashBucket(namespace, identity);
  const client = getServerClient();
  const windowStart = new Date(now.getTime() - windowMs);

  // Upsert pattern: get existing record or create it
  const { data, error } = await client
    .from('rate_limits')
    .select('count, window_start')
    .eq('ip_hash', bucketKey)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows — that's fine, first request.
    // FAIL-CLOSED (2): any other store error => deny, never fail open.
    console.error(
      '[rate-limit] DENY: backing store error. Refusing request instead of failing open:',
      error.message
    );
    return denied(windowMs);
  }

  if (!data || new Date(data.window_start) < windowStart) {
    // No record or window expired — reset
    await client.from('rate_limits').upsert({
      ip_hash: bucketKey,
      count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true, remaining: limit - 1, resetAt: new Date(now.getTime() + windowMs) };
  }

  if (data.count >= limit) {
    const resetAt = new Date(new Date(data.window_start).getTime() + windowMs);
    return { allowed: false, remaining: 0, resetAt };
  }

  // Increment counter
  await client
    .from('rate_limits')
    .update({ count: data.count + 1 })
    .eq('ip_hash', bucketKey);

  return {
    allowed: true,
    remaining: limit - data.count - 1,
    resetAt: new Date(new Date(data.window_start).getTime() + windowMs),
  };
}
