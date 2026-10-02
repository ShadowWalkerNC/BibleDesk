// BibleDesk — Moderation Library
// Uses Railway PostgreSQL via Drizzle ORM.
//
// Responsibilities:
//   checkAutoFlag(question, answer)  — scan for sensitive topics, set status
//   saveFlag(flagData)               — write flag + update answer status
//   castVote(voteData)               — record moderator vote
//   tallyVotes(flagId)               — count votes, resolve flag when threshold met
//   promoteToCanonical(flagId)       — embed + store as canonical answer
//   getFlagQueue()                   — return pending flags for /mod/queue
//   inviteModerator(data)            — create moderator row (email/password sign-in)
//
// Vote resolution threshold: 3 votes

import { getDb } from '@/db';
import {
  flaggedTopics,
  flags,
  answers,
  moderationVotes,
  moderators,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { BibleAnswer } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const VOTE_THRESHOLD = 3;
const EMBED_MODEL = 'text-embedding-3-small';

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
  invitedBy:  string;
}

export interface AutoFlagResult {
  flagged:    boolean;
  reasons:    string[];
  categories: string[];
}

// ─── checkAutoFlag ────────────────────────────────────────────────────────────

export async function checkAutoFlag(
  question: string,
  answer: BibleAnswer
): Promise<AutoFlagResult> {
  try {
    const db = await getDb();
    const topics = await db
      .select({ keyword: flaggedTopics.keyword, category: flaggedTopics.category })
      .from(flaggedTopics)
      .where(eq(flaggedTopics.active, true));

    const haystack = [
      question,
      answer.summary,
      answer.dimensions?.theological?.content,
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

export async function saveFlag(data: FlagData): Promise<string | null> {
  try {
    const db = await getDb();
    const id = uuidv4();

    await db.insert(flags).values({
      id,
      answerId:   data.answerId,
      question:   data.question,
      flagType:   data.flagType,
      flagReason: data.flagReason,
      status:     'pending',
    });

    // Flip answer status — best-effort
    await db
      .update(answers)
      .set({ status: 'under_review' })
      .where(eq(answers.id, data.answerId))
      .catch((err) => console.error('[moderation] Failed to set answer under_review:', err));

    return id;
  } catch (err) {
    console.error('[moderation] saveFlag error:', err);
    return null;
  }
}

// ─── castVote ─────────────────────────────────────────────────────────────────

export async function castVote(data: VoteData): Promise<string | null> {
  try {
    const db = await getDb();
    const id = uuidv4();

    await db.insert(moderationVotes).values({
      id,
      flagId:        data.flagId,
      moderatorId:   data.moderatorId,
      vote:          data.vote,
      correction:    data.correction     ?? null,
      scriptureRefs: data.scriptureRefs  ?? null,
    });

    tallyVotes(data.flagId).catch((err) =>
      console.error('[moderation] tallyVotes error after vote:', err)
    );

    return id;
  } catch (err) {
    console.error('[moderation] castVote error:', err);
    return null;
  }
}

// ─── tallyVotes ───────────────────────────────────────────────────────────────

export async function tallyVotes(flagId: string): Promise<void> {
  try {
    const db = await getDb();
    const votes = await db
      .select({ vote: moderationVotes.vote })
      .from(moderationVotes)
      .where(eq(moderationVotes.flagId, flagId));

    if (votes.length < VOTE_THRESHOLD) return;

    const accurate   = votes.filter((v) => v.vote === 'accurate').length;
    const inaccurate = votes.filter((v) => v.vote === 'inaccurate').length;

    if (accurate === inaccurate) return;

    if (accurate > inaccurate) {
      await db.update(flags).set({ status: 'approved' }).where(eq(flags.id, flagId));

      const flagRow = await db
        .select({ answerId: flags.answerId })
        .from(flags)
        .where(eq(flags.id, flagId))
        .limit(1);

      if (flagRow[0]?.answerId) {
        await db
          .update(answers)
          .set({ status: 'approved' })
          .where(eq(answers.id, flagRow[0].answerId));
      }

      promoteToCanonical(flagId).catch((err) =>
        console.error('[moderation] promoteToCanonical error:', err)
      );
    } else {
      await db.update(flags).set({ status: 'rejected' }).where(eq(flags.id, flagId));
    }
  } catch (err) {
    console.error('[moderation] tallyVotes error:', err);
  }
}

// ─── promoteToCanonical ───────────────────────────────────────────────────────

export async function promoteToCanonical(
  flagId: string,
  overrideApproverId?: string
): Promise<boolean> {
  try {
    const db = await getDb();

    const flagRows = await db
      .select({ answerId: flags.answerId, question: flags.question })
      .from(flags)
      .where(eq(flags.id, flagId))
      .limit(1);

    if (!flagRows[0]) {
      console.error('[moderation] promoteToCanonical: flag not found');
      return false;
    }

    const { answerId, question } = flagRows[0];

    const answerRows = await db
      .select({ answerJson: answers.answerJson })
      .from(answers)
      .where(eq(answers.id, answerId))
      .limit(1);

    if (!answerRows[0]) {
      console.error('[moderation] promoteToCanonical: answer not found');
      return false;
    }

    let approverId = overrideApproverId ?? null;
    if (!approverId) {
      const voteRows = await db
        .select({ moderatorId: moderationVotes.moderatorId })
        .from(moderationVotes)
        .where(and(eq(moderationVotes.flagId, flagId), eq(moderationVotes.vote, 'accurate')))
        .orderBy(moderationVotes.createdAt)
        .limit(1);
      approverId = voteRows[0]?.moderatorId ?? null;
    }

    const embedding = await generateEmbedding(question);
    if (!embedding) {
      console.error('[moderation] promoteToCanonical: embedding generation failed');
      return false;
    }

    const questionHash = sha256(normalizeQuestion(question));
    const vectorLiteral = `[${embedding.join(',')}]`;

    // Use raw SQL for pgvector upsert
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`
      INSERT INTO canonical_answers (id, question_hash, question, answer_json, embedding, approved_by, vote_count, updated_at)
      VALUES (
        gen_random_uuid()::text,
        ${questionHash},
        ${question},
        ${JSON.stringify(answerRows[0].answerJson)}::jsonb,
        ${vectorLiteral}::vector,
        ${approverId},
        ${VOTE_THRESHOLD},
        NOW()
      )
      ON CONFLICT (question_hash) DO UPDATE SET
        question    = EXCLUDED.question,
        answer_json = EXCLUDED.answer_json,
        embedding   = EXCLUDED.embedding,
        approved_by = EXCLUDED.approved_by,
        vote_count  = canonical_answers.vote_count + 1,
        updated_at  = EXCLUDED.updated_at
    `);

    console.log(`[moderation] Promoted to canonical: "${question.slice(0, 60)}..."`);
    return true;
  } catch (err) {
    console.error('[moderation] promoteToCanonical error:', err);
    return false;
  }
}

// ─── getFlagQueue ─────────────────────────────────────────────────────────────

export async function getFlagQueue(): Promise<FlagQueueItem[]> {
  try {
    const db = await getDb();

    // Load flags with status=pending
    const flagRows = await db
      .select()
      .from(flags)
      .where(eq(flags.status, 'pending'))
      .orderBy(flags.createdAt);

    if (flagRows.length === 0) return [];

    const flagIds = flagRows.map((f) => f.id);
    const answerIds = flagRows.map((f) => f.answerId);

    // Load related answers and votes in parallel
    const { inArray } = await import('drizzle-orm');
    const [answerRows, voteRows, modRows] = await Promise.all([
      db.select({ id: answers.id, answerJson: answers.answerJson })
        .from(answers)
        .where(inArray(answers.id, answerIds)),
      db.select()
        .from(moderationVotes)
        .where(inArray(moderationVotes.flagId, flagIds)),
      db.select({ id: moderators.id, name: moderators.name })
        .from(moderators),
    ]);

    const answerMap = new Map(answerRows.map((a) => [a.id, a.answerJson]));
    const modMap    = new Map(modRows.map((m) => [m.id, m.name]));

    return flagRows.map((f) => {
      const relatedVotes = voteRows.filter((v) => v.flagId === f.id);
      return {
        id:         f.id,
        answerId:   f.answerId,
        question:   f.question,
        flagType:   f.flagType as 'auto' | 'user',
        flagReason: f.flagReason,
        status:     (f.status ?? 'pending') as 'pending' | 'approved' | 'rejected',
        createdAt:  f.createdAt.toISOString(),
        answerJson: (answerMap.get(f.answerId) as BibleAnswer) ?? null,
        voteCount:  relatedVotes.length,
        votes: relatedVotes.map((v) => ({
          moderatorId:   v.moderatorId,
          moderatorName: modMap.get(v.moderatorId) ?? 'Unknown',
          vote:          v.vote as 'accurate' | 'inaccurate',
          correction:    v.correction ?? null,
          scriptureRefs: (v.scriptureRefs as string[] | null) ?? null,
        })),
      };
    });
  } catch (err) {
    console.error('[moderation] getFlagQueue error:', err);
    return [];
  }
}

// ─── inviteModerator ─────────────────────────────────────────────────────────

export async function inviteModerator(data: InviteData): Promise<boolean> {
  try {
    const db = await getDb();

    const adminRows = await db
      .select({ id: moderators.id, role: moderators.role, active: moderators.active })
      .from(moderators)
      .where(eq(moderators.id, data.invitedBy))
      .limit(1);

    const admin = adminRows[0];
    if (!admin || !admin.active || admin.role !== 'admin') {
      console.error('[moderation] inviteModerator: inviter is not an active admin');
      return false;
    }

    await db.insert(moderators).values({
      id:         uuidv4(),
      email:      data.email,
      name:       data.name,
      role:       data.role ?? 'moderator',
      invitedBy:  data.invitedBy,
      active:     false,
    });

    // Note: there is no email invite flow. Moderators sign in with
    // email/password and must be activated manually or via a custom email flow.
    console.log(`[moderation] Moderator row created for ${data.email}. Manual activation required.`);
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
