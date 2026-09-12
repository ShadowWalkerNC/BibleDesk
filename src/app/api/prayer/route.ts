import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
<<<<<<< HEAD
import { checkRateLimit } from '@/lib/rate-limit';
=======
import { checkAutoFlag } from '@/lib/moderation';
import type { BibleAnswer } from '@/types';
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

<<<<<<< HEAD
const PUBLIC_FIELDS = 'id,display_name,request,likes_count,created_at,country_code,country_name,latitude,longitude,category,privacy_mode,is_anonymous';
const unavailable = () => NextResponse.json({ success: false, error: 'Prayer service unavailable. Local records remain on this device.' }, { status: 503 });
const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET() {
  if (!configured()) return NextResponse.json({ success: true, prayers: [], offline: true });
  try {
    const { data, error } = await getServerClient().from('prayer_requests').select(PUBLIC_FIELDS)
      .eq('status', 'published').eq('escalation_level', 'atlas')
      .eq('is_restricted', false).eq('is_restricted_region', false).is('deleted_at', null)
      .in('privacy_mode', ['approximate', 'precise']).order('created_at', { ascending: false }).limit(100);
    if (error) return unavailable(); // Missing privacy fields must never broaden access.
    const prayers = (data || []).map(row => ({
      ...row,
      display_name: row.is_anonymous ? 'Anonymous' : row.display_name,
      latitude: row.privacy_mode === 'precise' ? row.latitude : null,
      longitude: row.privacy_mode === 'precise' ? row.longitude : null,
    }));
    return NextResponse.json({ success: true, prayers });
  } catch { return unavailable(); }
=======
// B14: public prayer hardening. Posting requires sign-in (the user_id on every
// row comes from the verified session token, never from the client body).
// Reads return only approved public rows; an authenticated caller also sees
// their own rows (pending / held / private) so the composer can report status.

const PUBLIC_COLUMNS =
  'id,user_id,display_name,request,likes_count,created_at,country_code,country_name,latitude,longitude,category,privacy_mode,is_restricted,is_public,consent_atlas,status';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[api/prayer] Supabase is unconfigured, returning empty list.');
      return NextResponse.json({ success: true, prayers: [] });
    }
    const supabase = getServerClient();
    const user = await getAuthenticatedUser(req);

    let query = supabase
      .from('prayer_requests')
      .select(PUBLIC_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(100);

    if (user) {
      // Approved public rows + the caller's own rows (any status).
      query = query.or(`and(is_public.eq.true,status.eq.approved),user_id.eq.${user.id}`);
    } else {
      // Anonymous visitors: approved public rows only.
      query = query.eq('is_public', true).eq('status', 'approved');
    }

    const { data, error } = await query;
    if (error) {
      // Graceful path for databases where the v10 columns are not applied yet:
      // fall back to the pre-hardening read.
      console.warn('[api/prayer] Hardened query failed, falling back to unfiltered read:', error.message);
      const fallback = await supabase
        .from('prayer_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (fallback.error) throw fallback.error;
      return NextResponse.json({ success: true, prayers: fallback.data ?? [] });
    }
    return NextResponse.json({ success: true, prayers: data ?? [] });
  } catch (err: any) {
    console.error('[api/prayer] GET Error:', err);
    return NextResponse.json({ success: true, prayers: [], warning: err.message });
  }
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999
}

