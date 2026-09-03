-- BibleDesk — Schema v5 (Private Prayer Care + per-user Google OAuth)
-- Apply AFTER schema.sql through schema-v4.sql.
-- This migration is intentionally not applied by the application.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.prayer_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  email         TEXT CHECK (email IS NULL OR char_length(email) <= 320),
  phone         TEXT CHECK (phone IS NULL OR char_length(phone) <= 40),
  category      TEXT NOT NULL DEFAULT 'friend'
                  CHECK (category IN ('family', 'friend', 'church', 'missions', 'healing', 'work', 'other')),
  is_sensitive  BOOLEAN NOT NULL DEFAULT false,
  is_archived   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id)
);

CREATE TABLE IF NOT EXISTS public.prayer_commitments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id        UUID NOT NULL,
  title             TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  private_details   TEXT CHECK (private_details IS NULL OR char_length(private_details) <= 5000),
  schedule_kind     TEXT NOT NULL
                        CHECK (schedule_kind IN ('daily', 'weekly', 'monthly', 'one_time')),
  timezone          TEXT NOT NULL CHECK (char_length(timezone) BETWEEN 1 AND 100),
  local_time        TIME NOT NULL,
  next_due_at       TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'answered', 'archived')),
  google_event_id   TEXT,
  google_event_link TEXT CHECK (google_event_link IS NULL OR char_length(google_event_link) <= 2048),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  CONSTRAINT prayer_commitments_contact_owner_fk
    FOREIGN KEY (contact_id, owner_id)
    REFERENCES public.prayer_contacts(id, owner_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.prayer_checkins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commitment_id  UUID NOT NULL,
  outcome        TEXT NOT NULL
                   CHECK (outcome IN ('prayed', 'snoozed', 'skipped', 'answered')),
  private_note   TEXT CHECK (private_note IS NULL OR char_length(private_note) <= 5000),
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_due_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  CONSTRAINT prayer_checkins_commitment_owner_fk
    FOREIGN KEY (commitment_id, owner_id)
    REFERENCES public.prayer_commitments(id, owner_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.prayer_followups (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id            UUID NOT NULL,
  checkin_id            UUID,
  channel               TEXT NOT NULL DEFAULT 'email'
                          CHECK (channel IN ('email', 'sms', 'whatsapp', 'clipboard')),
  recipient             TEXT NOT NULL CHECK (char_length(recipient) BETWEEN 1 AND 320),
  subject               TEXT CHECK (subject IS NULL OR char_length(subject) <= 200),
  message               TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 10000),
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'approved', 'external_draft', 'sent', 'failed', 'dismissed')),
  google_draft_id       TEXT,
  reviewed_at           TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  sent_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id),
  CONSTRAINT prayer_followups_contact_owner_fk
    FOREIGN KEY (contact_id, owner_id)
    REFERENCES public.prayer_contacts(id, owner_id)
    ON DELETE CASCADE,
  CONSTRAINT prayer_followups_checkin_owner_fk
    FOREIGN KEY (checkin_id, owner_id)
    REFERENCES public.prayer_checkins(id, owner_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.prayer_notification_preferences (
  owner_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone           TEXT NOT NULL CHECK (char_length(timezone) BETWEEN 1 AND 100),
  quiet_hours_start  TIME,
  quiet_hours_end    TIME,
  browser_enabled    BOOLEAN NOT NULL DEFAULT false,
  email_enabled      BOOLEAN NOT NULL DEFAULT false,
  digest_mode        TEXT NOT NULL DEFAULT 'individual'
                       CHECK (digest_mode IN ('individual', 'daily_digest')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAuth credentials are intentionally server-only. Ciphertext values use the
-- application AES-256-GCM envelope format and are never returned by an API.
CREATE TABLE IF NOT EXISTS public.google_connections (
  owner_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_account_email     TEXT NOT NULL CHECK (char_length(google_account_email) <= 320),
  encrypted_access_token   TEXT NOT NULL,
  encrypted_refresh_token  TEXT,
  token_expires_at         TIMESTAMPTZ,
  scopes                   TEXT[] NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prayer_contacts_owner_active_idx
  ON public.prayer_contacts(owner_id, is_archived, display_name);
CREATE INDEX IF NOT EXISTS prayer_commitments_owner_due_idx
  ON public.prayer_commitments(owner_id, status, next_due_at);
CREATE INDEX IF NOT EXISTS prayer_commitments_contact_idx
  ON public.prayer_commitments(contact_id);
CREATE INDEX IF NOT EXISTS prayer_checkins_owner_commitment_idx
  ON public.prayer_checkins(owner_id, commitment_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS prayer_followups_owner_status_idx
  ON public.prayer_followups(owner_id, status, created_at DESC);

ALTER TABLE public.prayer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage prayer contacts" ON public.prayer_contacts;
CREATE POLICY "Owners manage prayer contacts" ON public.prayer_contacts
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners manage prayer commitments" ON public.prayer_commitments;
CREATE POLICY "Owners manage prayer commitments" ON public.prayer_commitments
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners manage prayer checkins" ON public.prayer_checkins;
CREATE POLICY "Owners manage prayer checkins" ON public.prayer_checkins
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners manage prayer followups" ON public.prayer_followups;
CREATE POLICY "Owners manage prayer followups" ON public.prayer_followups
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners manage prayer notification preferences" ON public.prayer_notification_preferences;
CREATE POLICY "Owners manage prayer notification preferences"
  ON public.prayer_notification_preferences
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- No policy is created for google_connections. RLS therefore denies anon and
-- authenticated browser clients. Explicit grants are also removed as defense
-- in depth; the Supabase service role bypasses RLS.
REVOKE ALL ON TABLE public.google_connections FROM anon, authenticated;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'prayer_contacts',
    'prayer_commitments',
    'prayer_followups',
    'prayer_notification_preferences',
    'google_connections'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'set_' || table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'set_' || table_name || '_updated_at',
      table_name
    );
  END LOOP;
END;
$$;
