// BibleDesk — Answer persistence (Railway PostgreSQL via Drizzle)
// All data access uses getDb() + Drizzle ORM. SERVER ONLY for save/get functions.

import { getDb } from '@/db';
import { answers as answersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { BibleAnswer } from '@/types';
import { writeGraphFromAnswer } from '@/lib/graph';

// ── Configuration checks ─────────────────────────────────────────────────────

/**
 * Returns true when DATABASE_URL is set and is a real PostgreSQL connection
 * string (not a PGlite placeholder). Use this to guard server-only paths.
 */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && !url.startsWith('pglite://'));
}

// ── Answer helpers ───────────────────────────────────────────────────────────

export async function saveAnswer(answer: BibleAnswer): Promise<string | null> {
  try {
    const db = await getDb();
    const slug = answer.id.slice(0, 8); // short slug for sharing

    await db
      .insert(answersTable)
      .values({
        id: answer.id,
        question: answer.question,
        answerJson: answer as any,
        translation: answer.translation_used ?? null,
        shareSlug: slug,
        createdAt: answer.created_at ? new Date(answer.created_at) : new Date(),
      })
      .onConflictDoNothing();

    // Fire-and-forget: populate the knowledge graph from this answer.
    // Non-blocking — graph failures never surface to the user.
    writeGraphFromAnswer(answer, answer.id).catch((err) =>
      console.warn('writeGraphFromAnswer failed (non-fatal):', err)
    );

    return slug;
  } catch (err) {
    console.error('[answers] saveAnswer error:', err);
    return null;
  }
}

export async function getAnswerBySlug(slug: string): Promise<BibleAnswer | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ answerJson: answersTable.answerJson })
      .from(answersTable)
      .where(eq(answersTable.shareSlug, slug))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0].answerJson as BibleAnswer;
  } catch (err) {
    console.error('[answers] getAnswerBySlug error:', err);
    return null;
  }
}

export async function getAnswerById(id: string): Promise<BibleAnswer | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ answerJson: answersTable.answerJson })
      .from(answersTable)
      .where(eq(answersTable.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0].answerJson as BibleAnswer;
  } catch (err) {
    console.error('[answers] getAnswerById error:', err);
    return null;
  }
}
