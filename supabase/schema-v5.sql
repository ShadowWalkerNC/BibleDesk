-- BibleDesk — Schema v5 (Phase 3B: Pastoral Prayer Care Workflow & Private Circle)
-- Run in the Supabase SQL editor AFTER schema.sql, schema-v2.sql, schema-v3.sql, and schema-v4.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout

-- ─── 1. Prayer Contacts ────────────────────────────────────────────────────────
-- Private contacts whom the user has committed to hold in prayer.
-- Private by default: only visible to owner_id.

CREATE TABLE IF NOT EXISTS public.prayer_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  category      TEXT NOT NULL DEFAULT 'Friend'
                  CHECK (category IN ('Family', 'Friend', 'Church', 'Missions', 'Healing', 'Work', 'Custom')),
  is_sensitive  BOOLEAN NOT NULL DEFAULT false,
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_contacts_owner ON public.prayer_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_prayer_contacts_archived ON public.prayer_contacts(owner_id, is_archived);

ALTER TABLE public.prayer_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own prayer contacts" ON public.prayer_contacts;
CREATE POLICY "Users can read own prayer contacts" ON public.prayer_contacts
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own prayer contacts" ON public.prayer_contacts;
CREATE POLICY "Users can insert own prayer contacts" ON public.prayer_contacts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own prayer contacts" ON public.prayer_contacts;
CREATE POLICY "Users can update own prayer contacts" ON public.prayer_contacts
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own prayer contacts" ON public.prayer_contacts;
CREATE POLICY "Users can delete own prayer contacts" ON public.prayer_contacts
  FOR DELETE USING (auth.uid() = owner_id);


-- ─── 2. Prayer Commitments ─────────────────────────────────────────────────────
-- Scheduled prayer intentions associated with a person/group or general topic.

CREATE TABLE IF NOT EXISTS public.prayer_commitments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES public.prayer_contacts(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  private_details  TEXT,
  recurrence_rule  TEXT NOT NULL DEFAULT 'daily'
                     CHECK (recurrence_rule IN ('daily', 'weekdays', 'weekly', 'monthly', 'once')),
  timezone         TEXT NOT NULL DEFAULT 'UTC',
  next_due_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'answered', 'archived')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_commitments_due ON public.prayer_commitments(owner_id, status, next_due_at);
CREATE INDEX IF NOT EXISTS idx_prayer_commitments_contact ON public.prayer_commitments(contact_id);

ALTER TABLE public.prayer_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own prayer commitments" ON public.prayer_commitments;
CREATE POLICY "Users can read own prayer commitments" ON public.prayer_commitments
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own prayer commitments" ON public.prayer_commitments;
CREATE POLICY "Users can insert own prayer commitments" ON public.prayer_commitments
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own prayer commitments" ON public.prayer_commitments;
CREATE POLICY "Users can update own prayer commitments" ON public.prayer_commitments
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own prayer commitments" ON public.prayer_commitments;
CREATE POLICY "Users can delete own prayer commitments" ON public.prayer_commitments
  FOR DELETE USING (auth.uid() = owner_id);


-- ─── 3. Prayer Check-ins ───────────────────────────────────────────────────────
-- Journal of prayer acts completed, snoozed, or answered without gamified streaks.

CREATE TABLE IF NOT EXISTS public.prayer_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commitment_id   UUID NOT NULL REFERENCES public.prayer_commitments(id) ON DELETE CASCADE,
  outcome         TEXT NOT NULL
                    CHECK (outcome IN ('prayed', 'snoozed', 'skipped', 'answered')),
  private_note    TEXT,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_due_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prayer_checkins_commitment ON public.prayer_checkins(commitment_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_checkins_owner ON public.prayer_checkins(owner_id, completed_at DESC);

ALTER TABLE public.prayer_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own prayer checkins" ON public.prayer_checkins;
CREATE POLICY "Users can read own prayer checkins" ON public.prayer_checkins
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own prayer checkins" ON public.prayer_checkins;
CREATE POLICY "Users can insert own prayer checkins" ON public.prayer_checkins
  FOR INSERT WITH CHECK (auth.uid() = owner_id);


-- ─── 4. Prayer Follow-ups ──────────────────────────────────────────────────────
-- Drafts and sent messages checking in with contacts. Requires human approval.

CREATE TABLE IF NOT EXISTS public.prayer_followups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id   UUID REFERENCES public.prayer_contacts(id) ON DELETE SET NULL,
  checkin_id   UUID REFERENCES public.prayer_checkins(id) ON DELETE SET NULL,
  channel      TEXT NOT NULL DEFAULT 'clipboard'
                 CHECK (channel IN ('email', 'sms', 'whatsapp', 'clipboard')),
  recipient    TEXT,
  subject      TEXT,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'approved', 'sent', 'failed', 'dismissed')),
  approved_at  TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_followups_contact ON public.prayer_followups(contact_id);
CREATE INDEX IF NOT EXISTS idx_prayer_followups_owner ON public.prayer_followups(owner_id, status);

ALTER TABLE public.prayer_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own prayer followups" ON public.prayer_followups;
CREATE POLICY "Users can read own prayer followups" ON public.prayer_followups
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert own prayer followups" ON public.prayer_followups;
CREATE POLICY "Users can insert own prayer followups" ON public.prayer_followups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own prayer followups" ON public.prayer_followups;
CREATE POLICY "Users can update own prayer followups" ON public.prayer_followups
  FOR UPDATE USING (auth.uid() = owner_id);


-- ─── 5. Notification Preferences ──────────────────────────────────────────────
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
