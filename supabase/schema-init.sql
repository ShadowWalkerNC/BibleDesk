-- =====================================================================
-- BibleDesk — Consolidated Turnkey Database Initialization (schema-init.sql)
--
-- This single file contains the entire schema for BibleDesk:
-- - Base tables (answers, rate_limits, moderators, canonical_answers)
-- - Moderation & RAG pgvector RPC functions
-- - Biblical Knowledge Graph & PrayerAtlas companion tables
-- - User Profiles, Verse Highlights, Verse Notes
-- - Canonical Prayer Requests (with geo, privacy, and escalation levels)
-- - Notification preferences & bookmarks
-- - Churches directory & creator profiles
-- - SaaS subscriptions & membership tier columns
--
-- Safe to execute on fresh projects or re-run on existing databases.
-- Generated: 2026-09-18T21:57:42.197Z
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- Updated: Phase 2 — Pipeline + RAG + Moderation
--
-- Order: 1 — apply first
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)

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

-- RLS: Service-role-only read/write. The app touches this table only via the
-- server client (src/lib/supabase.ts saveAnswer/getAnswerBySlug), so no
-- anon-key access is needed. Public share reads go through the /share/[slug]
-- server page (service role, bypasses RLS).
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read answers" ON answers;
DROP POLICY IF EXISTS "Service role can insert answers" ON answers;
DROP POLICY IF EXISTS "Service role can read answers" ON answers;

CREATE POLICY "Service role can read answers"
  ON answers FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert answers"
  ON answers FOR INSERT
  WITH CHECK (auth.role() = 'service_role'); -- Enforced via service role key — never anon key


-- ── Rate limits ───────────────────────────────────────────────────────
-- Anonymous IP-based rate limiting. IPs are SHA-256 hashed, never raw.

CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash      VARCHAR(64) PRIMARY KEY,
  count        INT         NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Service role only
-- B05: USING (true)/WITH CHECK (true) on FOR ALL was an open write/read for
-- any anon caller. All app access goes through getServerClient()
-- (src/lib/rate-limit.ts), so scope the policy to the service role.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages rate limits" ON rate_limits;

CREATE POLICY "Service role manages rate limits"
  ON rate_limits
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

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
-- B05: narrowed from USING (true) — the moderators table stores contact
-- emails, so anonymous callers must not be able to read it.
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages moderators" ON moderators;

CREATE POLICY "Service role manages moderators"
  ON moderators
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── Canonical answers (with vector embeddings) ───────────────────────
-- Approved answers promoted by moderators. Stored with a 1536-dimension
-- embedding vector so new questions can be matched via cosine similarity.
-- A canonical hit skips the pipeline entirely — free and instant.

CREATE TABLE IF NOT EXISTS canonical_answers (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash  TEXT          UNIQUE NOT NULL, -- SHA-256 of normalized question
  question       TEXT          NOT NULL,
  answer_json    JSONB         NOT NULL,         -- approved BibleAnswer
  embedding      vector(1536)  NOT NULL,         -- OpenAI text-embedding-3-small (1536 dims)
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

DROP POLICY IF EXISTS "Public can read canonical answers" ON canonical_answers;
DROP POLICY IF EXISTS "Service role can write canonical answers" ON canonical_answers;

CREATE POLICY "Public can read canonical answers"
  ON canonical_answers FOR SELECT
  USING (true);

CREATE POLICY "Service role can write canonical answers"
  ON canonical_answers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


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

DROP POLICY IF EXISTS "Public can read flagged topics" ON flagged_topics;
DROP POLICY IF EXISTS "Service role manages flagged topics" ON flagged_topics;

CREATE POLICY "Public can read flagged topics"
  ON flagged_topics FOR SELECT
  USING (active = true);

CREATE POLICY "Service role manages flagged topics"
  ON flagged_topics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


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
-- B05: narrowed from USING (true) — flag rows carry user-submitted notes.
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages flags" ON flags;

CREATE POLICY "Service role manages flags"
  ON flags
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


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
-- B05: narrowed from USING (true) — votes are internal moderation data.
ALTER TABLE moderation_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages moderation votes" ON moderation_votes;

CREATE POLICY "Service role manages moderation votes"
  ON moderation_votes
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


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

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v2.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — Schema v2 (Phase 2: Moderation + RAG)
-- Run this in the Supabase SQL editor AFTER schema.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
--
-- Order: 2 — apply after supabase/schema.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)
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

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v3.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — Schema v3 (Phase 3: Knowledge Graph)
-- Run in the Supabase SQL editor AFTER schema.sql and schema-v2.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
--
-- Order: 3 — apply after supabase/schema-v2.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)
--
-- New tables:
--   graph_nodes   — concepts extracted from questions/answers
--   graph_edges   — typed, confidence-weighted relationships between nodes
--
-- Inspired by graphify's extraction schema:
--   https://github.com/safishamsi/graphify
--   Node: { id, label, source_file, source_location }
--   Edge: { source, target, relation, confidence: EXTRACTED|INFERRED|AMBIGUOUS }

