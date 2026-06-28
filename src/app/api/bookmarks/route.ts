// /api/bookmarks — GET (list) | POST (add) | DELETE (remove)

import { NextRequest, NextResponse } from 'next/server';
import { addBookmark, removeBookmark, getBookmarks, isBookmarked } from '@/lib/bookmarks';

// GET /api/bookmarks?page=1&limit=20&search=&check=<answerId>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const check = searchParams.get('check');

    // Quick "is this answer bookmarked?" check
    if (check) {
      const bookmarked = await isBookmarked(check);
      return NextResponse.json({ bookmarked });
    }

    const page   = Number(searchParams.get('page')  ?? '1');
    const limit  = Number(searchParams.get('limit') ?? '20');
    const search = searchParams.get('search') ?? '';

    const result = await getBookmarks({ page, limit, search: search || undefined });
    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/bookmarks error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/bookmarks — body: { answerId, shareSlug, question, summary, translation, confidence }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { answerId, shareSlug, question, summary, translation, confidence } = body;

    if (!answerId || !shareSlug || !question) {
      return NextResponse.json({ error: 'answerId, shareSlug, and question are required' }, { status: 400 });
    }

    const bookmark = await addBookmark(answerId, shareSlug, question, summary ?? null, translation ?? null, confidence ?? null);
    if (!bookmark) {
      return NextResponse.json({ error: 'Failed to save bookmark' }, { status: 500 });
    }
    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (e) {
    console.error('POST /api/bookmarks error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/bookmarks — body: { answerId }
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { answerId } = body;

    if (!answerId) {
      return NextResponse.json({ error: 'answerId is required' }, { status: 400 });
    }

    const ok = await removeBookmark(answerId);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
    }
    return NextResponse.json({ removed: true });
  } catch (e) {
    console.error('DELETE /api/bookmarks error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
