// BibleDesk — Moderation Library
// Server-only: uses SUPABASE_SERVICE_ROLE_KEY
//
// Responsibilities:
//   checkAutoFlag(question, answer)  — scan for sensitive topics, set status
//   saveFlag(flagData)               — write flag + update answer status
//   castVote(voteData)               — record moderator vote
//   tallyVotes(flagId)               — count votes, resolve flag when threshold met
//   promoteToCanonical(flagId)       — embed + store as canonical answer
//   getFlagQueue()                   — return pending flags for /mod/queue
//   inviteModerator(data)            — create moderator row + Supabase Auth invite
//
// Vote resolution threshold: 3 votes
//   Majority 'accurate'   → flag APPROVED, answer status stays 'approved'
//   Majority 'inaccurate' → flag REJECTED, answer status set to 'under_review'
//                           (correction stored for display)
//   Tie                   → no resolution until a 4th vote breaks it

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { BibleAnswer } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const VOTE_THRESHOLD = 3;       // votes required to resolve a flag
const EMBED_MODEL   = 'text-embedding-3-small'; // same model as rag.ts

// ─── Supabase client (service role — server only) ────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FlagData {
  answerId:   string;
  question:   string;
  flagType:   'auto' | 'user';
  flagReason: string;
}

export interface VoteData {
  flagId:        string;
  moderatorId:   string;
  vote:          'accurate' | 'inaccurate';
  correction?:   string;
  scriptureRefs?: string[];
}

export interface FlagQueueItem {
  id:           string;
  answerId:     string;
  question:     string;
  flagType:     'auto' | 'user';
  flagReason:   string | null;
  status:       'pending' | 'approved' | 'rejected';
  createdAt:    string;
  answerJson:   BibleAnswer | null;
  voteCount:    number;
  votes:        Array<{
    moderatorId:   string;
    moderatorName: string;
    vote:          'accurate' | 'inaccurate';
    correction:    string | null;
    scriptureRefs: string[] | null;
  }>;
}

export interface InviteData {
  email:      string;
  name:       string;
  role?:      'moderator' | 'admin';
  invitedBy:  string;   // moderator.id of the admin sending the invite
}

export interface AutoFlagResult {
  flagged:    boolean;
  reasons:    string[];     // matched keywords
  categories: string[];     // unique categories matched
}

// ─── checkAutoFlag ────────────────────────────────────────────────────────────
// Fetch active flagged_topics from DB and check question + answer summary.
// Returns flagged=false on any DB error (fail open — don't block answers).

export async function checkAutoFlag(
  question: string,
  answer: BibleAnswer
): Promise<AutoFlagResult> {
  try {
    const supabase = getServiceClient();
    const { data: topics, error } = await supabase
      .from('flagged_topics')
      .select('keyword, category')
      .eq('active', true);

    if (error || !topics) {
      console.error('[moderation] Failed to fetch flagged_topics:', error);
      return { flagged: false, reasons: [], categories: [] };
    }

    const haystack = [
      question,
      answer.summary,
      answer.dimensions.theological.content,
    ]
      .join(' ')
      .toLowerCase();

    const matched = topics.filter((t) => haystack.includes(t.keyword.toLowerCase()));

    return {
      flagged:    matched.length > 0,
      reasons:    matched.map((t) => t.keyword),
      categories: [...new Set(matched.map((t) => t.category))],
    };
  } catch (err) {
    console.error('[moderation] checkAutoFlag error:', err);
    return { flagged: false, reasons: [], categories: [] };
  }
}

// ─── saveFlag ─────────────────────────────────────────────────────────────────
// Write the flag row and flip answers.status to 'under_review'.
// Both writes happen in the same try block; answers.status update is best-effort.

export async function saveFlag(data: FlagData): Promise<string | null> {
  try {
    const supabase = getServiceClient();

    const { data: flag, error: flagError } = await supabase
      .from('flags')
      .insert({
        answer_id:   data.answerId,
        question:    data.question,
        flag_type:   data.flagType,
        flag_reason: data.flagReason,
        status:      'pending',
      })
      .select('id')
      .single();

    if (flagError || !flag) {
      console.error('[moderation] saveFlag insert error:', flagError);
      return null;
    }

    // Flip answer status — best-effort, don't fail if it errors
    await supabase
      .from('answers')
      .update({ status: 'under_review' })
      .eq('id', data.answerId)
      .then(({ error }) => {
        if (error) console.error('[moderation] Failed to set answer under_review:', error);
      });

    return flag.id;
  } catch (err) {
    console.error('[moderation] saveFlag error:', err);
    return null;
  }
}

