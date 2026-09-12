-- BibleDesk — Schema v5 (Phase 3B: Pastoral Prayer Care Workflow & Private Circle)
-- Run in the Supabase SQL editor AFTER schema.sql, schema-v2.sql, schema-v3.sql, and schema-v4.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
--
-- 2026-09-12 (C05, owner decision (b)): the prayer-circle tables
-- (prayer_contacts, prayer_commitments, prayer_checkins, prayer_followups) were
-- removed — the circle is local-only for the MVP. Only the notification
-- preferences table remains (used by the daily digest route).
-- Order: 5 — apply after supabase/schema-v4.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)

-- ─── Notification Preferences ──────────────────────────────────────────────────
-- User quiet hours, timezone, and delivery channel preferences.

CREATE TABLE IF NOT EXISTS public.prayer_notification_preferences (
  owner_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone           TEXT NOT NULL DEFAULT 'UTC',
  quiet_hours_start  TIME,
  quiet_hours_end    TIME,
  browser_enabled    BOOLEAN NOT NULL DEFAULT true,
  email_enabled      BOOLEAN NOT NULL DEFAULT false,
  digest_mode        TEXT NOT NULL DEFAULT 'individual'
                       CHECK (digest_mode IN ('individual', 'daily_digest')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own prayer notification prefs" ON public.prayer_notification_preferences;
CREATE POLICY "Users can read own prayer notification prefs" ON public.prayer_notification_preferences
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can upsert own prayer notification prefs" ON public.prayer_notification_preferences;
CREATE POLICY "Users can upsert own prayer notification prefs" ON public.prayer_notification_preferences
  FOR ALL USING (auth.uid() = owner_id);