-- ─── 0. Extensions ──────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. graph_nodes ─────────────────────────────────────────────────────────
-- Each node is a biblical concept, person, place, theme, or doctrine.
-- source_type: 'question' | 'answer' | 'canonical' | 'obsidian'
-- source_id:   UUID of the originating answers / canonical_answers row

CREATE TABLE IF NOT EXISTS graph_nodes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_key      TEXT UNIQUE NOT NULL,         -- stable slug, e.g. "grace", "romans-8"
  label         TEXT NOT NULL,               -- human display name
  description   TEXT,                        -- short summary (1–2 sentences)
  category      TEXT NOT NULL DEFAULT 'concept'
    CHECK (category IN (
      'concept', 'doctrine', 'person', 'place',
      'book', 'theme', 'verse', 'question'
    )),
  source_type   TEXT NOT NULL DEFAULT 'answer'
    CHECK (source_type IN ('question', 'answer', 'canonical', 'obsidian')),
  source_id     UUID,                         -- FK resolved in application layer
  dimension     TEXT,                         -- BibleDesk dimension (scripture/historical/etc.)
  metadata      JSONB NOT NULL DEFAULT '{}',  -- arbitrary extra data
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS graph_nodes_node_key_idx  ON graph_nodes (node_key);
CREATE INDEX IF NOT EXISTS graph_nodes_category_idx  ON graph_nodes (category);
CREATE INDEX IF NOT EXISTS graph_nodes_source_id_idx ON graph_nodes (source_id);

-- ─── 2. graph_edges ─────────────────────────────────────────────────────────
-- Typed, directed relationships between two nodes.
-- relation:    vocabulary from graphify + BibleDesk-specific additions
-- confidence:  EXTRACTED | INFERRED | AMBIGUOUS  (directly from graphify)
-- weight:      0.0–1.0 relevance score written by the pipeline

CREATE TABLE IF NOT EXISTS graph_edges (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id     UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relation      TEXT NOT NULL
    CHECK (relation IN (
      -- structural
      'references', 'quotes', 'alludes_to',
      -- theological
      'supports', 'contradicts', 'qualifies', 'fulfills',
      -- topical
      'related_to', 'part_of', 'leads_to', 'contrasts_with',
      -- graphify standard
      'calls', 'imports', 'uses'
    )),
  confidence    TEXT NOT NULL DEFAULT 'INFERRED'
    CHECK (confidence IN ('EXTRACTED', 'INFERRED', 'AMBIGUOUS')),
  weight        FLOAT NOT NULL DEFAULT 0.5
    CHECK (weight >= 0.0 AND weight <= 1.0),
  label         TEXT,                         -- optional human-readable edge description
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, target_id, relation)     -- no duplicate typed edges
);

CREATE INDEX IF NOT EXISTS graph_edges_source_idx   ON graph_edges (source_id);
CREATE INDEX IF NOT EXISTS graph_edges_target_idx   ON graph_edges (target_id);
CREATE INDEX IF NOT EXISTS graph_edges_relation_idx ON graph_edges (relation);

-- ─── 3. RPC: subgraph for a given node (1-hop neighbourhood) ────────────────
-- Returns all edges + neighbour node IDs reachable from a given node in 1 hop.
-- Used by /api/graph?nodeKey=<slug> to build the focused subgraph.

