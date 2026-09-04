-- BibleDesk — Schema v7 (Phase 3D: 2D PrayerAtlas Geolocation & Category Attributes)
-- Run in the Supabase SQL editor AFTER schema-v6.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout

-- ─── 1. Enhance prayer_requests with Geospatial and Privacy Metadata ─────────────
-- Adds optional geolocation coordinates, country badges, category tags, and privacy settings.

DO $$
BEGIN
  -- country_code
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_requests' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE public.prayer_requests ADD COLUMN country_code TEXT;
  END IF;

  -- country_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_requests' AND column_name = 'country_name'
  ) THEN
    ALTER TABLE public.prayer_requests ADD COLUMN country_name TEXT;
  END IF;

  -- latitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_requests' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.prayer_requests ADD COLUMN latitude DOUBLE PRECISION;
  END IF;

  -- longitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_requests' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.prayer_requests ADD COLUMN longitude DOUBLE PRECISION;
  END IF;

  -- category (Healing, Church, Missions, Family, Work, Community, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_requests' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.prayer_requests ADD COLUMN category TEXT NOT NULL DEFAULT 'community';
  END IF;

  -- privacy_mode ('approximate' | 'precise' | 'restricted')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_requests' AND column_name = 'privacy_mode'
  ) THEN
    ALTER TABLE public.prayer_requests ADD COLUMN privacy_mode TEXT NOT NULL DEFAULT 'approximate';
  END IF;

  -- is_restricted (Restricted Access Nation shield)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prayer_requests' AND column_name = 'is_restricted'
  ) THEN
    ALTER TABLE public.prayer_requests ADD COLUMN is_restricted BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Geospatial & category lookup indexes
CREATE INDEX IF NOT EXISTS idx_prayer_requests_country ON public.prayer_requests(country_code);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_category ON public.prayer_requests(category);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_privacy ON public.prayer_requests(privacy_mode);
