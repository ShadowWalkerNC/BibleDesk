import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
<<<<<<< HEAD
import { checkRateLimit } from '@/lib/rate-limit';
=======
import { checkRateLimit, getClientIp, RateLimitNamespace } from '@/lib/rate-limit';
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999

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

const VALID_LEVELS = ['private', 'circle', 'church', 'atlas'] as const;

export async function POST(req: NextRequest) {
<<<<<<< HEAD
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
    const supabase = getServerClient();
    const { data: prayer, error } = await supabase.from('prayer_requests')
      .select('id,is_restricted,is_restricted_region,privacy_mode,deleted_at,status')
      .eq('id', prayerId).eq('user_id', user.id).maybeSingle();
    if (error) return NextResponse.json({ error: 'Prayer service unavailable.' }, { status: 503 });
    if (!prayer || prayer.deleted_at) return NextResponse.json({ error: 'Prayer not found.' }, { status: 404 });
    if (targetLevel !== 'private' && (prayer.is_restricted || prayer.is_restricted_region || prayer.privacy_mode === 'restricted')) {
      return NextResponse.json({ error: 'Restricted prayers cannot be shared.' }, { status: 403 });
    }
    if (targetLevel === 'church') {
      // Self-service membership rows cannot establish trusted destination authorization.
      const { data: church, error: churchError } = await supabase.from('churches')
        .select('id').eq('id', churchId).eq('admin_user_id', user.id).maybeSingle();
      if (churchError) return NextResponse.json({ error: 'Church service unavailable.' }, { status: 503 });
      if (!church) return NextResponse.json({ error: 'Church administration is required for this destination.' }, { status: 403 });
    }
    const limit = await checkRateLimit('prayer-escalate:' + user.id);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const { data, error: updateError } = await supabase.from('prayer_requests').update({
      escalation_level: targetLevel, urgency_level: urgencyLevel, is_anonymous: isAnonymous,
      church_id: targetLevel === 'church' ? churchId : null,
      status: targetLevel === 'atlas' ? 'pending' : prayer.status,
      updated_at: new Date().toISOString(),
    }).eq('id', prayerId).eq('user_id', user.id).is('deleted_at', null)
      .select('id,escalation_level,urgency_level,is_anonymous,church_id,status').maybeSingle();
    if (updateError) return NextResponse.json({ error: 'Unable to save visibility change.' }, { status: 503 });
    if (!data) return NextResponse.json({ error: 'Prayer not found.' }, { status: 404 });
    return NextResponse.json({ success: true, prayer: data });
  } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
=======
  const ip = getClientIp(req);
  const rl = await checkRateLimit(ip, { namespace: RateLimitNamespace.prayerEscalate });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to escalate a prayer.' }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Escalation is unavailable right now (the server is offline). Nothing was recorded.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { prayerId, targetLevel, urgencyLevel, isAnonymous, churchId, updateNote, atlasConsent } = body;

    if (!prayerId || !targetLevel) {
      return NextResponse.json({ error: 'Missing prayerId or targetLevel' }, { status: 400 });
    }
    if (!VALID_LEVELS.includes(targetLevel)) {
      return NextResponse.json({ error: `Invalid targetLevel: ${targetLevel}` }, { status: 400 });
    }

    const supabase = getServerClient();

    // Ownership check (service role bypasses RLS, so the app enforces it here).
    const { data: existing, error: fetchError } = await supabase
      .from('prayer_requests')
      .select('id,user_id')
      .eq('id', prayerId)
      .single();

    if (fetchError || !existing) {
      // Honest: the client may escalate local-only circle commitments that have
      // no server row — nothing was persisted server-side.
      return NextResponse.json(
        {
          error:
            'This prayer lives on your device only, so there is nothing to escalate on the server. Your escalation choice was recorded locally.',
          localOnly: true,
        },
        { status: 404 }
      );
    }

    if (existing.user_id && existing.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only escalate your own prayers.' }, { status: 403 });
    }

    const update: Record<string, unknown> = {
      escalation_level: targetLevel,
      urgency_level: urgencyLevel || 'normal',
      is_anonymous: !!isAnonymous,
      church_id: churchId || null,
      updated_at: new Date().toISOString(),
    };

    let publishedToAtlas = false;
    if (targetLevel === 'atlas') {
      // Tier 4 is the only tier that changes visibility — and only with an
      // explicit opt-in, recorded in consent_atlas.
      if (atlasConsent !== true) {
        return NextResponse.json(
          { error: 'Sharing to the PrayerAtlas requires your explicit consent. Please check the atlas consent box.' },
          { status: 400 }
        );
      }
      update.is_public = true;
      update.status = 'approved';
      update.consent_atlas = true;
      update.privacy_mode = 'approximate'; // escalated prayers are never precise
      publishedToAtlas = true;
    }

    if (updateNote && String(updateNote).trim().length > 0) {
      update.escalation_note = String(updateNote).trim().slice(0, 2000);
    }

    const { data, error } = await supabase
      .from('prayer_requests')
      .update(update)
      .eq('id', prayerId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      prayer: data,
      targetLevel,
      publishedToAtlas,
      escalated_at: new Date().toISOString(),
      message:
        targetLevel === 'atlas'
          ? 'Shared to the Community Wall and the PrayerAtlas (approximate region only).'
          : targetLevel === 'church'
            ? 'Recorded for your church tier. Church delivery is not built yet — share it with your church directly using the follow-up composer.'
            : targetLevel === 'circle'
              ? 'Recorded on your prayer. Your Circle is stored on this device only — nothing was sent anywhere.'
              : 'Recorded as a private prayer. Nothing was shared.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999
}
