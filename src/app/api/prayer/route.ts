import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
}

export async function POST(req: NextRequest) {
  if (!configured()) return unavailable();
  try {
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

export async function PUT(req: NextRequest) {
  if (!configured()) return unavailable();
  try {
    const { id } = await req.json();
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Valid ID required.' }, { status: 400 });
    const limit = await checkRateLimit('prayer-like:' + (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'));
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    const { data, error } = await getServerClient().rpc('increment_public_prayer_likes', { prayer_id: id });
    if (error) return unavailable();
    if (data == null) return NextResponse.json({ error: 'Prayer not found.' }, { status: 404 });
    return NextResponse.json({ success: true, prayer: { id, likes_count: data } });
  } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
}
