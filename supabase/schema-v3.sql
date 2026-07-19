-- BibleDesk — Schema v3 (Phase 3: Knowledge Graph)
-- Run in the Supabase SQL editor AFTER schema.sql and schema-v2.sql
-- Safe to re-run: uses IF NOT EXISTS / DO $$ blocks throughout
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

-- ─── 6. Phase 2: PrayerAtlas Schema ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version INT NOT NULL DEFAULT 1,
  key_version INT,
  text_ciphertext TEXT,
  wrapped_dek TEXT,
  nonce TEXT,
  text_plain TEXT,
  location_tier TEXT NOT NULL DEFAULT 'country_only',
  location_label TEXT,
  is_restricted_region BOOLEAN NOT NULL DEFAULT false,
  urgency TEXT DEFAULT 'normal',
  category TEXT DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  submitter_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

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
  request_id UUID REFERENCES prayer_requests(id),
  action TEXT NOT NULL,
  user_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prayer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES prayer_requests(id),
  update_text TEXT,
  is_answered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE missionary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_updates ENABLE ROW LEVEL SECURITY;

-- Policies for prayer_requests
DROP POLICY IF EXISTS "public can read published requests" ON prayer_requests;
CREATE POLICY "public can read published requests"
  ON prayer_requests FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "moderators can read all" ON prayer_requests;
CREATE POLICY "moderators can read all"
  ON prayer_requests FOR SELECT
  USING (auth.role() = 'moderator');

DROP POLICY IF EXISTS "anyone can insert pending" ON prayer_requests;
CREATE POLICY "anyone can insert pending"
  ON prayer_requests FOR INSERT
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "only moderators can update status" ON prayer_requests;
CREATE POLICY "only moderators can update status"
  ON prayer_requests FOR UPDATE
  USING (auth.role() = 'moderator');

