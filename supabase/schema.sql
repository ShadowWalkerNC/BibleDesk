-- BibleDesk — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- Updated: Phase 2 — Pipeline + RAG + Moderation

-- ─────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────

-- pgvector: required for canonical_answers embedding column
-- Enable once in Supabase Dashboard → Database → Extensions → vector
CREATE EXTENSION IF NOT EXISTS vector;


-- ─────────────────────────────────────────────────────────────────────
-- PHASE 1 TABLES (original — unchanged)
-- ─────────────────────────────────────────────────────────────────────

-- ── Answers ──────────────────────────────────────────────────────────
-- Stores every AI-generated answer for sharing and analytics.
-- status column added in Phase 2 to support moderation flagging.

CREATE TABLE IF NOT EXISTS answers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question     TEXT        NOT NULL,
  answer_json  JSONB       NOT NULL,
  translation  VARCHAR(10) NOT NULL DEFAULT 'web',
  share_slug   VARCHAR(16) UNIQUE,
  status       TEXT        NOT NULL DEFAULT 'approved', -- 'approved' | 'under_review'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS answers_share_slug_idx  ON answers (share_slug);
CREATE INDEX IF NOT EXISTS answers_created_at_idx  ON answers (created_at DESC);
CREATE INDEX IF NOT EXISTS answers_status_idx      ON answers (status);

-- RLS: Public read, service-role-only write
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read answers"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert answers"
  ON answers FOR INSERT
  WITH CHECK (true); -- Enforced via service role key — never anon key


-- ── Rate limits ───────────────────────────────────────────────────────
-- Anonymous IP-based rate limiting. IPs are SHA-256 hashed, never raw.

CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash      VARCHAR(64) PRIMARY KEY,
  count        INT         NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Service role only
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits"
  ON rate_limits
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: delete stale rows older than 2 hours
-- (Schedule as a Supabase Edge Function or pg_cron job)
-- DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '2 hours';


-- ─────────────────────────────────────────────────────────────────────
-- PHASE 2 TABLES — RAG + Moderation
-- ─────────────────────────────────────────────────────────────────────

-- ── Moderators ───────────────────────────────────────────────────────
-- Invite-only. Moderators are pastors / theologians trusted to review
-- flagged answers and submit corrections backed by Scripture.
-- Must be created before canonical_answers (FK dependency).