CREATE OR REPLACE FUNCTION get_node_subgraph(root_node_id UUID)
RETURNS TABLE (
  edge_id     UUID,
  source_id   UUID,
  target_id   UUID,
  relation    TEXT,
  confidence  TEXT,
  weight      FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT e.id, e.source_id, e.target_id, e.relation, e.confidence, e.weight
  FROM graph_edges e
  WHERE e.source_id = root_node_id
     OR e.target_id = root_node_id;
$$;

-- ─── 4. updated_at trigger for graph_nodes ──────────────────────────────────
-- Reuses update_updated_at() function defined in schema-v2.sql

DROP TRIGGER IF EXISTS graph_nodes_updated_at ON graph_nodes;
CREATE TRIGGER graph_nodes_updated_at
  BEFORE UPDATE ON graph_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 5. Row Level Security ───────────────────────────────────────────────────
-- graph_nodes / graph_edges: public SELECT, service_role for writes

ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can explore the graph)
DROP POLICY IF EXISTS "graph_nodes_public_read" ON graph_nodes;
CREATE POLICY "graph_nodes_public_read"
  ON graph_nodes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "graph_edges_public_read" ON graph_edges;
CREATE POLICY "graph_edges_public_read"
  ON graph_edges FOR SELECT
  USING (true);

-- Writes are service_role only (no INSERT/UPDATE/DELETE policy = deny for anon)

-- ─── 6. Phase 2: PrayerAtlas companion tables ────────────────────────────────
-- NOTE (B04): this file previously defined public.prayer_requests with an
-- encrypted-atlas shape. That conflicted with the canonical definition in
-- schema-v4.sql (public board + geo columns), and the v4 CREATE TABLE IF NOT
-- EXISTS silently lost on fresh deploys. The canonical prayer_requests
-- definition now lives ONLY in schema-v4.sql; v4 shape + v7 geo columns wins.
-- prayer_engagements / prayer_updates reference it via FKs added in
-- schema-v4.sql (the table does not exist yet at this point in the chain).

CREATE TABLE IF NOT EXISTS missionary_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT,
  is_restricted_region BOOLEAN DEFAULT false,
  location_tier TEXT DEFAULT 'country_only',
  location_label TEXT,
  bio TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prayer_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK to public.prayer_requests is added in schema-v4.sql, where the
  -- canonical prayer_requests table is defined (it does not exist yet here).
  request_id UUID,
  action TEXT NOT NULL,
  user_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prayer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK to public.prayer_requests is added in schema-v4.sql (see above).
  request_id UUID,
  update_text TEXT,
  is_answered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE missionary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v4.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — Schema v4 (Phase 3: Church Tools & Auth)
-- Run in the Supabase SQL editor AFTER schema.sql, schema-v2.sql, and schema-v3.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
--
-- Order: 4 — apply after supabase/schema-v3.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)

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

-- RLS: Profiles hold personal details. Rows are visible only to the owning
-- user or an admin (profiles.role = 'admin'). B05: anonymous callers can no
-- longer read anyone's profile (was SELECT USING (true)).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles visible to owner and admins" ON public.profiles;
CREATE POLICY "Profiles visible to owner and admins" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

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
--
-- CANONICAL DEFINITION (B04): this is the single source of truth for
-- public.prayer_requests — v4 shape (public board). Geo/privacy columns are
-- added later by schema-v7.sql, 4-tier escalation columns by schema-v8.sql.
-- Do NOT add a second CREATE TABLE for this table in any other schema file.

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


-- ─── 2b. FK constraints for v3 prayer tables ───────────────────────────────
-- prayer_engagements / prayer_updates (schema-v3.sql) reference
-- public.prayer_requests; the FKs are added here because the canonical
-- table is defined in this file. Idempotent via pg_constraint checks.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prayer_engagements_request_id_fkey'
  ) THEN
    ALTER TABLE public.prayer_engagements
      ADD CONSTRAINT prayer_engagements_request_id_fkey
      FOREIGN KEY (request_id) REFERENCES public.prayer_requests(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prayer_updates_request_id_fkey'
  ) THEN
    ALTER TABLE public.prayer_updates
      ADD CONSTRAINT prayer_updates_request_id_fkey
      FOREIGN KEY (request_id) REFERENCES public.prayer_requests(id);
  END IF;
END $$;


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

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v5.sql
-- ─────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v6.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — Schema v6 (Phase 3C: User-Scoped Bookmarks & RLS Audit)
-- Run in the Supabase SQL editor AFTER schema-v5.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
--
-- Order: 6 — apply after supabase/schema-v5.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)

