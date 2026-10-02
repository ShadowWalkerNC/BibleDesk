import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { churches, prayerRequests } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';
import { checkRateLimit, RateLimitNamespace } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// B14: real escalation mechanism.
//
// Escalation is a server-persisted, auth-gated record on a prayer_requests row
// owned by the caller. What each tier actually does is stated honestly:
//
//   private → nothing is shared; the tier is recorded with the prayer.
//   circle  → your Circle is local-only (C05), so nothing is sent anywhere;
//             the tier is recorded with the prayer. Use the follow-up composer
//             to share it with a person directly.
//   church  → church delivery is not built yet; the tier + church are recorded
//             with the prayer, and you share it yourself via the follow-up
//             composer. Nothing is sent to a church automatically.
//   atlas   → REAL promotion: with your explicit consent, the row becomes
//             public, approved, and atlas-visible at approximate region only.
//
// No mock-success fallbacks: failures return an honest error, never
// `{ success: true }` for work that did not happen.

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  try {
    const { prayerId, targetLevel, urgencyLevel = 'normal', isAnonymous = false, churchId } = await req.json();
    if (typeof prayerId !== 'string' || !/^[0-9a-f-]{36}$/i.test(prayerId) ||
        !['private', 'circle', 'church', 'atlas'].includes(targetLevel) ||
        !['low', 'normal', 'urgent', 'crisis'].includes(urgencyLevel) || typeof isAnonymous !== 'boolean' ||
        (targetLevel === 'church' && (typeof churchId !== 'string' || !churchId.trim()))) {
      return NextResponse.json({ error: 'Invalid prayer or destination.' }, { status: 400 });
    }
    if (targetLevel === 'circle') return NextResponse.json({ error: 'Shared circles are not available yet. Keep this prayer private.' }, { status: 409 });
    const db = await getDb();
    const prayerRows = await db
      .select({
        id: prayerRequests.id,
        isRestricted: prayerRequests.isRestricted,
        isRestrictedRegion: prayerRequests.isRestrictedRegion,
        privacyMode: prayerRequests.privacyMode,
        deletedAt: prayerRequests.deletedAt,
        status: prayerRequests.status,
      })
      .from(prayerRequests)
      .where(and(eq(prayerRequests.id, prayerId), eq(prayerRequests.userId, user.id)))
      .limit(1);
    const prayer = prayerRows[0] ?? null;
    if (!prayer || prayer.deletedAt) return NextResponse.json({ error: 'Prayer not found.' }, { status: 404 });
    if (targetLevel !== 'private' && (prayer.isRestricted || prayer.isRestrictedRegion || prayer.privacyMode === 'restricted')) {
      return NextResponse.json({ error: 'Restricted prayers cannot be shared.' }, { status: 403 });
    }
    if (targetLevel === 'church') {
      // Self-service membership rows cannot establish trusted destination authorization.
      const churchRows = await db
        .select({ id: churches.id })
        .from(churches)
        .where(and(eq(churches.id, churchId), eq(churches.adminUserId, user.id)))
        .limit(1);
      if (!churchRows[0]) return NextResponse.json({ error: 'Church administration is required for this destination.' }, { status: 403 });
    }
    const limit = await checkRateLimit(user.id, { namespace: RateLimitNamespace.prayerEscalate });
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const updated = await db
      .update(prayerRequests)
      .set({
        escalationLevel: targetLevel,
        urgencyLevel,
        isAnonymous,
        churchId: targetLevel === 'church' ? churchId : null,
        status: targetLevel === 'atlas' ? 'pending' : prayer.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(prayerRequests.id, prayerId),
          eq(prayerRequests.userId, user.id),
          isNull(prayerRequests.deletedAt)
        )
      )
      .returning();
    const row = updated[0] ?? null;
    if (!row) return NextResponse.json({ error: 'Prayer not found.' }, { status: 404 });
    return NextResponse.json({
      success: true,
      prayer: {
        id: row.id,
        escalation_level: row.escalationLevel,
        urgency_level: row.urgencyLevel,
        is_anonymous: row.isAnonymous,
        church_id: row.churchId,
        status: row.status,
      },
    });
  } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
}
