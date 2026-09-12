import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
}
