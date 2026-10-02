/**
 * GET /api/history
 *
 * Returns paginated answer history from Railway PostgreSQL (Drizzle).
 *
 * Query params:
 *   page        — 1-based page number (default 1)
 *   limit       — page size 1–50 (default 20)
 *   search      — case-insensitive substring search on `question`
 *   confidence  — filter by confidence level: high | medium | low
 *
 * Response:
 *   { answers: HistoryAnswer[], total: number, page: number, limit: number }
 *
 * Returns { answers: [], total: 0 } gracefully when the database is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { answers } from '@/db/schema';
import { and, count, desc, ilike, sql, type SQL } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page       = Math.max(1,  parseInt(searchParams.get('page')  ?? '1',  10));
  const limit      = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const search     = searchParams.get('search')?.trim() ?? '';
  const confidence = searchParams.get('confidence')?.trim() ?? '';

  const offset = (page - 1) * limit;

  try {
    const db = await getDb();

    const conditions: SQL[] = [];
    if (search) conditions.push(ilike(answers.question, `%${search}%`));
    if (confidence) {
      conditions.push(sql`${answers.answerJson}->>'confidence' = ${confidence}`);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(answers)
        .where(where)
        .orderBy(desc(answers.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(answers)
        .where(where),
    ]);

    const mapped = rows.map((row) => {
      const answerJson = row.answerJson as {
        summary?: string;
        confidence?: string;
      };
      return {
        id: row.id,
        question: row.question,
        summary: answerJson?.summary ?? null,
        confidence: answerJson?.confidence ?? null,
        translation_used: row.translation,
        status: row.status,
        created_at: row.createdAt.toISOString(),
      };
    });

    const total = Number(totalRows[0]?.c ?? mapped.length);

    return NextResponse.json({ answers: mapped, total, page, limit });
  } catch {
    return NextResponse.json({ answers: [], total: 0, page, limit });
  }
}
