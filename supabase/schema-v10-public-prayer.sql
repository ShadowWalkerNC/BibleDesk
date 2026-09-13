-- ==============================================================================
-- BibleDesk Schema Migration v10 — Public Prayer Hardening (task B14)
-- Applies on top of schema-v9.sql
--
-- Order: 11 — apply after supabase/schema-v9.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → schema-v10-public-prayer.sql → rpc.sql; see supabase/README.md)
--
-- What this adds to public.prayer_requests:
--   1. is_public      — the row may appear on the public Community Wall.
--                      DEFAULT TRUE so every row created before this migration
--                      keeps its old public behavior.
--   2. consent_atlas  — the row may appear on the World PrayerAtlas map.
--                      DEFAULT FALSE: atlas visibility now requires an explicit
--                      opt-in in the composer (or via Tier-4 escalation with
--                      explicit consent). Rows pinned before consent existed
--                      drop off the map until their owner re-consents — that
--                      is the privacy-safe behavior.
--   3. status         — 'approved' | 'pending' | 'held'. The /api/prayer POST
--                      route runs new bodies through moderation (checkAutoFlag);
--                      auto-flagged rows are stored as 'held' and stay hidden
--                      from the public wall until a moderator approves them.
--   4. updated_at     — the escalate route already writes this column
--                      (schema-v8 shipped the update before the column existed).
--   5. escalation_note — the optional situation note entered during
--                      escalation (v8's route accepted it but had nowhere
--                      to store it).
--
-- RLS: replaces the v4 trio of permissive policies
--   ("Public read prayer requests", "Anyone insert prayer requests",
--    "Anyone update likes") with owner-scoped writes + public read limited to
--   approved public rows. The v8 "Church members view church-escalated
--   prayers" SELECT policy is left intact (policies are OR-ed, so narrowing
--   here does not remove that church exception).
-- ==============================================================================

-- ─── 1. Columns ──────────────────────────────────────────────────────────────
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS is_public    BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS consent_atlas BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'held')),
  ADD COLUMN IF NOT EXISTS escalation_note TEXT,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now();

-- Backfill: rows predating the migration keep their public wall visibility.
UPDATE public.prayer_requests
SET is_public = TRUE
WHERE is_public IS NULL;

ALTER TABLE public.prayer_requests
  ALTER COLUMN is_public SET NOT NULL,
  ALTER COLUMN is_public SET DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_prayer_requests_public_approved
  ON public.prayer_requests(is_public, status);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_atlas
  ON public.prayer_requests(consent_atlas);

-- ─── 2. RLS policy replacement ───────────────────────────────────────────────
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Remove the permissive v4 policies.
DROP POLICY IF EXISTS "Public read prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Anyone insert prayer requests" ON public.prayer_requests;
DROP POLICY IF EXISTS "Anyone update likes" ON public.prayer_requests;

-- Public read: approved public rows only. (Private/held rows are invisible.)
CREATE POLICY "Approved public prayers are readable"
  ON public.prayer_requests FOR SELECT
  USING (is_public = TRUE AND status = 'approved');

-- Owners can always read their own rows (including pending / held / private),
-- so the composer can show them their submission's status.
CREATE POLICY "Owners read own prayer requests"
  ON public.prayer_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Writes: posting requires sign-in. The app inserts user_id from the verified
-- session token; the policy refuses anonymous inserts outright.
CREATE POLICY "Owners insert own prayer requests"
  ON public.prayer_requests FOR INSERT
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Owners update own prayer requests"
  ON public.prayer_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners delete own prayer requests"
  ON public.prayer_requests FOR DELETE
  USING (auth.uid() = user_id);