CREATE TABLE IF NOT EXISTS moderators (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        UNIQUE NOT NULL,
  name        TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'moderator', -- 'moderator' | 'admin'
  invited_by  UUID        REFERENCES moderators(id) ON DELETE SET NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Service role only (moderator auth handled by Supabase Auth sessions)
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages moderators"
  ON moderators
  USING (true)
  WITH CHECK (true);


-- ── Canonical answers (with vector embeddings) ───────────────────────
-- Approved answers promoted by moderators. Stored with a 1536-dimension
-- embedding vector so new questions can be matched via cosine similarity.
-- A canonical hit skips the pipeline entirely — free and instant.

CREATE TABLE IF NOT EXISTS canonical_answers (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash  TEXT          UNIQUE NOT NULL, -- SHA-256 of normalized question
  question       TEXT          NOT NULL,
  answer_json    JSONB         NOT NULL,         -- approved BibleAnswer
  embedding      vector(1536)  NOT NULL,         -- Anthropic text-embedding-3-small
  approved_by    UUID          REFERENCES moderators(id) ON DELETE SET NULL,
  vote_count     INT           NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- IVFFlat index for fast approximate nearest-neighbor search.
-- lists=100 is appropriate for up to ~1M rows; tune as library grows.
CREATE INDEX IF NOT EXISTS canonical_answers_embedding_idx
  ON canonical_answers
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS canonical_answers_hash_idx
  ON canonical_answers (question_hash);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canonical_answers_updated_at
  BEFORE UPDATE ON canonical_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Public read (canonical answers are trusted, public content)
--      Service role write only
ALTER TABLE canonical_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read canonical answers"
  ON canonical_answers FOR SELECT
  USING (true);

CREATE POLICY "Service role can write canonical answers"
  ON canonical_answers FOR ALL
  WITH CHECK (true);


-- ── Flagged topics (admin-editable keyword list) ─────────────────────
-- Keywords that trigger automatic moderation flags on AI answers.
-- Admin can add/deactivate keywords via the mod dashboard.

CREATE TABLE IF NOT EXISTS flagged_topics (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword   TEXT    UNIQUE NOT NULL,
  category  TEXT    NOT NULL, -- e.g. 'salvation', 'eschatology', 'social'
  active    BOOLEAN NOT NULL DEFAULT true
);

-- Seed sensitive topic keywords
INSERT INTO flagged_topics (keyword, category) VALUES
  ('creation',            'cosmology'),
  ('evolution',           'cosmology'),
  ('hell',                'eschatology'),
  ('eternal punishment',  'eschatology'),
  ('end times',           'eschatology'),
  ('rapture',             'eschatology'),
  ('salvation',           'soteriology'),
  ('who is saved',        'soteriology'),
  ('women in ministry',   'ecclesiology'),
  ('women pastor',        'ecclesiology'),
  ('divorce',             'ethics'),
  ('remarriage',          'ethics'),
  ('baptism',             'sacraments'),
  ('infant baptism',      'sacraments'),
  ('is it a sin',         'ethics'),
  ('lgbtq',               'ethics'),
  ('homosexuality',       'ethics'),
  ('abortion',            'ethics'),
  ('purgatory',           'eschatology'),
  ('once saved always',   'soteriology')
ON CONFLICT (keyword) DO NOTHING;

-- RLS: Public read (needed client-side for pre-flight UX)
--      Service role write
ALTER TABLE flagged_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read flagged topics"
  ON flagged_topics FOR SELECT
  USING (active = true);

CREATE POLICY "Service role manages flagged topics"
  ON flagged_topics FOR ALL
  WITH CHECK (true);


-- ── Flags ────────────────────────────────────────────────────────────
-- Created when an answer is auto-flagged (keyword match) or manually
-- flagged by a user. Drives the moderator review queue.

CREATE TABLE IF NOT EXISTS flags (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id    UUID        NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  question     TEXT        NOT NULL,
  flag_type    TEXT        NOT NULL, -- 'auto' | 'user'
  flag_reason  TEXT,                 -- topic category or user-submitted note
  status       TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS flags_answer_id_idx ON flags (answer_id);
CREATE INDEX IF NOT EXISTS flags_status_idx    ON flags (status);

-- RLS: Service role only
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages flags"
  ON flags
  USING (true)
  WITH CHECK (true);


-- ── Moderation votes ─────────────────────────────────────────────────
-- One vote per moderator per flag. Votes may include a written correction
-- with Scripture references. Once threshold is reached (3 votes),
-- the answer is promoted to canonical or replaced with the correction.

CREATE TABLE IF NOT EXISTS moderation_votes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id         UUID        NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  moderator_id    UUID        NOT NULL REFERENCES moderators(id) ON DELETE CASCADE,
  vote            TEXT        NOT NULL,  -- 'accurate' | 'inaccurate'
  correction      TEXT,                  -- optional rewritten answer
  scripture_refs  TEXT[]      NOT NULL DEFAULT '{}', -- e.g. ["John 3:16", "Rom 5:8"]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (flag_id, moderator_id)         -- one vote per moderator per flag
);

CREATE INDEX IF NOT EXISTS moderation_votes_flag_id_idx ON moderation_votes (flag_id);

-- RLS: Service role only
ALTER TABLE moderation_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages moderation votes"
  ON moderation_votes
  USING (true)
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────
-- HELPER VIEWS
-- ─────────────────────────────────────────────────────────────────────

-- Pending moderation queue: flags with vote counts
CREATE OR REPLACE VIEW pending_flags AS
SELECT
  f.id            AS flag_id,
  f.answer_id,
  f.question,
  f.flag_type,
  f.flag_reason,
  f.status,
  f.created_at,
  COUNT(v.id)     AS vote_count,
  COUNT(v.id) FILTER (WHERE v.vote = 'accurate')   AS accurate_votes,
  COUNT(v.id) FILTER (WHERE v.vote = 'inaccurate') AS inaccurate_votes
FROM flags f
LEFT JOIN moderation_votes v ON v.flag_id = f.id
WHERE f.status = 'pending'
GROUP BY f.id
ORDER BY f.created_at ASC;


-- ─────────────────────────────────────────────────────────────────────
-- MAINTENANCE NOTES
-- ─────────────────────────────────────────────────────────────────────

-- 1. Rate limit cleanup (schedule via pg_cron or Supabase Edge Function):
--    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '2 hours';

-- 2. IVFFlat index requires at least 3x lists rows to train effectively.
--    Recreate index once canonical_answers exceeds ~300 rows:
--    DROP INDEX canonical_answers_embedding_idx;
--    CREATE INDEX ... (same definition above)

-- 3. pgvector extension must be enabled BEFORE running this schema:
--    Supabase Dashboard → Database → Extensions → search 'vector' → Enable
