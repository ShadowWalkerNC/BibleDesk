import { NextRequest, NextResponse } from 'next/server';
import { TRANSLATIONS, type TranslationId } from '@/types';
import { searchLocalBible } from '@/lib/bible-local';
import { defineRoute, routeError, type RouteSchema } from '@/lib/platform';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SearchInput {
  query: string;
  translation: TranslationId;
}

// Parses the route's current query params (query + translation, defaulting
// to 'web' when absent). Invalid translations are rejected in the handler
// below with a 400 listing the supported values.
const searchSchema: RouteSchema<SearchInput> = {
  safeParse(input: unknown) {
    const params = (input ?? {}) as Record<string, unknown>;
    const query = typeof params.query === 'string' ? params.query : '';
    const rawTranslation = params.translation;
    const translation = (
      typeof rawTranslation === 'string' && rawTranslation ? rawTranslation : 'web'
    ) as TranslationId;
    return { success: true, data: { query: query.trim(), translation } };
  },
};

export const GET = defineRoute({
  schema: searchSchema,
  handler: async (_req: NextRequest, { query, translation }, { requestId }) => {
    if (!query || query.trim().length < 2) {
      return routeError(
        requestId,
        400,
        'Search query must be at least 2 characters.',
        'INVALID_QUERY'
      );
    }

    if (!TRANSLATIONS.some((t) => t.id === translation)) {
      return routeError(
        requestId,
        400,
        `Invalid translation: "${translation}". Supported translations: ${TRANSLATIONS.map((t) => t.id).join(', ')}.`,
        'INVALID_TRANSLATION'
      );
    }

    const trimmed = query.trim();

    try {
      // 1. Try local full-text search first
      const localResult = searchLocalBible(trimmed, translation, 30);
      if (localResult && localResult.results.length > 0) {
        return NextResponse.json({
          success: true,
          query: trimmed,
          translation,
          results: localResult.results,
          total: localResult.total,
          source: 'local',
        });
      }

      // 2. Fallback to bible-api.com if no local matches found
      const encoded = encodeURIComponent(trimmed);
      const url = `https://bible-api.com/${encoded}?translation=${translation}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        return NextResponse.json({
          success: true,
          query: trimmed,
          translation,
          results: [],
          total: 0,
          source: 'local',
        });
      }

      const data = await res.json();
      if (!data.verses || data.verses.length === 0) {
        return NextResponse.json({ success: true, results: [], total: 0, source: 'remote' });
      }

      const results = (data.verses as Array<{ book_name: string; chapter: number; verse: number; text: string }>)
        .slice(0, 30)
        .map((v) => ({
          book: v.book_name,
          chapter: v.chapter,
          verse: v.verse,
          reference: `${v.book_name} ${v.chapter}:${v.verse}`,
          text: v.text.trim(),
        }));

      return NextResponse.json({
        success: true,
        query: trimmed,
        translation,
        results,
        total: data.verses.length,
        source: 'remote',
      });
    } catch (err: any) {
      console.error('[api/bible/search] Error:', err);
      return routeError(requestId, 500, 'Search failed.', 'SEARCH_FAILED');
    }
  },
});
