import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/db';
import { prayerRequests } from '@/db/schema';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth';
import { isDatabaseConfigured } from '@/lib/answers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unavailable = () => NextResponse.json({ success: false, error: 'Prayer service unavailable. Local records remain on this device.' }, { status: 503 });

// 'published' is the legacy public status; 'approved' is canonical (schema v10).
// Both are readable on the public feed; nothing else is.
const PUBLIC_STATUSES = ['approved', 'published'];

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ success: true, prayers: [], offline: true });
  try {
    const db = await getDb();
    const rows = await db
      .select({
        id: prayerRequests.id,
        displayName: prayerRequests.displayName,
        request: prayerRequests.request,
        likesCount: prayerRequests.likesCount,
        createdAt: prayerRequests.createdAt,
        countryCode: prayerRequests.countryCode,
        countryName: prayerRequests.countryName,
        latitude: prayerRequests.latitude,
        longitude: prayerRequests.longitude,
        category: prayerRequests.category,
        privacyMode: prayerRequests.privacyMode,
        isAnonymous: prayerRequests.isAnonymous,
        isPublic: prayerRequests.isPublic,
        consentAtlas: prayerRequests.consentAtlas,
        status: prayerRequests.status,
        escalationLevel: prayerRequests.escalationLevel,
      })
      .from(prayerRequests)
      .where(
        and(
          inArray(prayerRequests.status, PUBLIC_STATUSES),
          eq(prayerRequests.escalationLevel, 'atlas'),
          eq(prayerRequests.isPublic, true),
          eq(prayerRequests.isRestricted, false),
          eq(prayerRequests.isRestrictedRegion, false),
          isNull(prayerRequests.deletedAt),
          inArray(prayerRequests.privacyMode, ['approximate', 'precise'])
        )
      )
      .orderBy(desc(prayerRequests.createdAt))
      .limit(100);

    const prayers = rows.map((row) => ({
      id: row.id,
      display_name: row.isAnonymous ? 'Anonymous' : row.displayName,
      request: row.request,
      likes_count: row.likesCount,
      created_at: row.createdAt.toISOString(),
      country_code: row.countryCode,
      country_name: row.countryName,
      latitude: row.privacyMode === 'precise' ? row.latitude : null,
      longitude: row.privacyMode === 'precise' ? row.longitude : null,
      category: row.category,
      privacy_mode: row.privacyMode,
      is_anonymous: row.isAnonymous,
      is_public: row.isPublic,
      consent_atlas: row.consentAtlas,
      status: row.status,
      escalation_level: row.escalationLevel,
    }));
    return NextResponse.json({ success: true, prayers });
  } catch { return unavailable(); }
}

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) return unavailable();
  try {
    const user = await getAuthenticatedUser(req);
    if (req.headers.has('authorization') && !user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    const body = await req.json();
    if (!body || typeof body.request !== 'string' || body.request.trim().length < 5 || body.request.length > 4000 ||
        (body.display_name != null && (typeof body.display_name !== 'string' || body.display_name.length > 100)) ||
        (body.privacy_mode != null && !['approximate', 'precise', 'restricted'].includes(body.privacy_mode))) {
      return NextResponse.json({ success: false, error: 'Provide a prayer of 5–4000 characters and a valid privacy setting.' }, { status: 400 });
    }
    const key = user?.id || getClientIp(req);
    const limit = await checkRateLimit(key, { namespace: 'prayer:submit' });
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const privacy = body.privacy_mode || 'approximate';
    const restricted = body.is_restricted === true || privacy === 'restricted';
    const precise = privacy === 'precise' && !restricted;
    if (precise && (!Number.isFinite(body.latitude) || Math.abs(body.latitude) > 90 || !Number.isFinite(body.longitude) || Math.abs(body.longitude) > 180)) {
      return NextResponse.json({ error: 'Valid coordinates required for a precise pin.' }, { status: 400 });
    }
    const anonymous = body.anonymous === true || restricted;
    const db = await getDb();
    const inserted = await db
      .insert(prayerRequests)
      .values({
        id: uuidv4(),
        userId: user?.id || null,
        request: body.request.trim(),
        displayName: anonymous ? 'Anonymous' : (body.display_name?.trim() || 'Anonymous'),
        isAnonymous: anonymous,
        privacyMode: restricted ? 'restricted' : privacy,
        isRestricted: restricted,
        isRestrictedRegion: restricted,
        isPublic: !restricted,
        consentAtlas: body.consent_atlas === true && !restricted,
        status: 'pending',
        escalationLevel: restricted ? 'private' : 'atlas',
        countryCode: typeof body.country_code === 'string' ? body.country_code.slice(0, 3) : null,
        countryName: typeof body.country_name === 'string' ? body.country_name.slice(0, 100) : null,
        latitude: precise ? body.latitude : null,
        longitude: precise ? body.longitude : null,
        category: typeof body.category === 'string' ? body.category.slice(0, 50) : 'community',
        likesCount: 0,
      })
      .returning();
    const insertedRow = inserted[0];
    if (!insertedRow) return unavailable();
    // No automatic external forwarding. A submission cannot self-approve publication.
    return NextResponse.json({
      success: true,
      prayer: {
        id: insertedRow.id,
        status: insertedRow.status,
        escalation_level: insertedRow.escalationLevel,
      },
      message: 'Prayer received for review.',
    }, { status: 201 });
  } catch { return NextResponse.json({ success: false, error: 'Unable to submit prayer.' }, { status: 400 }); }
}

export async function PUT(req: NextRequest) {
  if (!isDatabaseConfigured()) return unavailable();
  try {
    const { id } = await req.json();
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Valid ID required.' }, { status: 400 });
    const limit = await checkRateLimit(getClientIp(req), { namespace: 'prayer:like' });
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const db = await getDb();
    // Only public, approved, visible rows can be liked. Private/held/deleted
    // rows are invisible here, so liking one returns 404 — never 200.
    const updated = await db
      .update(prayerRequests)
      .set({
        likesCount: sql`${prayerRequests.likesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(prayerRequests.id, id),
          eq(prayerRequests.isPublic, true),
          inArray(prayerRequests.status, PUBLIC_STATUSES),
          isNull(prayerRequests.deletedAt)
        )
      )
      .returning();
    const row = updated[0];
    if (!row) return NextResponse.json({ error: 'Prayer not found.' }, { status: 404 });
    return NextResponse.json({ success: true, prayer: { id: row.id, likes_count: row.likesCount } });
  } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
}
