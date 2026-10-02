import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { googleApi } from '@/lib/google-oauth';
import { requireUuid, type ScheduleKind } from '@/lib/prayer-care';
import { requireUser } from '@/lib/server-auth';
import { getDb } from '@/db';
import { prayerCommitments, prayerContacts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

type GoogleEvent = { id: string; htmlLink?: string };
type GoogleEventList = { items?: GoogleEvent[] };

function recurrence(kind: ScheduleKind): string[] | undefined {
  const frequency = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', one_time: null }[kind];
  return frequency ? [`RRULE:FREQ=${frequency}`] : undefined;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id: rawId } = await context.params;
    const id = requireUuid(rawId);
    const db = await getDb();
    const rows = await db
      .select({ commitment: prayerCommitments, contact: prayerContacts })
      .from(prayerCommitments)
      .innerJoin(prayerContacts, eq(prayerCommitments.contactId, prayerContacts.id))
      .where(
        and(
          eq(prayerCommitments.id, id),
          eq(prayerCommitments.userId, user.id)
        )
      )
      .limit(1);
    const row = rows[0] ?? null;
    if (!row) return NextResponse.json({ error: 'Prayer commitment not found' }, { status: 404 });
    const commitment = row.commitment;
    if (commitment.googleEventId) {
      return NextResponse.json({
        eventId: commitment.googleEventId,
        eventLink: commitment.googleEventLink,
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
      await db
        .update(prayerCommitments)
        .set({
          googleEventId: existingEvent.id,
          googleEventLink: existingEvent.htmlLink ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(prayerCommitments.id, id),
            eq(prayerCommitments.userId, user.id)
          )
        );
      return NextResponse.json({
        eventId: existingEvent.id,
        eventLink: existingEvent.htmlLink ?? null,
        alreadyExported: true,
      });
    }

    const start = commitment.nextDueAt ?? new Date();
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    const isSensitive = row.contact.isSensitive === true;
    const event = await googleApi<GoogleEvent>(
      user.id,
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        body: JSON.stringify({
          summary: isSensitive ? 'Prayer time' : `Prayer: ${commitment.title}`,
          description: isSensitive
            ? 'Private prayer commitment from BibleDesk.'
            : commitment.privateDetails || 'Time set aside for prayer with BibleDesk.',
          start: { dateTime: start.toISOString(), timeZone: commitment.timezone },
          end: { dateTime: end.toISOString(), timeZone: commitment.timezone },
          recurrence: recurrence(commitment.scheduleKind as ScheduleKind),
          extendedProperties: { private: { bibledeskCommitmentId: commitment.id } },
        }),
      },
    );
    await db
      .update(prayerCommitments)
      .set({
        googleEventId: event.id,
        googleEventLink: event.htmlLink ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(prayerCommitments.id, id),
          eq(prayerCommitments.userId, user.id)
        )
      );
    return NextResponse.json({ eventId: event.id, eventLink: event.htmlLink ?? null, alreadyExported: false });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/commitments/[id]/calendar');
  }
}
