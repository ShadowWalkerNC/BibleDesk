import { NextRequest, NextResponse } from 'next/server';
import { TRANSLATIONS, type TranslationId } from '@/types';
import { searchLocalBible } from '@/lib/bible-local';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get('query');
  const translation = searchParams.get('translation') || 'web';

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: 'Search query must be at least 2 characters.' },
      { status: 400 }
    );
  }

  const slug = (TRANSLATIONS.some((t) => t.id === translation) ? translation : 'web') as TranslationId;
  const trimmed = query.trim();

  try {
    // 1. Try local full-text search first
    const localResult = searchLocalBible(trimmed, slug, 30);
    if (localResult && localResult.results.length > 0) {
      return NextResponse.json({
        success: true,
        query: trimmed,
        translation: slug,
        results: localResult.results,
        total: localResult.total,
        source: 'local',
      });
    }

    // 2. Fallback to bible-api.com if no local matches found
    const encoded = encodeURIComponent(trimmed);
    const url = `https://bible-api.com/${encoded}?translation=${slug}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json({
        success: true,
        query: trimmed,
        translation: slug,
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
      translation: slug,
      results,
      total: data.verses.length,
      source: 'remote',
    });
  } catch (err: any) {
    console.error('[api/bible/search] Error:', err);
    return NextResponse.json({ success: false, error: 'Search failed.' }, { status: 500 });
  }
}
