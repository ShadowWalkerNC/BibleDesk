-- BibleDesk — Supabase RPC Functions
-- Run this in: Supabase Dashboard → SQL Editor
-- Required by rag.ts for pgvector similarity search

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
