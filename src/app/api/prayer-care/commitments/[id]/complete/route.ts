import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { calculateNextDueAt, requireUuid, type ScheduleKind } from '@/lib/prayer-care';
import { requireSupabaseUser } from '@/lib/server-auth';
import { getServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSupabaseUser(request);
    const { id: rawId } = await context.params;
    const id = requireUuid(rawId);
    const body = await request.json().catch(() => ({})) as { privateNote?: unknown };
    if (body.privateNote != null && typeof body.privateNote !== 'string') {
      throw new Error('privateNote must be text');
    }
    const privateNote = typeof body.privateNote === 'string' ? body.privateNote.trim() : null;
    if (privateNote && privateNote.length > 5000) throw new Error('privateNote is too long');

    const client = getServerClient();
    const { data: commitment, error: findError } = await client
      .from('prayer_commitments')
      .select('id, schedule_kind, timezone, local_time, next_due_at, status')
      .eq('id', id)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (findError) throw new Error(`Unable to load prayer commitment: ${findError.message}`);
    if (!commitment) return NextResponse.json({ error: 'Prayer commitment not found' }, { status: 404 });
    if (commitment.status !== 'active') {
      return NextResponse.json({ error: 'Only active commitments can be completed' }, { status: 409 });
    }

    const nextDueAt = calculateNextDueAt(
      commitment.schedule_kind as ScheduleKind,
      commitment.timezone,
      String(commitment.local_time).slice(0, 5),
      commitment.next_due_at,
    );
    const now = new Date().toISOString();
    const { data: checkin, error: checkinError } = await client
      .from('prayer_checkins')
      .insert({
        owner_id: user.id,
        commitment_id: id,
        outcome: 'prayed',
        private_note: privateNote || null,
        completed_at: now,
        next_due_at: nextDueAt?.toISOString() ?? null,
      })
      .select('id, outcome, private_note, completed_at, next_due_at')
      .single();
    if (checkinError) throw new Error(`Unable to record prayer check-in: ${checkinError.message}`);

    const { data: updated, error: updateError } = await client
      .from('prayer_commitments')
      .update({
        next_due_at: nextDueAt?.toISOString() ?? commitment.next_due_at,
        status: nextDueAt ? 'active' : 'archived',
        updated_at: now,
      })
      .eq('id', id)
      .eq('owner_id', user.id)
      .select('id, next_due_at, status')
      .single();
    if (updateError) throw new Error(`Prayer was recorded but the schedule could not advance: ${updateError.message}`);
    return NextResponse.json({ checkin, commitment: updated });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/commitments/[id]/complete');
  }
}

