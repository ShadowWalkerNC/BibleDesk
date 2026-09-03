import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { googleApi } from '@/lib/google-oauth';
import { requireUuid, type ScheduleKind } from '@/lib/prayer-care';
import { requireSupabaseUser } from '@/lib/server-auth';
import { getServerClient } from '@/lib/supabase';

type GoogleEvent = { id: string; htmlLink?: string };
type GoogleEventList = { items?: GoogleEvent[] };

function recurrence(kind: ScheduleKind): string[] | undefined {
  const frequency = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', one_time: null }[kind];
  return frequency ? [`RRULE:FREQ=${frequency}`] : undefined;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSupabaseUser(request);
    const { id: rawId } = await context.params;
    const id = requireUuid(rawId);
    const client = getServerClient();
    const { data: commitment, error } = await client
      .from('prayer_commitments')
      .select('id, title, private_details, schedule_kind, timezone, next_due_at, google_event_id, google_event_link, prayer_contacts!inner(is_sensitive)')
      .eq('id', id)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw new Error(`Unable to load prayer commitment: ${error.message}`);
    if (!commitment) return NextResponse.json({ error: 'Prayer commitment not found' }, { status: 404 });
    if (commitment.google_event_id) {
      return NextResponse.json({
        eventId: commitment.google_event_id,
        eventLink: commitment.google_event_link,
        alreadyExported: true,
      });
    }

    // Recover idempotently if Google succeeded previously but the local write
    // did not. The private extended property is not visible to attendees.
    const existing = await googleApi<GoogleEventList>(
      user.id,
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=${encodeURIComponent(`bibledeskCommitmentId=${commitment.id}`)}&maxResults=1&singleEvents=false`,
    );
    const existingEvent = existing.items?.[0];
    if (existingEvent) {
      const { error: recoveryError } = await client.from('prayer_commitments').update({
        google_event_id: existingEvent.id,
        google_event_link: existingEvent.htmlLink ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', id).eq('owner_id', user.id);
      if (recoveryError) throw new Error(`Unable to save the existing Google event: ${recoveryError.message}`);
      return NextResponse.json({
        eventId: existingEvent.id,
        eventLink: existingEvent.htmlLink ?? null,
        alreadyExported: true,
      });
    }

    const start = new Date(commitment.next_due_at);
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    const contact = Array.isArray(commitment.prayer_contacts)
      ? commitment.prayer_contacts[0]
      : commitment.prayer_contacts;
    const isSensitive = contact?.is_sensitive === true;
    const event = await googleApi<GoogleEvent>(
      user.id,
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        body: JSON.stringify({
          summary: isSensitive ? 'Prayer time' : `Prayer: ${commitment.title}`,
          description: isSensitive
            ? 'Private prayer commitment from BibleDesk.'
            : commitment.private_details || 'Time set aside for prayer with BibleDesk.',
          start: { dateTime: start.toISOString(), timeZone: commitment.timezone },
          end: { dateTime: end.toISOString(), timeZone: commitment.timezone },
          recurrence: recurrence(commitment.schedule_kind as ScheduleKind),
          extendedProperties: { private: { bibledeskCommitmentId: commitment.id } },
        }),
      },
    );
    const { error: saveError } = await client.from('prayer_commitments').update({
      google_event_id: event.id,
      google_event_link: event.htmlLink ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('owner_id', user.id);
    if (saveError) throw new Error(`Calendar event was created but its id could not be saved: ${saveError.message}`);
    return NextResponse.json({ eventId: event.id, eventLink: event.htmlLink ?? null, alreadyExported: false });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/commitments/[id]/calendar');
  }
}
