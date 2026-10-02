import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { createCommitmentIcs, requireUuid, type ScheduleKind } from '@/lib/prayer-care';
import { requireUser } from '@/lib/server-auth';
import { getDb } from '@/db';
import { prayerCommitments, prayerContacts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    return new NextResponse(createCommitmentIcs({
      id: row.commitment.id,
      title: row.commitment.title,
      private_details: row.commitment.privateDetails,
      next_due_at: (row.commitment.nextDueAt ?? new Date()).toISOString(),
      schedule_kind: row.commitment.scheduleKind as ScheduleKind,
      is_sensitive: row.contact.isSensitive === true,
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
