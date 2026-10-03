// BibleDesk — POST /api/auth/signup
// Creates a Railway PostgreSQL account (users + profiles rows) and returns a
// stateless JWT. No email provider is wired, so accounts are active immediately.

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/db';
import { users, profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isJwtConfigured, signAuthToken } from '@/lib/auth';
import { hashPassword, PasswordError } from '@/lib/password';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!isJwtConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Authentication has not been configured for this deployment.' },
      { status: 503 }
    );
  }

  // Rate-limit signups when a shared store exists. Pure-PGlite local runs skip
  // the limiter (single-user device; the fail-closed limiter would deny them).
  if (process.env.DATABASE_URL) {
    const rl = await checkRateLimit(getClientIp(req), {
      namespace: 'auth:signup',
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many signup attempts. Try again later.' },
        { status: 429 }
      );
    }
  }

  let body: { email?: unknown; password?: unknown; name?: unknown; churchName?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : null;
  const churchName =
    typeof body.churchName === 'string' && body.churchName.trim()
      ? body.churchName.trim().slice(0, 160)
      : null;
  const role = body.role === 'pastor' ? 'pastor' : 'member';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, error: 'A valid email address is required.' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Sign in instead.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const id = uuidv4();

    await db.insert(users).values({ id, email, name, passwordHash });
    await db.insert(profiles).values({ id, name, churchName, role }).onConflictDoNothing();

    const token = await signAuthToken({ id, email, name });
    return NextResponse.json(
      { success: true, token, user: { id, email, name }, tier: 'free' },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof PasswordError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    }
    console.error('[api/auth/signup] Error:', err);
    const detail = err?.message || 'Database error';
    return NextResponse.json(
      {
        success: false,
        error: `Unable to create account: ${detail}`,
      },
      { status: 500 }
    );
  }
}