-- ─── 1. Bookmarks Table with Strict User RLS ────────────────────────────────
-- Stores user-saved 5-dimension AI study answers and shared insights.
-- Every row is strictly linked to auth.users(id) and isolated via RLS.

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_id    TEXT NOT NULL,
  share_slug   TEXT NOT NULL,
  question     TEXT NOT NULL,
  summary      TEXT,
  translation  TEXT,
  confidence   TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index per user and answer so users cannot double-bookmark the same answer
CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_answer_idx 
  ON public.bookmarks(user_id, answer_id);

CREATE INDEX IF NOT EXISTS bookmarks_user_created_idx 
  ON public.bookmarks(user_id, created_at DESC);

-- Enable Row-Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own bookmarks
DROP POLICY IF EXISTS "Users can read own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can read own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own bookmarks
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own bookmarks
DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can update own bookmarks" ON public.bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own bookmarks
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 2. Full Security Audit & RLS Verification Across All User Tables ─────────
-- Verifies that RLS is unconditionally enabled on every user-scoped table.

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verse_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verse_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sermon_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prayer_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Ensure indexes exist on foreign keys for fast RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_verse_highlights_user ON public.verse_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_verse_notes_user ON public.verse_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_sermon_notes_user ON public.sermon_notes(user_id);

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v7.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — Schema v7 (Phase 3D: 2D PrayerAtlas Geolocation & Category Attributes)
-- Run in the Supabase SQL editor AFTER schema-v6.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
--
-- Order: 7 — apply after supabase/schema-v6.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)

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

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v8.sql
-- ─────────────────────────────────────────────────────────────────────

-- ==============================================================================
-- BibleDesk Schema Migration v8 — Church Integrations & 4-Tier Prayer Escalation
-- Applies on top of schema-v7.sql
--
-- Order: 8 — apply after supabase/schema-v7.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)
-- ==============================================================================

-- 1. Churches Directory & Ministry Profiles
CREATE TABLE IF NOT EXISTS public.churches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  denomination TEXT,
  city TEXT,
  state_province TEXT,
  country TEXT,
  website TEXT,
  contact_email TEXT,
  phone TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 1,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast invite code lookups
CREATE INDEX IF NOT EXISTS idx_churches_invite_code ON public.churches(invite_code);
CREATE INDEX IF NOT EXISTS idx_churches_city_country ON public.churches(city, country);

-- 2. Church Members Link
CREATE TABLE IF NOT EXISTS public.church_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id TEXT REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('pastor', 'elder', 'staff', 'intercessor', 'member')),
  email TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_church_members_user ON public.church_members(user_id);
CREATE INDEX IF NOT EXISTS idx_church_members_church ON public.church_members(church_id);

-- 3. Extend prayers table with 4-tier escalation & church linkage
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS escalation_level TEXT DEFAULT 'private' CHECK (escalation_level IN ('private', 'circle', 'church', 'atlas')),
  ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'urgent', 'crisis')),
  ADD COLUMN IF NOT EXISTS church_id TEXT REFERENCES public.churches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_prayers_escalation ON public.prayer_requests(escalation_level);
CREATE INDEX IF NOT EXISTS idx_prayers_church_id ON public.prayer_requests(church_id);
CREATE INDEX IF NOT EXISTS idx_prayers_urgency ON public.prayer_requests(urgency_level);

-- 4. Enable RLS
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_members ENABLE ROW LEVEL SECURITY;

-- Churches: directory rows carry contact_email / phone / invite_code.
-- B05: SELECT is restricted to the church's admin (admin_user_id). The app
-- serves public directory reads through the /api/church server route
-- (service role, bypasses RLS), so no client ever needs anon-key SELECT.
DROP POLICY IF EXISTS "Public can view churches" ON public.churches;
DROP POLICY IF EXISTS "Church admins can view church profile" ON public.churches;
CREATE POLICY "Church admins can view church profile"
  ON public.churches FOR SELECT
  USING (auth.uid() = admin_user_id);

DROP POLICY IF EXISTS "Admins can manage church profile" ON public.churches;
CREATE POLICY "Admins can manage church profile"
  ON public.churches FOR ALL
  USING (auth.uid() = admin_user_id);

