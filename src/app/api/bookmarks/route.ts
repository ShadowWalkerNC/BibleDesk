// /api/bookmarks — GET (list) | POST (add) | DELETE (remove)
// Scoped by authenticated user ID with guest fallback.

import { NextRequest, NextResponse } from 'next/server';
import { addBookmark, removeBookmark, getBookmarks, isBookmarked } from '@/lib/bookmarks';
import { getAuthenticatedUser } from '@/lib/auth';

// GET /api/bookmarks?page=1&limit=20&search=&check=<answerId>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const check = searchParams.get('check');

    // Offline guard — Supabase not configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (check) return NextResponse.json({ bookmarked: false, offline: true });
      return NextResponse.json({ bookmarks: [], total: 0, page: 1, totalPages: 0, offline: true });
    }

    const user = await getAuthenticatedUser(req);

    // Quick "is this answer bookmarked?" check
    if (check) {
      if (!user) {
        return NextResponse.json({ bookmarked: false, guest: true });
      }
      const bookmarked = await isBookmarked(check, user.id);
      return NextResponse.json({ bookmarked });
    }

    if (!user) {
      return NextResponse.json({ bookmarks: [], total: 0, page: 1, totalPages: 0, guest: true });
    }

    const page   = Number(searchParams.get('page')  ?? '1');
    const limit  = Number(searchParams.get('limit') ?? '20');
    const search = searchParams.get('search') ?? '';

    const result = await getBookmarks({ page, limit, search: search || undefined, userId: user.id });
    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/bookmarks error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/bookmarks — body: { answerId, shareSlug, question, summary, translation, confidence }
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { answerId, shareSlug, question, summary, translation, confidence } = body;

    if (!answerId || !shareSlug || !question) {
      return NextResponse.json({ error: 'answerId, shareSlug, and question are required' }, { status: 400 });
    }

    if (!user) {
      // Guest mode: acknowledge so client stores locally
      return NextResponse.json({ 
        guest: true, 
        message: 'Saved to local guest bookmarks. Sign in to sync across devices.' 
      }, { status: 200 });
    }

    const bookmark = await addBookmark(
      answerId, 
      shareSlug, 
      question, 
      summary ?? null, 
      translation ?? null, 
      confidence ?? null,
      user.id
    );

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
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { answerId } = body;

    if (!answerId) {
      return NextResponse.json({ error: 'answerId is required' }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ removed: true, guest: true });
    }

    const ok = await removeBookmark(answerId, user.id);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
    }
    return NextResponse.json({ removed: true });
  } catch (e) {
    console.error('DELETE /api/bookmarks error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
