import { NextRequest, NextResponse } from 'next/server';
import { TRANSLATIONS, type TranslationId } from '@/types';

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

  const slug = (TRANSLATIONS.some(t => t.id === translation) ? translation : 'web') as TranslationId;
  const encoded = encodeURIComponent(query.trim());
  const url = `https://bible-api.com/${encoded}?translation=${slug}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Search failed (HTTP ${res.status})` }, { status: res.status });
    }

    const data = await res.json();
    if (!data.verses || data.verses.length === 0) {
      return NextResponse.json({ success: true, results: [], total: 0 });
    }

    // Format matches to include full reference and text
    const results = (data.verses as Array<{ book_name: string; chapter: number; verse: number; text: string }>)
      .slice(0, 30) // limit to top 30 matches to keep response size light
      .map((v) => ({
        book: v.book_name,
        chapter: v.chapter,
        verse: v.verse,
        reference: `${v.book_name} ${v.chapter}:${v.verse}`,
        text: v.text.trim(),
      }));

    return NextResponse.json({
      success: true,
      query: query.trim(),
      translation: slug,
      results,
      total: data.verses.length,
    });
  } catch (err: any) {
    console.error('[api/bible/search] Error:', err);
    return NextResponse.json({ success: false, error: 'Connection to search server timed out.' }, { status: 500 });
  }
}
