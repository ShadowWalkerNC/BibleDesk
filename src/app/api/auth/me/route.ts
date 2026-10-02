// BibleDesk — GET /api/auth/me
// Validates the Bearer JWT and returns the user + subscription tier so clients
// can render account state without direct database access.

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { profiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';
import { getUserTier } from '@/lib/tiers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();
    const [userRow] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userRow) {
      return NextResponse.json(
        { success: false, error: 'Account no longer exists.' },
        { status: 401 }
      );
    }

    const [profile] = await db
      .select({
        subscriptionTier: profiles.subscriptionTier,
        subscriptionStatus: profiles.subscriptionStatus,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    return NextResponse.json(
      {
        success: true,
        user: userRow,
        tier: getUserTier(profile ?? null),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[api/auth/me] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to load account.' },
      { status: 500 }
    );
  }
}
