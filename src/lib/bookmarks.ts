// BibleDesk — Bookmarks helpers
// Synced to public.bookmarks with user_id and Row-Level Security.
// SERVER ONLY

import { getServerClient } from '@/lib/supabase';

export interface Bookmark {
  id: string;
  user_id?: string;
  answer_id: string;
  share_slug: string;
  question: string;
  summary: string | null;
  translation: string | null;
  confidence: string | null;
  note: string | null;
  created_at: string;
}

export async function addBookmark(
  answerId: string,
  shareSlug: string,
  question: string,
  summary: string | null,
  translation: string | null,
  confidence: string | null,
  userId?: string | null
): Promise<Bookmark | null> {
  const client = getServerClient();
  const payload: Record<string, any> = {
    answer_id: answerId,
    share_slug: shareSlug,
    question,
    summary,
    translation,
    confidence,
  };

  if (userId) {
    payload.user_id = userId;
  }

  const { data, error } = await client
    .from('bookmarks')
    .upsert(payload, {
      onConflict: userId ? 'user_id,answer_id' : 'answer_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error('addBookmark error:', error.message);
    return null;
  }
  return data as Bookmark;
}

export async function removeBookmark(answerId: string, userId?: string | null): Promise<boolean> {
  const client = getServerClient();
  let query = client.from('bookmarks').delete().eq('answer_id', answerId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;
  if (error) {
    console.error('removeBookmark error:', error.message);
    return false;
  }
  return true;
}

export async function isBookmarked(answerId: string, userId?: string | null): Promise<boolean> {
  const client = getServerClient();
  let query = client.from('bookmarks').select('id').eq('answer_id', answerId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}

export async function getBookmarks(opts?: {
  page?: number;
  limit?: number;
  search?: string;
  userId?: string | null;
}): Promise<{ bookmarks: Bookmark[]; total: number }> {
  const client = getServerClient();
  const page  = opts?.page  ?? 1;
  const limit = opts?.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = client
    .from('bookmarks')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.userId) {
    query = query.eq('user_id', opts.userId);
  }

  if (opts?.search) {
    query = query.ilike('question', `%${opts.search}%`);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('getBookmarks error:', error.message);
    return { bookmarks: [], total: 0 };
  }
  return { bookmarks: (data ?? []) as Bookmark[], total: count ?? 0 };
}
