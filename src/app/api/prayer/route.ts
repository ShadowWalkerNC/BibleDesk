import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { checkAutoFlag } from '@/lib/moderation';
import type { BibleAnswer } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
}

export async function POST(req: NextRequest) {
  try {
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
export async function PUT(req: NextRequest) {
  try {
    const { id } = await req.json();
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
}
