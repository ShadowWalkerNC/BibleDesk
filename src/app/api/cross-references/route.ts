import { NextRequest, NextResponse } from 'next/server';
import { getDb, crossReferences, scriptureVerses } from '@/db';
import { eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let book = searchParams.get('book')?.trim();
  let chapterStr = searchParams.get('chapter')?.trim();
  let verseStr = searchParams.get('verse')?.trim();
  const refParam = searchParams.get('reference')?.trim();

  if (refParam && (!book || !chapterStr || !verseStr)) {
    const match = refParam.match(/^([0-9]?\s*[A-Za-z]+)\s+([0-9]+):([0-9]+)$/);
    if (match) {
      book = match[1].trim();
      chapterStr = match[2];
      verseStr = match[3];
    }
  }

  if (!book || !chapterStr || !verseStr) {
    return NextResponse.json(
      { error: 'book, chapter, and verse query parameters (or reference) are required' },
      { status: 400 }
    );
  }

  const chapter = parseInt(chapterStr, 10);
  const verse = parseInt(verseStr, 10);

  if (isNaN(chapter) || isNaN(verse)) {
    return NextResponse.json(
      { error: 'chapter and verse must be numbers' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();

    // 1. Query database cross_references table
    const dbRefs = await db
      .select()
      .from(crossReferences)
      .where(
        and(
          eq(crossReferences.fromBook, book),
          eq(crossReferences.fromChapter, chapter),
          eq(crossReferences.fromVerse, verse)
        )
      )
      .limit(20);

    let formattedRefs: Array<{
      reference: string;
      toBook: string;
      toChapter: number;
      toVerse: number;
      text?: string;
      votes: number;
    }> = [];

    if (dbRefs && dbRefs.length > 0) {
      formattedRefs = dbRefs.map((r: any) => ({
        reference: `${r.toBook} ${r.toChapter}:${r.toVerse}`,
        toBook: r.toBook,
        toChapter: r.toChapter,
        toVerse: r.toVerse,
        votes: r.votes ?? 1,
      }));
    } else {
      // Fallback to static TSK file if not yet in DB
      const tskPath = path.join(process.cwd(), 'src', 'data', 'lexicon', 'cross_references.json');
      if (fs.existsSync(tskPath)) {
        const raw = fs.readFileSync(tskPath, 'utf8');
        const tsk = JSON.parse(raw);
        const key = `${book} ${chapter}:${verse}`;
        const targets = tsk[key] || [];

        formattedRefs = targets.slice(0, 15).map((toRef: string) => {
          const match = toRef.match(/^([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)$/);
          return {
            reference: toRef,
            toBook: match ? match[1].trim() : toRef,
            toChapter: match ? parseInt(match[2], 10) : 1,
            toVerse: match ? parseInt(match[3], 10) : 1,
            votes: 1,
          };
        });
      }
    }

    // 2. Hydrate target verse texts from database where possible
    for (const item of formattedRefs) {
      if (item.toBook && item.toChapter && item.toVerse) {
        try {
          const [foundVerse] = await db
            .select({ text: scriptureVerses.text })
            .from(scriptureVerses)
            .where(
              and(
                eq(scriptureVerses.book, item.toBook),
                eq(scriptureVerses.chapter, item.toChapter),
                eq(scriptureVerses.verse, item.toVerse)
              )
            )
            .limit(1);

          if (foundVerse) {
            item.text = foundVerse.text;
          }
        } catch {}
      }
    }

    const responseRefs = formattedRefs.map((r) => ({
      ...r,
      target_reference: r.reference,
      target_text: r.text || '',
    }));

    return NextResponse.json({
      success: true,
      from: `${book} ${chapter}:${verse}`,
      reference: `${book} ${chapter}:${verse}`,
      count: responseRefs.length,
      total: responseRefs.length,
      crossReferences: responseRefs,
    });
  } catch (err: any) {
    console.error('Error fetching cross-references:', err);
    return NextResponse.json(
      { error: 'Failed to fetch cross-references', details: err?.message },
      { status: 500 }
    );
  }
}
