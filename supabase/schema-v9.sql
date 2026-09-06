-- BibleDesk — Schema v9: Christian Creator Profiles
-- Link-in-bio, ministry profiles, and external patronage support

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  category TEXT NOT NULL DEFAULT 'worship',
  location TEXT,
  church_affiliation TEXT,
  season_verse JSONB DEFAULT '{}'::jsonb,
  featured_media JSONB DEFAULT '[]'::jsonb,
  social_links JSONB DEFAULT '[]'::jsonb,
  patronage_links JSONB DEFAULT '[]'::jsonb,
  prayer_requests JSONB DEFAULT '[]'::jsonb,
  featured_sermon_ids JSONB DEFAULT '[]'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_creator_profiles_handle ON public.creator_profiles (handle);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_category ON public.creator_profiles (category);

-- Enable RLS
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- Public can read active creator profiles
CREATE POLICY "Anyone can view active creator profiles"
  ON public.creator_profiles
  FOR SELECT
  USING (is_active = TRUE);

-- Authenticated creators can manage their own profile
CREATE POLICY "Creators can insert their own profile"
  ON public.creator_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update their own profile"
  ON public.creator_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can delete their own profile"
  ON public.creator_profiles
  FOR DELETE
  USING (auth.uid() = user_id);