-- Church Members: Church members can view their church roster
DROP POLICY IF EXISTS "Members can view church roster" ON public.church_members;
CREATE POLICY "Members can view church roster"
  ON public.church_members FOR SELECT
  USING (
    church_id IN (
      SELECT church_id FROM public.church_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own membership" ON public.church_members;
CREATE POLICY "Users can manage own membership"
  ON public.church_members FOR ALL
  USING (auth.uid() = user_id);

-- Prayers Church Escalation RLS:
-- Church members can view prayers escalated to their church
DROP POLICY IF EXISTS "Church members view church-escalated prayers" ON public.prayer_requests;
CREATE POLICY "Church members view church-escalated prayers"
  ON public.prayer_requests FOR SELECT
  USING (
    escalation_level = 'church' AND
    church_id IN (
      SELECT church_id FROM public.church_members WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v9.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — Schema v9: Christian Creator Profiles
-- Link-in-bio, ministry profiles, and external patronage support
--
-- Order: 9 — apply after supabase/schema-v8.sql
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)

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
-- B05: added DROP POLICY IF EXISTS for re-run safety (no semantics change).
DROP POLICY IF EXISTS "Anyone can view active creator profiles" ON public.creator_profiles;
CREATE POLICY "Anyone can view active creator profiles"
  ON public.creator_profiles
  FOR SELECT
  USING (is_active = TRUE);

-- Authenticated creators can manage their own profile
DROP POLICY IF EXISTS "Creators can insert their own profile" ON public.creator_profiles;
CREATE POLICY "Creators can insert their own profile"
  ON public.creator_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators can update their own profile" ON public.creator_profiles;
CREATE POLICY "Creators can update their own profile"
  ON public.creator_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators can delete their own profile" ON public.creator_profiles;
CREATE POLICY "Creators can delete their own profile"
  ON public.creator_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- FILE: schema-v10-public-prayer.sql
-- ─────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────
-- FILE: rpc.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — Supabase RPC Functions
-- Run this in: Supabase Dashboard → SQL Editor
-- Required by rag.ts for pgvector similarity search
--
-- Order: 10 — apply after supabase/schema-v9.sql (needs canonical_answers
-- from schema.sql/schema-v2.sql and the pgvector extension)
-- (canonical chain: schema.sql → schema-v2.sql → schema-v3.sql → schema-v4.sql
--  → schema-v5.sql → schema-v6.sql → schema-v7.sql → schema-v8.sql
--  → schema-v9.sql → rpc.sql; see supabase/README.md)

-- ── match_canonical_answers ───────────────────────────────────────────
-- Called by rag.ts → searchCanonicalAnswers()
-- Returns rows from canonical_answers ordered by cosine similarity.
-- query_embedding : the 1536-dim vector for the incoming question
-- match_threshold : minimum similarity to include (e.g. 0.75)
-- match_count     : maximum rows to return

CREATE OR REPLACE FUNCTION match_canonical_answers(
  query_embedding vector(1536),
  match_threshold float,
  match_count     int
)
RETURNS TABLE (
  id          uuid,
  question    text,
  answer_json jsonb,
  similarity  float
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

-- Grant execute to service role (anon never calls this directly)
GRANT EXECUTE ON FUNCTION match_canonical_answers TO service_role;

-- ─────────────────────────────────────────────────────────────────────
-- FILE: migrations/20260918_saas_subscriptions.sql
-- ─────────────────────────────────────────────────────────────────────

-- BibleDesk — SaaS Subscriptions Migration
-- Adds subscription tier and billing metadata to public.profiles
-- Safe to re-run: uses DO $$ / column existence checks

DO $$
BEGIN
  -- subscription_tier
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free'
      CHECK (subscription_tier IN ('free', 'pro', 'ministry', 'lifetime'));
  END IF;

  -- subscription_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active'
      CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing'));
  END IF;

  -- stripe_customer_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
  END IF;

  -- stripe_subscription_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_subscription_id TEXT;
  END IF;

  -- subscription_current_period_end
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_current_period_end'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_current_period_end TIMESTAMPTZ;
  END IF;
END $$;

-- Create index on stripe_customer_id for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Ensure reliable upserting of personal notes per user and verse reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_verse_notes_user_ref ON public.verse_notes(user_id, reference);
