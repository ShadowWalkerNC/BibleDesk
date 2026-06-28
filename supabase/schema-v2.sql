-- BibleDesk — Schema v2 (Phase 2: Moderation + RAG)
-- Run this in the Supabase SQL editor AFTER schema.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
--
-- New tables:
--   moderators          — invited pastors/theologians with Supabase Auth
--   flagged_topics      — admin-editable sensitive keyword list
--   flags               — per-answer review triggers (auto + user)
--   moderation_votes    — one vote per moderator per flag
--   canonical_answers   — approved answers with pgvector embeddings
--
-- Modified tables:
--   answers             — adds status column ('approved' | 'under_review')

-- ─── 0. Extensions ──────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector (enable in Supabase dashboard first)

-- ─── 1. Patch existing tables ───────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'answers' AND column_name = 'status'
  ) THEN
    ALTER TABLE answers ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'
      CHECK (status IN ('approved', 'under_review'));
  END IF;
END $$;

-- ─── 2. moderators ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moderators (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE,                            -- Supabase Auth user.id (set after invite accepted)
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'moderator'
                CHECK (role IN ('moderator', 'admin')),
  invited_by  UUID REFERENCES moderators(id) ON DELETE SET NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: first admin must be inserted manually (no invited_by)
-- INSERT INTO moderators (email, name, role) VALUES ('admin@example.com', 'Admin', 'admin');

-- ─── 3. flagged_topics ──────────────────────────────────────────────────────
-- Admin-editable list of sensitive keywords that trigger auto-flagging.

CREATE TABLE IF NOT EXISTS flagged_topics (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword   TEXT UNIQUE NOT NULL,
  category  TEXT NOT NULL,
  active    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: initial sensitive topic list (matches ARCHITECTURE.md §7)
INSERT INTO flagged_topics (keyword, category) VALUES
  ('creation',              'doctrine'),
  ('evolution',             'doctrine'),
  ('hell',                  'eschatology'),
  ('eternal punishment',    'eschatology'),
  ('who is saved',          'soteriology'),
  ('salvation',             'soteriology'),
  ('women in ministry',     'ecclesiology'),
  ('end times',             'eschatology'),
  ('eschatology',           'eschatology'),
  ('lgbtq',                 'ethics'),
  ('homosexual',            'ethics'),
  ('same-sex',              'ethics'),
  ('divorce',               'ethics'),
  ('remarriage',            'ethics'),
  ('baptism',               'sacraments'),
  ('infant baptism',        'sacraments'),
  ('purgatory',             'eschatology'),
  ('catholic',              'ecclesiology'),
  ('orthodox',              'ecclesiology'),
  ('is it a sin',           'ethics'),
  ('predestination',        'soteriology'),
  ('free will',             'soteriology'),
  ('rapture',               'eschatology'),
  ('tongues',               'charismatic'),
  ('speaking in tongues',   'charismatic')
ON CONFLICT (keyword) DO NOTHING;

-- ─── 4. flags ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  answer_id   UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  flag_type   TEXT NOT NULL CHECK (flag_type IN ('auto', 'user')),
  flag_reason TEXT,                        -- keyword matched or user note
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flags_answer_id_idx  ON flags (answer_id);
CREATE INDEX IF NOT EXISTS flags_status_idx     ON flags (status);

-- ─── 5. moderation_votes ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moderation_votes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id         UUID NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  moderator_id    UUID NOT NULL REFERENCES moderators(id) ON DELETE CASCADE,
  vote            TEXT NOT NULL CHECK (vote IN ('accurate', 'inaccurate')),
  correction      TEXT,                    -- optional written correction
  scripture_refs  TEXT[],                  -- Scripture backing the correction
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flag_id, moderator_id)           -- one vote per moderator per flag
);

CREATE INDEX IF NOT EXISTS mod_votes_flag_id_idx ON moderation_votes (flag_id);

-- ─── 6. canonical_answers (pgvector) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS canonical_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_hash   TEXT UNIQUE NOT NULL,     -- SHA-256 of normalized question
  question        TEXT NOT NULL,
  answer_json     JSONB NOT NULL,            -- approved BibleAnswer
  embedding       vector(1536),             -- pgvector: question embedding
  approved_by     UUID REFERENCES moderators(id) ON DELETE SET NULL,
  vote_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IVFFlat index for cosine similarity search (pgvector)
-- Rebuild with higher lists= once table exceeds ~10k rows
CREATE INDEX IF NOT EXISTS canonical_answers_embedding_idx
  ON canonical_answers
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS canonical_answers_hash_idx
  ON canonical_answers (question_hash);

-- RPC: vector similarity search used by rag.ts
CREATE OR REPLACE FUNCTION match_canonical_answers (
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count     INT
)
RETURNS TABLE (
  id            UUID,
  question      TEXT,
  answer_json   JSONB,
  similarity    FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    question,
    answer_json,
    1 - (embedding <=> query_embedding) AS similarity
  FROM canonical_answers
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─── 7. Row Level Security ───────────────────────────────────────────────────
-- All moderation tables: service_role only (no public access)

ALTER TABLE moderators         ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_topics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_votes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_answers  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default — no explicit policies needed.
-- Add moderator-facing SELECT policies here when /mod UI is auth-gated.

-- ─── 8. updated_at trigger for canonical_answers ────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS canonical_answers_updated_at ON canonical_answers;
CREATE TRIGGER canonical_answers_updated_at
  BEFORE UPDATE ON canonical_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
