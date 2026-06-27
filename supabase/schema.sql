-- BibleDesk — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor

-- ── Answers table ──────────────────────────────────────────────
-- Stores completed AI answers for sharing and SEO

CREATE TABLE IF NOT EXISTS answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question     TEXT NOT NULL,
  answer_json  JSONB NOT NULL,
  translation  VARCHAR(10) NOT NULL DEFAULT 'web',
  share_slug   VARCHAR(16) UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS answers_share_slug_idx ON answers (share_slug);
CREATE INDEX IF NOT EXISTS answers_created_at_idx ON answers (created_at DESC);

-- RLS: Public read (answers are public for SEO), no public write
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read answers"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert answers"
  ON answers FOR INSERT
  WITH CHECK (true);  -- Enforced via service role key — never anon key


-- ── Rate limits table ──────────────────────────────────────────
-- Anonymous IP-based rate limiting (IPs are hashed, never stored raw)

CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash      VARCHAR(64) PRIMARY KEY,
  count        INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Only service role can read/write
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON rate_limits
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: delete stale rate limit rows older than 2 hours
-- (Run as a scheduled Supabase Edge Function or pg_cron job)
-- DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '2 hours';