// ─── castVote ─────────────────────────────────────────────────────────────────
// Insert a moderation vote. Returns the new vote id, or null on error.
// After inserting, triggers tallyVotes to resolve if threshold is reached.

export async function castVote(data: VoteData): Promise<string | null> {
  try {
    const supabase = getServiceClient();

    const { data: vote, error } = await supabase
      .from('moderation_votes')
      .insert({
        flag_id:        data.flagId,
        moderator_id:   data.moderatorId,
        vote:           data.vote,
        correction:     data.correction     ?? null,
        scripture_refs: data.scriptureRefs  ?? null,
      })
      .select('id')
      .single();

    if (error || !vote) {
      console.error('[moderation] castVote insert error:', error);
      return null;
    }

    // Non-blocking tally check
    tallyVotes(data.flagId).catch((err) =>
      console.error('[moderation] tallyVotes error after vote:', err)
    );

    return vote.id;
  } catch (err) {
    console.error('[moderation] castVote error:', err);
    return null;
  }
}

// ─── tallyVotes ───────────────────────────────────────────────────────────────
// Count all votes for a flag. If >= VOTE_THRESHOLD and majority is clear,
// resolve the flag and take the appropriate action.

export async function tallyVotes(flagId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: votes, error } = await supabase
    .from('moderation_votes')
    .select('vote, flag_id')
    .eq('flag_id', flagId);

  if (error || !votes || votes.length < VOTE_THRESHOLD) return;

  const accurate   = votes.filter((v) => v.vote === 'accurate').length;
  const inaccurate = votes.filter((v) => v.vote === 'inaccurate').length;

  if (accurate === inaccurate) return; // tie — wait for more votes

  if (accurate > inaccurate) {
    // Majority says answer is accurate → approve + promote to canonical
    await supabase
      .from('flags')
      .update({ status: 'approved' })
      .eq('id', flagId);

    await supabase
      .from('answers')
      .update({ status: 'approved' })
      .eq('id', await getAnswerIdForFlag(flagId, supabase));

    // Promote to canonical (fire-and-forget — embedding generation is slow)
    promoteToCanonical(flagId).catch((err) =>
      console.error('[moderation] promoteToCanonical error:', err)
    );
  } else {
    // Majority says answer is inaccurate → reject, keep under_review
    await supabase
      .from('flags')
      .update({ status: 'rejected' })
      .eq('id', flagId);
    // answer.status stays 'under_review' — correction shown in UI
  }
}

// ─── promoteToCanonical ───────────────────────────────────────────────────────
// Generate an embedding for the question and store the approved answer
// in canonical_answers for future RAG retrieval.
//
// Called after majority-accurate vote OR directly from /api/mod/approve.

export async function promoteToCanonical(
  flagId: string,
  overrideApproverId?: string
): Promise<boolean> {
  try {
    const supabase = getServiceClient();

    // Load flag + answer
    const { data: flag, error: flagErr } = await supabase
      .from('flags')
      .select('answer_id, question')
      .eq('id', flagId)
      .single();

    if (flagErr || !flag) {
      console.error('[moderation] promoteToCanonical: flag not found', flagErr);
      return false;
    }

    const { data: answerRow, error: answerErr } = await supabase
      .from('answers')
      .select('answer_json')
      .eq('id', flag.answer_id)
      .single();

    if (answerErr || !answerRow) {
      console.error('[moderation] promoteToCanonical: answer not found', answerErr);
      return false;
    }

    // Find approving moderator (most recent 'accurate' vote, or override)
    let approverId = overrideApproverId ?? null;
    if (!approverId) {
      const { data: accurateVote } = await supabase
        .from('moderation_votes')
        .select('moderator_id')
        .eq('flag_id', flagId)
        .eq('vote', 'accurate')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      approverId = accurateVote?.moderator_id ?? null;
    }

    // Generate embedding via OpenAI (same model as rag.ts)
    const embedding = await generateEmbedding(flag.question);
    if (!embedding) {
      console.error('[moderation] promoteToCanonical: embedding generation failed');
      return false;
    }

    const questionHash = sha256(normalizeQuestion(flag.question));

    const { error: upsertErr } = await supabase
      .from('canonical_answers')
      .upsert(
        {
          question_hash: questionHash,
          question:      flag.question,
          answer_json:   answerRow.answer_json,
          embedding,
          approved_by:   approverId,
          vote_count:    VOTE_THRESHOLD,
        },
        { onConflict: 'question_hash' }
      );

    if (upsertErr) {
      console.error('[moderation] promoteToCanonical upsert error:', upsertErr);
      return false;
    }

    console.log(
      `[moderation] Promoted to canonical: "${flag.question.slice(0, 60)}..."`
    );
    return true;
  } catch (err) {
    console.error('[moderation] promoteToCanonical error:', err);
    return false;
  }
}

