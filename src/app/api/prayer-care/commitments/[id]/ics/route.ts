import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { createCommitmentIcs, requireUuid } from '@/lib/prayer-care';
import { requireSupabaseUser } from '@/lib/server-auth';
import { getServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSupabaseUser(request);
    const { id: rawId } = await context.params;
    const id = requireUuid(rawId);
    const { data, error } = await getServerClient()
      .from('prayer_commitments')
      .select('id, title, private_details, next_due_at, schedule_kind, prayer_contacts!inner(is_sensitive)')
      .eq('id', id)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw new Error(`Unable to load prayer commitment: ${error.message}`);
    if (!data) return NextResponse.json({ error: 'Prayer commitment not found' }, { status: 404 });
    const contact = Array.isArray(data.prayer_contacts)
      ? data.prayer_contacts[0]
      : data.prayer_contacts;
    return new NextResponse(createCommitmentIcs({
      ...data,
      is_sensitive: contact?.is_sensitive === true,
    }), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="bibledesk-prayer-${id}.ics"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return apiError(error, 'GET /api/prayer-care/commitments/[id]/ics');
  }
}
