-- BibleDesk — Schema v4 (Phase 3: Church Tools & Auth)
-- Run in the Supabase SQL editor AFTER schema.sql, schema-v2.sql, and schema-v3.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout

-- ─── 0. Profiles ───────────────────────────────────────────────────────
-- Syncs user metadata automatically from auth.users.
-- User role limits specific privileges (e.g. only pastors can post sermon outlines to Discord).

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT,
  church_name  TEXT,
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('member', 'pastor', 'admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Anyone can read profiles. Users can only update their own.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Automatic handle new signup trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, church_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'church_name',
    COALESCE(new.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger after user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 1. Highlights & Verse Notes ──────────────────────────────────────────
-- Stores custom highlighters and annotations synced to user accounts.

CREATE TABLE IF NOT EXISTS public.verse_highlights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference   TEXT NOT NULL,
  color       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verse_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own highlights" ON public.verse_highlights;
CREATE POLICY "Users manage own highlights" ON public.verse_highlights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.verse_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference   TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verse_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notes" ON public.verse_notes;
CREATE POLICY "Users manage own notes" ON public.verse_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ─── 2. Prayer Requests ──────────────────────────────────────────────────
-- Public board where members can share requests and upvote/pray for others.

CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  request      TEXT NOT NULL,
  likes_count  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read prayer requests" ON public.prayer_requests;
CREATE POLICY "Public read prayer requests" ON public.prayer_requests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone insert prayer requests" ON public.prayer_requests;
CREATE POLICY "Anyone insert prayer requests" ON public.prayer_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone update likes" ON public.prayer_requests;
CREATE POLICY "Anyone update likes" ON public.prayer_requests
  FOR UPDATE USING (true);


-- ─── 3. Sermon Outlines ───────────────────────────────────────────────────
-- Outlines built by teachers/pastors, integrated with scriptures.

CREATE TABLE IF NOT EXISTS public.sermon_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sermon_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sermons" ON public.sermon_notes;
CREATE POLICY "Users manage own sermons" ON public.sermon_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_sermons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sermon_notes_updated_at ON public.sermon_notes;
CREATE TRIGGER update_sermon_notes_updated_at
  BEFORE UPDATE ON public.sermon_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_sermons_updated_at();
