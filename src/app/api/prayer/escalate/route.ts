import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { checkRateLimit, getClientIp, RateLimitNamespace } from '@/lib/rate-limit';

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
}
