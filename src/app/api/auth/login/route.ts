// BibleDesk — POST /api/auth/login
// Verifies email + scrypt password against Railway PostgreSQL and returns a
// stateless JWT. Error messages never reveal whether the email exists.

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { users, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isJwtConfigured, signAuthToken } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getUserTier } from '@/lib/tiers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INVALID = 'Invalid email or password.';

export async function POST(req: NextRequest) {
  if (!isJwtConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Authentication has not been configured for this deployment.' },
      { status: 503 }
    );
  }

  // Rate-limit logins when a shared store exists (see signup route for the
  // pure-PGlite local exception).
  if (process.env.DATABASE_URL) {
    const rl = await checkRateLimit(getClientIp(req), {
      namespace: 'auth:login',
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Try again later.' },
        { status: 429 }
      );
    }
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: INVALID }, { status: 401 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) {
    return NextResponse.json({ success: false, error: INVALID }, { status: 401 });
  }

  try {
    const db = await getDb();
    const rows = await db
      .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const row = rows[0];
    if (!row || !row.passwordHash || !(await verifyPassword(password, row.passwordHash))) {
      return NextResponse.json({ success: false, error: INVALID }, { status: 401 });
    }

    const profileRows = await db
      .select({
        subscriptionTier: profiles.subscriptionTier,
        subscriptionStatus: profiles.subscriptionStatus,
      })
      .from(profiles)
      .where(eq(profiles.id, row.id))
      .limit(1);

    const token = await signAuthToken({ id: row.id, email: row.email, name: row.name });
    return NextResponse.json({
      success: true,
      token,
      user: { id: row.id, email: row.email, name: row.name },
      tier: getUserTier(profileRows[0] ?? null),
    });
  } catch (err) {
    console.error('[api/auth/login] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to sign in. Try again later.' },
      { status: 500 }
    );
  }
}
