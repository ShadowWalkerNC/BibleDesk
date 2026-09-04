-- BibleDesk — Schema v6 (Phase 3C: User-Scoped Bookmarks & RLS Audit)
-- Run in the Supabase SQL editor AFTER schema-v5.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout

-- ─── 1. Bookmarks Table with Strict User RLS ────────────────────────────────
-- Stores user-saved 5-dimension AI study answers and shared insights.
-- Every row is strictly linked to auth.users(id) and isolated via RLS.

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_id    TEXT NOT NULL,
  share_slug   TEXT NOT NULL,
  question     TEXT NOT NULL,
  summary      TEXT,
  translation  TEXT,
  confidence   TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index per user and answer so users cannot double-bookmark the same answer
CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_answer_idx 
  ON public.bookmarks(user_id, answer_id);

CREATE INDEX IF NOT EXISTS bookmarks_user_created_idx 
  ON public.bookmarks(user_id, created_at DESC);

-- Enable Row-Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own bookmarks
DROP POLICY IF EXISTS "Users can read own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can read own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own bookmarks
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own bookmarks
DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can update own bookmarks" ON public.bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own bookmarks
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 2. Full Security Audit & RLS Verification Across All User Tables ─────────
-- Verifies that RLS is unconditionally enabled on every user-scoped table.

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verse_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verse_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sermon_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Ensure indexes exist on foreign keys for fast RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_verse_highlights_user ON public.verse_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_verse_notes_user ON public.verse_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_sermon_notes_user ON public.sermon_notes(user_id);