export async function POST(req: NextRequest) {
  if (!configured()) return unavailable();
  try {
<<<<<<< HEAD
    const user = await getAuthenticatedUser(req);
    if (req.headers.has('authorization') && !user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    const body = await req.json();
    if (!body || typeof body.request !== 'string' || body.request.trim().length < 5 || body.request.length > 4000 ||
        (body.display_name != null && (typeof body.display_name !== 'string' || body.display_name.length > 100)) ||
        (body.privacy_mode != null && !['approximate', 'precise', 'restricted'].includes(body.privacy_mode))) {
      return NextResponse.json({ success: false, error: 'Provide a prayer of 5–4000 characters and a valid privacy setting.' }, { status: 400 });
    }
    const key = user?.id || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limit = await checkRateLimit('prayer-submit:' + key);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const privacy = body.privacy_mode || 'approximate';
    const restricted = body.is_restricted === true || privacy === 'restricted';
    const precise = privacy === 'precise' && !restricted;
    if (precise && (!Number.isFinite(body.latitude) || Math.abs(body.latitude) > 90 || !Number.isFinite(body.longitude) || Math.abs(body.longitude) > 180)) {
      return NextResponse.json({ error: 'Valid coordinates required for a precise pin.' }, { status: 400 });
    }
    const anonymous = body.anonymous === true || restricted;
    const { data, error } = await getServerClient().from('prayer_requests').insert({
      user_id: user?.id || null, request: body.request.trim(),
      display_name: anonymous ? 'Anonymous' : (body.display_name?.trim() || 'Anonymous'),
      is_anonymous: anonymous, privacy_mode: restricted ? 'restricted' : privacy,
      is_restricted: restricted, is_restricted_region: restricted,
      status: 'pending', escalation_level: restricted ? 'private' : 'atlas',
      country_code: typeof body.country_code === 'string' ? body.country_code.slice(0, 3) : null,
      country_name: typeof body.country_name === 'string' ? body.country_name.slice(0, 100) : null,
      latitude: precise ? body.latitude : null, longitude: precise ? body.longitude : null,
      category: typeof body.category === 'string' ? body.category.slice(0, 50) : 'community', likes_count: 0,
    }).select('id,status,escalation_level').single();
    if (error || !data) return unavailable();
    // No automatic external forwarding. A submission cannot self-approve publication.
    return NextResponse.json({ success: true, prayer: data, message: 'Prayer received for review.' }, { status: 201 });
  } catch { return NextResponse.json({ success: false, error: 'Unable to submit prayer.' }, { status: 400 }); }
}

=======
    // B14: posting requires sign-in. No mock-success offline write anymore:
    // without a database there is nothing honest to return a success for.
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prayer posting is unavailable right now (the server is offline). Your request was not shared — please try again when connected.',
        },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Please sign in to share a prayer request.' },
        { status: 401 }
      );
    }

    const supabase = getServerClient();
    const body = await req.json();
    const {
      request,
      display_name = 'Anonymous',
      anonymous = false,
      country_code = null,
      country_name = null,
      latitude = null,
      longitude = null,
      category = 'community',
      privacy_mode = 'approximate',
      is_restricted = false,
      consent_atlas = false,
    } = body;

    if (!request || request.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Prayer request must be at least 5 characters.' },
        { status: 400 }
      );
    }

    // B14: moderation — scan the request body against the flagged-topics list.
    // Auto-flagged content is stored as 'held' and stays off the public wall
    // until a moderator reviews it.
    let status = 'approved';
    let heldReason: string[] = [];
    try {
      const moderationInput = {
        summary: request.trim(),
        dimensions: { theological: { content: request.trim() } },
      } as BibleAnswer;
      const flag = await checkAutoFlag(request.trim(), moderationInput);
      if (flag.flagged) {
        status = 'held';
        heldReason = flag.reasons;
      }
    } catch (modErr) {
      console.warn('[api/prayer] Moderation scan failed (fail-open):', modErr);
    }

    const nameToStore = anonymous ? 'Anonymous' : (display_name || 'Anonymous').trim();

    // user_id comes from the verified session — the client body cannot spoof it.
    const row = {
      user_id: user.id,
      display_name: nameToStore,
      request: request.trim(),
      likes_count: 0,
      country_code: country_code ?? null,
      country_name: country_name ?? null,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      category: category || 'community',
      privacy_mode: privacy_mode || 'approximate',
      is_restricted: Boolean(is_restricted),
      is_public: true,
      consent_atlas: Boolean(consent_atlas),
      status,
    };

    let data: any = null;
    try {
      const result = await supabase.from('prayer_requests').insert(row).select().single();
      if (result.error) throw result.error;
      data = result.data;
    } catch (insertErr: any) {
      // Graceful path for databases where the v7/v10 columns are not applied yet.
      console.warn('[api/prayer] Extended column insert failed, falling back to basic columns:', insertErr.message);
      const fallbackResult = await supabase
        .from('prayer_requests')
        .insert({
          user_id: user.id,
          display_name: nameToStore,
          request: request.trim(),
          likes_count: 0,
        })
        .select()
        .single();

      if (fallbackResult.error) throw fallbackResult.error;
      data = { ...fallbackResult.data, ...row, id: fallbackResult.data.id };
    }

    // Send Webhook to Discord (Sigil Bot trigger) — approved rows only.
    if (status === 'approved') {
      const webhookUrl = process.env.PRAYER_DISCORD_WEBHOOK_URL || process.env.SIGIL_PRAYER_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          const payload = {
            embeds: [
              {
                title: '🙏 New Prayer Request',
                description: request.trim(),
                color: 0x4f9cf9,
                fields: [
                  { name: 'Submitted By', value: nameToStore, inline: true },
                  { name: 'Date', value: new Date().toLocaleDateString(), inline: true },
                ],
                footer: { text: 'BibleDesk Community' },
              },
            ],
          };
          await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } catch (webhookErr) {
          console.warn('[api/prayer] Discord Webhook call failed (non-fatal):', webhookErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      prayer: data,
      held: status === 'held',
      heldReason,
      message:
        status === 'held'
          ? 'Your request was received and is awaiting a quick moderation review before it appears on the Community Wall.'
          : 'Your prayer request was shared on the Community Wall.',
    });
  } catch (err: any) {
    console.error('[api/prayer] POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Support updating prayers likes / "I prayed for this" count.
// Anonymous engagement stays allowed here — a like is not a post.
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999
export async function PUT(req: NextRequest) {
  if (!configured()) return unavailable();
  try {
    const { id } = await req.json();
<<<<<<< HEAD
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Valid ID required.' }, { status: 400 });
    const limit = await checkRateLimit('prayer-like:' + (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'));
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const { data, error } = await getServerClient().rpc('increment_public_prayer_likes', { prayer_id: id });
    if (error) return unavailable();
    if (data == null) return NextResponse.json({ error: 'Prayer not found.' }, { status: 404 });
    return NextResponse.json({ success: true, prayer: { id, likes_count: data } });
  } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
=======
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: true });
    }

    const supabase = getServerClient();

    let current: { likes_count: number; is_public?: boolean; status?: string } | null = null;
    try {
      const res = await supabase
        .from('prayer_requests')
        .select('likes_count,is_public,status')
        .eq('id', id)
        .single();
      if (res.error) throw res.error;
      current = res.data;
    } catch (selectErr: any) {
      // Graceful path for databases where the v10 columns are not applied yet.
      console.warn('[api/prayer] Hardened like-select failed, falling back:', selectErr.message);
      const res = await supabase.from('prayer_requests').select('likes_count').eq('id', id).single();
      if (res.error) throw res.error;
      current = res.data;
    }

    // Only count likes against visible (approved public) rows.
    if (!current || current.is_public !== true || (current.status && current.status !== 'approved')) {
      return NextResponse.json({ success: false, error: 'Prayer not found.' }, { status: 404 });
    }

    const count = current.likes_count + 1;

    const { data, error } = await supabase
      .from('prayer_requests')
      .update({ likes_count: count })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, prayer: data });
  } catch (err: any) {
    console.error('[api/prayer] PUT Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999
}
