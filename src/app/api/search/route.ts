import { NextRequest, NextResponse } from 'next/server';
import { getDb, scriptureVerses, commentaries, studyNotes } from '@/db';
import { ilike, or } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const scope = searchParams.get('scope') || 'all'; // 'all' | 'scripture' | 'commentary' | 'notes'
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));

  if (!q) {
    return NextResponse.json(
      { error: 'Search query "q" is required' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const pattern = `%${q}%`;

    const results: {
      scripture: any[];
      commentary: any[];
      notes: any[];
      totalCount: number;
    } = {
      scripture: [],
      commentary: [],
      notes: [],
      totalCount: 0,
    };

    // 1. Scripture search
    if (scope === 'all' || scope === 'scripture') {
      const verses = await db
        .select()
        .from(scriptureVerses)
        .where(ilike(scriptureVerses.text, pattern))
        .limit(limit);

      results.scripture = verses.map((v: any) => ({
        type: 'scripture',
        id: v.id,
        reference: `${v.book} ${v.chapter}:${v.verse}`,
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
        translation: v.translation,
      }));
    }

    // 2. Commentary search
    if (scope === 'all' || scope === 'commentary') {
      const comms = await db
        .select()
        .from(commentaries)
        .where(
          or(
            ilike(commentaries.title, pattern),
            ilike(commentaries.summary, pattern),
            ilike(commentaries.verseRef, pattern)
          )
        )
        .limit(limit);

      results.commentary = comms.map((c: any) => ({
        type: 'commentary',
        id: c.id,
        verseRef: c.verseRef,
        title: c.title,
        summary: c.summary,
        confidence: c.confidence,
        confidenceScore: c.confidenceScore,
      }));
    }

    // 3. Notes search
    if (scope === 'all' || scope === 'notes') {
      const notes = await db
        .select()
        .from(studyNotes)
        .where(
          or(
            ilike(studyNotes.title, pattern),
            ilike(studyNotes.content, pattern),
            ilike(studyNotes.verseRef, pattern)
          )
        )
        .limit(limit);

      results.notes = notes.map((n: any) => ({
        type: 'note',
        id: n.id,
        verseRef: n.verseRef,
        title: n.title,
        content: n.content,
        tags: n.tags,
        updatedAt: n.updatedAt,
      }));
    }

    results.totalCount =
      results.scripture.length +
      results.commentary.length +
      results.notes.length;

    return NextResponse.json({
      success: true,
      query: q,
      scope,
      results,
    });
  } catch (err: any) {
    console.error('[API /search] Error:', err);
    return NextResponse.json(
      { error: 'Failed to execute search', details: err.message },
      { status: 500 }
    );
  }
}
