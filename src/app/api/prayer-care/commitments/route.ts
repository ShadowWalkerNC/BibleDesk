import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { calculateInitialDueAt, parseCommitmentInput } from '@/lib/prayer-care';
import { requireSupabaseUser } from '@/lib/server-auth';
import { getServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const COMMITMENT_SELECT = `
  id, contact_id, title, private_details, schedule_kind, timezone, local_time,
  next_due_at, status, google_event_id, google_event_link, created_at, updated_at,
  prayer_contacts!inner(id, display_name, email, category, is_sensitive)
`;

export async function GET(request: NextRequest) {
  try {
    const user = await requireSupabaseUser(request);
    const { data, error } = await getServerClient()
      .from('prayer_commitments')
      .select(COMMITMENT_SELECT)
      .eq('owner_id', user.id)
      .eq('status', 'active')
      .order('next_due_at', { ascending: true })
      .limit(100);
    if (error) throw new Error(`Unable to list prayer commitments: ${error.message}`);
    return NextResponse.json({ commitments: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error, 'GET /api/prayer-care/commitments');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSupabaseUser(request);
    const input = parseCommitmentInput(await request.json());
    const client = getServerClient();
    const { data: contact, error: contactError } = await client
      .from('prayer_contacts')
      .select('id')
      .eq('id', input.contactId)
      .eq('owner_id', user.id)
      .eq('is_archived', false)
      .maybeSingle();
    if (contactError) throw new Error(`Unable to verify prayer contact: ${contactError.message}`);
    if (!contact) return NextResponse.json({ error: 'Prayer contact not found' }, { status: 404 });

    const { data, error } = await client
      .from('prayer_commitments')
      .insert({
        owner_id: user.id,
        contact_id: input.contactId,
        title: input.title,
        private_details: input.privateDetails,
        schedule_kind: input.scheduleKind,
        timezone: input.timezone,
        local_time: input.localTime,
        next_due_at: calculateInitialDueAt(input.scheduleKind, input.timezone, input.localTime).toISOString(),
      })
      .select(COMMITMENT_SELECT)
      .single();
    if (error) throw new Error(`Unable to create prayer commitment: ${error.message}`);
    return NextResponse.json({ commitment: data }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/commitments');
  }
}

