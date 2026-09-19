import { NextRequest, NextResponse } from 'next/server';
import { getLocalChapter } from '@/lib/bible-local';
import { fetchPassage } from '@/lib/bible';
import { getBookChapters } from '@/lib/books';
import { TRANSLATIONS, type TranslationId } from '@/types';
import { defineRoute, routeError, type RouteSchema } from '@/lib/platform';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChapterInput {
  book: string;
  chapterStr: string;
  translation: string;
}

// Parses the route's current query params (book, chapter, translation
// defaulting to 'web'). Invalid translations are rejected in the handler
// below with a 400 listing the supported values.
const chapterSchema: RouteSchema<ChapterInput> = {
  safeParse(input: unknown) {
    const params = (input ?? {}) as Record<string, unknown>;
    const book = typeof params.book === 'string' ? params.book : '';
    const chapterStr = typeof params.chapter === 'string' ? params.chapter : '';
    const translation = typeof params.translation === 'string' && params.translation ? params.translation : 'web';
    return { success: true, data: { book, chapterStr, translation } };
  },
};

export const GET = defineRoute({
  schema: chapterSchema,
  handler: async (_req: NextRequest, { book, chapterStr, translation }, { requestId }) => {
    if (!TRANSLATIONS.some((t) => t.id === translation)) {
      return routeError(
        requestId,
        400,
        `Invalid translation: "${translation}". Supported translations: ${TRANSLATIONS.map((t) => t.id).join(', ')}.`,
        'INVALID_TRANSLATION'
      );
    }

    if (!book || !chapterStr) {
      return routeError(
        requestId,
        400,
        'Book and chapter are required parameters.',
        'MISSING_PARAMETERS'
      );
    }

    const chapter = parseInt(chapterStr, 10);
    if (isNaN(chapter) || chapter < 1) {
      return routeError(
        requestId,
        400,
        'Invalid chapter parameter. Must be a positive integer.',
        'INVALID_CHAPTER'
      );
    }

    // Validate book name and chapter bounds
    const maxChapters = getBookChapters(book);
    if (maxChapters === 0) {
      return routeError(
        requestId,
        400,
        `Invalid book name: "${book}".`,
        'INVALID_BOOK'
      );
    }

    if (chapter > maxChapters) {
      return routeError(
        requestId,
        400,
        `Book "${book}" only has ${maxChapters} chapters. Chapter ${chapter} is out of bounds.`,
        'CHAPTER_OUT_OF_RANGE'
      );
    }

    try {
      // 1. Try PostgreSQL Database lookup
      try {
        const { getDb, scriptureVerses } = await import('@/db');
        const { eq, and } = await import('drizzle-orm');
        const db = await getDb();
        const dbVerses = await db
          .select()
          .from(scriptureVerses)
          .where(
            and(
              eq(scriptureVerses.book, book),
              eq(scriptureVerses.chapter, chapter),
              eq(scriptureVerses.translation, translation)
            )
          )
          .orderBy(scriptureVerses.verse);

        if (dbVerses && dbVerses.length > 0) {
          const passageText = dbVerses.map((v: any) => `${v.verse} ${v.text}`).join(' ');
          return NextResponse.json({
            success: true,
            passage: {
              reference: `${book} ${chapter}`,
              verses: dbVerses.map((v: any) => ({
                verse: v.verse,
                text: v.text,
              })),
              text: passageText,
              translation_id: translation,
              translation_name: TRANSLATIONS.find(t => t.id === translation)?.name || translation,
            },
            maxChapters,
            source: 'database',
          });
        }
      } catch (dbErr) {
        console.warn('[bible/chapter] DB lookup note, checking local modules:', dbErr);
      }

      // 2. Try instant local bundled file lookup
      const localPassage = getLocalChapter(book, chapter, translation as TranslationId);
      if (localPassage) {
        return NextResponse.json({
          success: true,
          passage: localPassage,
          maxChapters,
          source: 'local',
        });
      }

      // 3. Fallback to fetchPassage (remote if needed)
      const reference = `${book} ${chapter}`;
      const result = await fetchPassage(reference, translation as TranslationId);

      if (result.error || !result.passage) {
        return routeError(
          requestId,
          500,
          result.error || 'Failed to fetch Bible passage.',
          'FETCH_FAILED'
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
      return routeError(
        requestId,
        500,
        'An unexpected error occurred while fetching the scripture.',
        'INTERNAL_ERROR'
      );
    }
  },
});
