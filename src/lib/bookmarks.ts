// BibleDesk — Bookmarks helpers
// Uses Railway PostgreSQL via Drizzle ORM.
// SERVER ONLY

import { getDb } from '@/db';
import { bookmarks as bookmarksTable } from '@/db/schema';
import { eq, and, ilike, desc, count as countFn } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { Bookmark as BookmarkRow } from '@/db/schema';

export interface Bookmark {
  id: string;
  user_id?: string;
  answer_id: string;
  share_slug: string;
  question: string;
  summary: string | null;
  translation: string | null;
  confidence: string | null;
  note: string | null;
  created_at: string;
}

export async function addBookmark(
  answerId: string,
  shareSlug: string,
  question: string,
  summary: string | null,
  translation: string | null,
  confidence: string | null,
  userId?: string | null
): Promise<Bookmark | null> {
  try {
    const db = await getDb();
    const id = uuidv4();

    const rows = await db
      .insert(bookmarksTable)
      .values({
        id,
        userId: userId ?? null,
        answerId,
        shareSlug,
        question,
        summary,
        translation,
        confidence,
      })
      .onConflictDoUpdate({
        target: userId
          ? [bookmarksTable.userId, bookmarksTable.answerId]
          : [bookmarksTable.answerId],
        set: {
          shareSlug,
          question,
          summary,
          translation,
          confidence,
        },
      })
      .returning();

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      user_id: r.userId ?? undefined,
      answer_id: r.answerId,
      share_slug: r.shareSlug,
      question: r.question,
      summary: r.summary ?? null,
      translation: r.translation ?? null,
      confidence: r.confidence ?? null,
      note: r.note ?? null,
      created_at: r.createdAt.toISOString(),
    };
  } catch (err) {
    console.error('addBookmark error:', err);
    return null;
  }
}

export async function removeBookmark(answerId: string, userId?: string | null): Promise<boolean> {
  try {
    const db = await getDb();
    if (userId) {
      await db
        .delete(bookmarksTable)
        .where(
          and(
            eq(bookmarksTable.answerId, answerId),
            eq(bookmarksTable.userId, userId)
          )
        );
    } else {
      await db
        .delete(bookmarksTable)
        .where(eq(bookmarksTable.answerId, answerId));
    }
    return true;
  } catch (err) {
    console.error('removeBookmark error:', err);
    return false;
  }
}

export async function isBookmarked(answerId: string, userId?: string | null): Promise<boolean> {
  try {
    const db = await getDb();
    const rows = userId
      ? await db
          .select({ id: bookmarksTable.id })
          .from(bookmarksTable)
          .where(and(eq(bookmarksTable.answerId, answerId), eq(bookmarksTable.userId, userId)))
          .limit(1)
      : await db
          .select({ id: bookmarksTable.id })
          .from(bookmarksTable)
          .where(eq(bookmarksTable.answerId, answerId))
          .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function getBookmarks(opts?: {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string | null;
}): Promise<{ bookmarks: Bookmark[]; total: number }> {
  try {
    const db = await getDb();
    const page  = opts?.page  ?? 1;
    const limit = opts?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (opts?.userId) conditions.push(eq(bookmarksTable.userId, opts.userId));
    if (opts?.search) conditions.push(ilike(bookmarksTable.question, `%${opts.search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(bookmarksTable)
        .where(where)
        .orderBy(desc(bookmarksTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: countFn() })
        .from(bookmarksTable)
        .where(where),
    ]);

    return {
      bookmarks: rows.map((r: BookmarkRow) => ({
        id: r.id,
        user_id: r.userId ?? undefined,
        answer_id: r.answerId,
        share_slug: r.shareSlug,
        question: r.question,
        summary: r.summary ?? null,
        translation: r.translation ?? null,
        confidence: r.confidence ?? null,
        note: r.note ?? null,
        created_at: r.createdAt.toISOString(),
      })),
      total: Number(totalRows[0]?.c ?? 0),
    };
  } catch (err) {
    console.error('getBookmarks error:', err);
    return { bookmarks: [], total: 0 };
  }
}
