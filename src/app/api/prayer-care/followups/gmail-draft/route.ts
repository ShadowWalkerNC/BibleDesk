import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { googleApi } from '@/lib/google-oauth';
import { requireUuid } from '@/lib/prayer-care';
import { requireSupabaseUser } from '@/lib/server-auth';
import { getServerClient } from '@/lib/supabase';

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
    const user = await requireSupabaseUser(request);
    const body = await request.json() as Record<string, unknown>;
    if (body.reviewed !== true) {
      return NextResponse.json({ error: 'Review the recipient and message before creating a draft' }, { status: 400 });
    }
    const commitmentId = requireUuid(requiredText(body.commitmentId, 'commitmentId', 36), 'commitmentId');
    const recipient = requiredText(body.recipient, 'recipient', 320);
    const subject = requiredText(body.subject, 'subject', 200);
    const message = requiredText(body.message, 'message', 10000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('recipient is invalid');

    const client = getServerClient();
    const { data: commitment, error } = await client
      .from('prayer_commitments')
      .select('id, contact_id')
      .eq('id', commitmentId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error) throw new Error(`Unable to load prayer commitment: ${error.message}`);
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
    const now = new Date().toISOString();
    const { data: followup, error: saveError } = await client
      .from('prayer_followups')
      .insert({
        owner_id: user.id,
        contact_id: commitment.contact_id,
        channel: 'email',
        recipient,
        subject,
        message,
        status: 'external_draft',
        google_draft_id: draft.id,
        reviewed_at: now,
        approved_at: now,
      })
      .select('id, status, recipient, subject, google_draft_id, created_at')
      .single();
    if (saveError) throw new Error(`Gmail draft was created but its metadata could not be saved: ${saveError.message}`);
    return NextResponse.json({ draft: followup }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/prayer-care/followups/gmail-draft');
  }
}

