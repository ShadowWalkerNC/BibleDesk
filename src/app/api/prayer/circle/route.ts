// BibleDesk — Prayer Circle & Pastoral Care API Route
// Handles authenticated sync for contacts, commitments, check-ins, and follow-ups.

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        success: true, 
        contacts: [], 
        commitments: [], 
        checkins: [],
        offline: true,
        message: 'Supabase unconfigured, using local-first storage.' 
      });
    }

    const supabase = getServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({
        success: true,
        contacts: [],
        commitments: [],
        checkins: [],
        guest: true
      });
    }

    // Fetch user's private prayer circle data
    const [contactsRes, commitmentsRes, checkinsRes] = await Promise.all([
      supabase.from('prayer_contacts').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('prayer_commitments').select('*').eq('owner_id', userId).order('next_due_at', { ascending: true }),
      supabase.from('prayer_checkins').select('*').eq('owner_id', userId).order('completed_at', { ascending: false }).limit(50)
    ]);

    return NextResponse.json({
      success: true,
      contacts: contactsRes.data ?? [],
      commitments: commitmentsRes.data ?? [],
      checkins: checkinsRes.data ?? []
    });
  } catch (err: any) {
    console.error('[api/prayer/circle] GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: true,
        acknowledged: true,
        offline: true,
        message: 'Operation recorded locally.'
      });
    }

    const supabase = getServerClient();
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({
        success: true,
        acknowledged: true,
        guest: true
      });
    }

    if (action === 'create_contact') {
      const { display_name, category, email, phone, is_sensitive } = body;
      const { data, error } = await supabase.from('prayer_contacts').insert({
        owner_id: userId,
        display_name: display_name.trim(),
        category: category || 'Friend',
        email: email || null,
        phone: phone || null,
        is_sensitive: !!is_sensitive
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, contact: data });
    }

    if (action === 'create_commitment') {
      const { contact_id, title, private_details, recurrence_rule, timezone } = body;
      const { data, error } = await supabase.from('prayer_commitments').insert({
        owner_id: userId,
        contact_id: contact_id || null,
        title: title.trim(),
        private_details: private_details || null,
        recurrence_rule: recurrence_rule || 'daily',
        timezone: timezone || 'UTC',
        next_due_at: new Date().toISOString(),
        status: 'active'
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, commitment: data });
    }

    if (action === 'checkin') {
      const { commitment_id, outcome, private_note, next_due_at, status } = body;
      const { data: checkin, error: checkinErr } = await supabase.from('prayer_checkins').insert({
        owner_id: userId,
        commitment_id,
        outcome,
        private_note: private_note || null,
        next_due_at: next_due_at || null
      }).select().single();
      if (checkinErr) throw checkinErr;

      // Update commitment next_due_at & status
      await supabase.from('prayer_commitments').update({
        next_due_at: next_due_at || new Date().toISOString(),
        status: status || (outcome === 'answered' ? 'answered' : 'active'),
        updated_at: new Date().toISOString()
      }).eq('id', commitment_id).eq('owner_id', userId);

      return NextResponse.json({ success: true, checkin });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[api/prayer/circle] POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
