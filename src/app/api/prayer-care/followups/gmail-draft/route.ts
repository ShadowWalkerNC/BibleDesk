import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { apiError } from '@/lib/api-response';
import { googleApi } from '@/lib/google-oauth';
import { requireUuid } from '@/lib/prayer-care';
import { requireUser } from '@/lib/server-auth';
import { getDb } from '@/db';
import { prayerCommitments, prayerFollowups } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

type GoogleDraft = { id: string; message?: { id?: string } };

function requiredText(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  const cleaned = value.trim();
  if (cleaned.length > max) throw new Error(`${name} is too long`);
  return cleaned;
}

function mimeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    if (body.reviewed !== true) {
      return NextResponse.json({ error: 'Review the recipient and message before creating a draft' }, { status: 400 });
    }
    const commitmentId = requireUuid(requiredText(body.commitmentId, 'commitmentId', 36), 'commitmentId');
    const recipient = requiredText(body.recipient, 'recipient', 320);
    const subject = requiredText(body.subject, 'subject', 200);
    const message = requiredText(body.message, 'message', 10000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('recipient is invalid');

    const db = await getDb();
    const commitmentRows = await db
      .select({ id: prayerCommitments.id, contactId: prayerCommitments.contactId })
      .from(prayerCommitments)
      .where(
        and(
          eq(prayerCommitments.id, commitmentId),
          eq(prayerCommitments.userId, user.id)
        )
      )
      .limit(1);
    const commitment = commitmentRows[0] ?? null;
    if (!commitment) return NextResponse.json({ error: 'Prayer commitment not found' }, { status: 404 });

    const rawMime = [
      `To: ${mimeHeader(recipient)}`,
      `Subject: ${mimeHeader(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      message,
    ].join('\r\n');
    const raw = Buffer.from(rawMime).toString('base64url');
    const draft = await googleApi<GoogleDraft>(
      user.id,
      'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
      { method: 'POST', body: JSON.stringify({ message: { raw } }) },
    );
    const now = new Date();
    const followupRows = await db
      .insert(prayerFollowups)
      .values({
        id: uuidv4(),
        userId: user.id,
        contactId: commitment.contactId,
        channel: 'email',
        recipient,
        subject,
        message,
        status: 'external_draft',
        googleDraftId: draft.id,
        reviewedAt: now,
        approvedAt: now,
      })
      .returning();
    const followup = followupRows[0];
    if (!followup) throw new Error('Gmail draft was created but its metadata could not be saved');
    return NextResponse.json({
      draft: {
        id: followup.id,
        status: followup.status,
        recipient: followup.recipient,
        subject: followup.subject,
        google_draft_id: followup.googleDraftId,
        created_at: followup.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/followups/gmail-draft');
  }
}