// ─── getFlagQueue ─────────────────────────────────────────────────────────────
// Returns all pending flags with their answer + vote summaries.
// Used by GET /api/mod/queue.

export async function getFlagQueue(): Promise<FlagQueueItem[]> {
  try {
    const supabase = getServiceClient();

    const { data: flags, error } = await supabase
      .from('flags')
      .select(`
        id,
        answer_id,
        question,
        flag_type,
        flag_reason,
        status,
        created_at,
        answers ( answer_json ),
        moderation_votes (
          vote,
          correction,
          scripture_refs,
          moderator_id,
          moderators ( name )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !flags) {
      console.error('[moderation] getFlagQueue error:', error);
      return [];
    }

    return flags.map((f: any) => ({
      id:         f.id,
      answerId:   f.answer_id,
      question:   f.question,
      flagType:   f.flag_type,
      flagReason: f.flag_reason,
      status:     f.status,
      createdAt:  f.created_at,
      answerJson: f.answers?.answer_json ?? null,
      voteCount:  f.moderation_votes?.length ?? 0,
      votes: (f.moderation_votes ?? []).map((v: any) => ({
        moderatorId:   v.moderator_id,
        moderatorName: v.moderators?.name ?? 'Unknown',
        vote:          v.vote,
        correction:    v.correction ?? null,
        scriptureRefs: v.scripture_refs ?? null,
      })),
    }));
  } catch (err) {
    console.error('[moderation] getFlagQueue error:', err);
    return [];
  }
}

// ─── inviteModerator ─────────────────────────────────────────────────────────
// Create a moderators row and send a Supabase Auth magic-link invite email.

export async function inviteModerator(data: InviteData): Promise<boolean> {
  try {
    const supabase = getServiceClient();

    // Verify the inviting moderator is an active admin
    const { data: admin, error: adminErr } = await supabase
      .from('moderators')
      .select('id, role, active')
      .eq('id', data.invitedBy)
      .single();

    if (adminErr || !admin || !admin.active || admin.role !== 'admin') {
      console.error('[moderation] inviteModerator: inviter is not an active admin');
      return false;
    }

    // Create moderator row
    const { error: insertErr } = await supabase
      .from('moderators')
      .insert({
        email:      data.email,
        name:       data.name,
        role:       data.role ?? 'moderator',
        invited_by: data.invitedBy,
        active:     false,  // becomes true when invite is accepted
      });

    if (insertErr) {
      console.error('[moderation] inviteModerator insert error:', insertErr);
      return false;
    }

    // Send Supabase Auth invite email (magic link)
    const { error: authErr } = await supabase.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/mod`,
        data: { name: data.name, role: data.role ?? 'moderator' },
      }
    );

    if (authErr) {
      console.error('[moderation] inviteModerator auth invite error:', authErr);
      // Row created but email failed — moderator can still log in manually
      // Don't return false here; partial success is acceptable
    }

    return true;
  } catch (err) {
    console.error('[moderation] inviteModerator error:', err);
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.embeddings.create({
      model: EMBED_MODEL,
      input: text,
    });
    return res.data[0].embedding;
  } catch (err) {
    console.error('[moderation] generateEmbedding error:', err);
    return null;
  }
}

async function getAnswerIdForFlag(
  flagId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<string | null> {
  const { data } = await supabase
    .from('flags')
    .select('answer_id')
    .eq('id', flagId)
    .single();
  return data?.answer_id ?? null;
}
