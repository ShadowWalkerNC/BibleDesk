import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { apiError } from '@/lib/api-response';
import { calculateNextDueAt, requireUuid, type ScheduleKind } from '@/lib/prayer-care';
import { requireUser } from '@/lib/server-auth';
import { getDb } from '@/db';
import { prayerCheckins, prayerCommitments } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id: rawId } = await context.params;
    const id = requireUuid(rawId);
    const body = await request.json().catch(() => ({})) as { privateNote?: unknown };
    if (body.privateNote != null && typeof body.privateNote !== 'string') {
      throw new Error('privateNote must be text');
    }
    const privateNote = typeof body.privateNote === 'string' ? body.privateNote.trim() : null;
    if (privateNote && privateNote.length > 5000) throw new Error('privateNote is too long');

    const db = await getDb();
    const commitmentRows = await db
      .select()
      .from(prayerCommitments)
      .where(
        and(
          eq(prayerCommitments.id, id),
          eq(prayerCommitments.userId, user.id)
        )
      )
      .limit(1);
    const commitment = commitmentRows[0] ?? null;
    if (!commitment) return NextResponse.json({ error: 'Prayer commitment not found' }, { status: 404 });
    if (commitment.status !== 'active') {
      return NextResponse.json({ error: 'Only active commitments can be completed' }, { status: 409 });
    }

    const nextDueAt = calculateNextDueAt(
      commitment.scheduleKind as ScheduleKind,
      commitment.timezone,
      String(commitment.localTime).slice(0, 5),
      (commitment.nextDueAt ?? new Date()).toISOString(),
    );
    const now = new Date();
    const checkinRows = await db
      .insert(prayerCheckins)
      .values({
        id: uuidv4(),
        userId: user.id,
        commitmentId: id,
        outcome: 'prayed',
        privateNote: privateNote || null,
        completedAt: now,
        nextDueAt: nextDueAt ?? null,
      })
      .returning();
    const checkin = checkinRows[0];
    if (!checkin) throw new Error('Unable to record prayer check-in');

    const updatedRows = await db
      .update(prayerCommitments)
      .set({
        nextDueAt: nextDueAt ?? commitment.nextDueAt,
        status: nextDueAt ? 'active' : 'archived',
        updatedAt: now,
      })
      .where(
        and(
          eq(prayerCommitments.id, id),
          eq(prayerCommitments.userId, user.id)
        )
      )
      .returning();
    const updated = updatedRows[0];
    if (!updated) throw new Error('Prayer was recorded but the schedule could not advance');
    return NextResponse.json({
      checkin: {
        id: checkin.id,
        outcome: checkin.outcome,
        private_note: checkin.privateNote,
        completed_at: checkin.completedAt.toISOString(),
        next_due_at: checkin.nextDueAt ? checkin.nextDueAt.toISOString() : null,
      },
      commitment: {
        id: updated.id,
        next_due_at: updated.nextDueAt ? updated.nextDueAt.toISOString() : null,
        status: updated.status,
      },
    });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/commitments/[id]/complete');
  }
}
