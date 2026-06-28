// BibleDesk — Bookmarks helpers
// Requires this migration in Supabase SQL editor:
//
// create table if not exists bookmarks (
//   id          uuid primary key default gen_random_uuid(),
//   answer_id   uuid not null references answers(id) on delete cascade,
//   share_slug  text not null,
//   question    text not null,
//   summary     text,
//   translation text,
//   confidence  text,
//   note        text,
//   created_at  timestamptz not null default now()
// );
// create unique index if not exists bookmarks_answer_id_idx on bookmarks(answer_id);

import { getServerClient } from '@/lib/supabase';

export interface Bookmark {
  id: string;
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
  confidence: string | null
): Promise<Bookmark | null> {
  const client = getServerClient();
  const { data, error } = await client
    .from('bookmarks')
    .upsert(
      { answer_id: answerId, share_slug: shareSlug, question, summary, translation, confidence },
      { onConflict: 'answer_id', ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) { console.error('addBookmark error:', error.message); return null; }
  return data as Bookmark;
}

export async function removeBookmark(answerId: string): Promise<boolean> {
  const client = getServerClient();
  const { error } = await client.from('bookmarks').delete().eq('answer_id', answerId);
  if (error) { console.error('removeBookmark error:', error.message); return false; }
  return true;
}

export async function isBookmarked(answerId: string): Promise<boolean> {
  const client = getServerClient();
  const { data } = await client.from('bookmarks').select('id').eq('answer_id', answerId).maybeSingle();
  return !!data;
}

export async function getBookmarks(opts?: {
  page?: number;
  limit?: number;
  search?: string;
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

  if (opts?.search) {
    query = query.ilike('question', `%${opts.search}%`);
  }

  const { data, count, error } = await query;
  if (error) { console.error('getBookmarks error:', error.message); return { bookmarks: [], total: 0 }; }
  return { bookmarks: (data ?? []) as Bookmark[], total: count ?? 0 };
}
