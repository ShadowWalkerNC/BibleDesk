// BibleDesk — IP-based rate limiting via Supabase
// Anonymous users: 15 questions per hour per IP
// SECURITY: Uses hashed IPs — never store raw IPs

import crypto from 'crypto';
import { getServerClient } from './supabase';

const LIMIT = 15;           // questions per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + (process.env.IP_HASH_SALT ?? 'bibledesk')).digest('hex');
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(rawIp: string): Promise<RateLimitResult> {
  const ipHash = hashIp(rawIp);
  const client = getServerClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  // Upsert pattern: get existing record or create it
  const { data, error } = await client
    .from('rate_limits')
    .select('count, window_start')
    .eq('ip_hash', ipHash)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows — that's fine, first request
    console.error('Rate limit check error:', error.message);
    // Fail open — allow the request
    return { allowed: true, remaining: LIMIT - 1, resetAt: new Date(now.getTime() + WINDOW_MS) };
  }

  if (!data || new Date(data.window_start) < windowStart) {
    // No record or window expired — reset
    await client.from('rate_limits').upsert({
      ip_hash: ipHash,
      count: 1,
      window_start: now.toISOString(),
    });
    return { allowed: true, remaining: LIMIT - 1, resetAt: new Date(now.getTime() + WINDOW_MS) };
  }

  if (data.count >= LIMIT) {
    const resetAt = new Date(new Date(data.window_start).getTime() + WINDOW_MS);
    return { allowed: false, remaining: 0, resetAt };
  }

  // Increment counter
  await client
    .from('rate_limits')
    .update({ count: data.count + 1 })
    .eq('ip_hash', ipHash);

  return {
    allowed: true,
    remaining: LIMIT - data.count - 1,
    resetAt: new Date(new Date(data.window_start).getTime() + WINDOW_MS),
  };
}
