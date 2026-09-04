import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { prayerId, targetLevel, urgencyLevel, isAnonymous, churchId, updateNote } = body;

    if (!prayerId || !targetLevel) {
      return NextResponse.json({ error: 'Missing prayerId or targetLevel' }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = getServerClient();
      const { data, error } = await supabase
        .from('prayer_requests')
        .update({
          escalation_level: targetLevel,
          urgency_level: urgencyLevel || 'normal',
          is_anonymous: !!isAnonymous,
          church_id: churchId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prayerId)
        .select()
        .single();

      if (error) {
        console.warn('[Prayer Escalation] Supabase update warning:', error.message);
      } else if (data) {
        return NextResponse.json({
          success: true,
          prayer: data,
          escalated_at: new Date().toISOString(),
        });
      }
    }

    // Fallback response for local-first / mock mode
    return NextResponse.json({
      success: true,
      prayerId,
      targetLevel,
      urgencyLevel: urgencyLevel || 'normal',
      isAnonymous: !!isAnonymous,
      churchId: churchId || null,
      updateNote: updateNote || null,
      escalated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
