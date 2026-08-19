import { NextRequest, NextResponse } from 'next/server';
import { getLocalChapter } from '@/lib/bible-local';
import { fetchPassage } from '@/lib/bible';
import { getBookChapters } from '@/lib/books';
import type { TranslationId } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const book = searchParams.get('book');
  const chapterStr = searchParams.get('chapter');
  const translation = (searchParams.get('translation') || 'web') as TranslationId;

  if (!book || !chapterStr) {
    return NextResponse.json(
      { error: 'Book and chapter are required parameters.' },
      { status: 400 }
    );
  }

  const chapter = parseInt(chapterStr, 10);
  if (isNaN(chapter) || chapter < 1) {
    return NextResponse.json(
      { error: 'Invalid chapter parameter. Must be a positive integer.' },
      { status: 400 }
    );
  }

  // Validate book name and chapter bounds
  const maxChapters = getBookChapters(book);
  if (maxChapters === 0) {
    return NextResponse.json(
      { error: `Invalid book name: "${book}".` },
      { status: 400 }
    );
  }

  if (chapter > maxChapters) {
    return NextResponse.json(
      { error: `Book "${book}" only has ${maxChapters} chapters. Chapter ${chapter} is out of bounds.` },
      { status: 400 }
    );
  }

  try {
    // 1. Try instant local chapter lookup
    const localPassage = getLocalChapter(book, chapter, translation);
    if (localPassage) {
      return NextResponse.json({
        success: true,
        passage: localPassage,
        maxChapters,
        source: 'local',
      });
    }

    // 2. Fallback to fetchPassage (remote if needed)
    const reference = `${book} ${chapter}`;
    const result = await fetchPassage(reference, translation);

    if (result.error || !result.passage) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch Bible passage.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      passage: result.passage,
      maxChapters,
      source: 'remote',
    });
  } catch (err) {
    console.error('[bible/chapter] API Error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the scripture.' },
      { status: 500 }
    );
  }
}
