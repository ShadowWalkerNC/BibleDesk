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
        byokGeminiKey: profiles.byokGeminiKey,
        byokMuseKey: profiles.byokMuseKey,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    return NextResponse.json(
      {
        success: true,
        user: userRow,
        tier: 'free',
        hasByokGemini: Boolean(profile?.byokGeminiKey),
        hasByokMuse: Boolean(profile?.byokMuseKey),
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

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { geminiKey, museKey } = body;

    const db = await getDb();
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (geminiKey !== undefined) {
      updateData.byokGeminiKey = geminiKey ? String(geminiKey).trim() : null;
    }
    if (museKey !== undefined) {
      updateData.byokMuseKey = museKey ? String(museKey).trim() : null;
    }

    await db.update(profiles).set(updateData).where(eq(profiles.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'AI preferences and keys saved successfully.',
      hasByokGemini: Boolean(updateData.byokGeminiKey !== undefined ? updateData.byokGeminiKey : true),
      hasByokMuse: Boolean(updateData.byokMuseKey !== undefined ? updateData.byokMuseKey : true),
    });
  } catch (err) {
    console.error('[api/auth/me POST] Error:', err);
    return NextResponse.json({ success: false, error: 'Unable to save keys.' }, { status: 500 });
  }
}
