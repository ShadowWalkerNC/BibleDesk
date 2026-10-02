import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { apiError } from '@/lib/api-response';
import { calculateInitialDueAt, parseCommitmentInput } from '@/lib/prayer-care';
import { requireUser } from '@/lib/server-auth';
import { getDb } from '@/db';
import {
  prayerCommitments,
  prayerContacts,
  type PrayerCommitment,
  type PrayerContact,
} from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export function toCommitmentJson(
  commitment: PrayerCommitment,
  contact: Pick<PrayerContact, 'id' | 'displayName' | 'email' | 'category' | 'isSensitive'>
) {
  return {
    id: commitment.id,
    contact_id: commitment.contactId,
    title: commitment.title,
    private_details: commitment.privateDetails,
    schedule_kind: commitment.scheduleKind,
    timezone: commitment.timezone,
    local_time: commitment.localTime,
    next_due_at: commitment.nextDueAt ? commitment.nextDueAt.toISOString() : null,
    status: commitment.status,
    google_event_id: commitment.googleEventId,
    google_event_link: commitment.googleEventLink,
    created_at: commitment.createdAt.toISOString(),
    updated_at: commitment.updatedAt ? commitment.updatedAt.toISOString() : null,
    prayer_contacts: {
      id: contact.id,
      display_name: contact.displayName,
      email: contact.email,
      category: contact.category,
      is_sensitive: contact.isSensitive,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const db = await getDb();
    const rows = await db
      .select({ commitment: prayerCommitments, contact: prayerContacts })
      .from(prayerCommitments)
      .innerJoin(prayerContacts, eq(prayerCommitments.contactId, prayerContacts.id))
      .where(
        and(
          eq(prayerCommitments.userId, user.id),
          eq(prayerCommitments.status, 'active')
        )
      )
      .orderBy(prayerCommitments.nextDueAt)
      .limit(100);
    return NextResponse.json(
      { commitments: rows.map((row) => toCommitmentJson(row.commitment, row.contact)) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiError(error, 'GET /api/prayer-care/commitments');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const input = parseCommitmentInput(await request.json());
    const db = await getDb();
    const contactRows = await db
      .select()
      .from(prayerContacts)
      .where(
        and(
          eq(prayerContacts.id, input.contactId),
          eq(prayerContacts.userId, user.id),
          eq(prayerContacts.isArchived, false)
        )
      )
      .limit(1);
    const contact = contactRows[0] ?? null;
    if (!contact) return NextResponse.json({ error: 'Prayer contact not found' }, { status: 404 });

    const inserted = await db
      .insert(prayerCommitments)
      .values({
        id: uuidv4(),
        userId: user.id,
        contactId: input.contactId,
        title: input.title,
        privateDetails: input.privateDetails,
        scheduleKind: input.scheduleKind,
        timezone: input.timezone,
        localTime: input.localTime,
        nextDueAt: calculateInitialDueAt(input.scheduleKind, input.timezone, input.localTime),
        status: 'active',
      })
      .returning();
    const commitment = inserted[0];
    if (!commitment) throw new Error('Unable to create prayer commitment');
    return NextResponse.json({ commitment: toCommitmentJson(commitment, contact) }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/commitments');
  }
}
