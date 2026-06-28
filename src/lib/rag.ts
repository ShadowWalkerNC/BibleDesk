/**
 * rag.ts — Retrieval-Augmented Generation for BibleDesk
 *
 * Responsibilities:
 *   1. Generate a 1536-dim embedding for any text (OpenAI text-embedding-3-small)
 *   2. Search canonical_answers by vector cosine similarity (pgvector in Supabase)
 *   3. Return an exact cached answer OR a context string for pipeline Stage 1
 *
 * Embedding model: openai/text-embedding-3-small
 *   - 1536 dimensions, matches pgvector column size in schema
 *   - Cost: $0.02 / 1M tokens (~$0.000002 per question)
 *   - Requires OPENAI_API_KEY in env (server-only)
 *
 * NOTE: Anthropic does NOT provide an embeddings API — Voyage AI is a
 * separate company. OpenAI text-embedding-3-small is the standard choice
 * for 1536-dim pgvector RAG pipelines.
 *
 * SERVER ONLY — never import this from client components.
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import { getServerClient } from '@/lib/supabase';
import type { BibleAnswer } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

/** Embedding model — 1536 dims, matches pgvector column */
const EMBEDDING_MODEL = 'text-embedding-3-small';

/** Cosine similarity threshold to treat a match as "exact" (skip pipeline) */
const EXACT_MATCH_THRESHOLD = 0.97;

/** Cosine similarity threshold to include a match as RAG context */
const CONTEXT_MATCH_THRESHOLD = 0.75;

/** Max similar answers injected as context into Stage 1 */
const MAX_CONTEXT_MATCHES = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanonicalMatch {
  id: string;
  question: string;
  answer_json: BibleAnswer;
  similarity: number; // cosine similarity 0–1
}

export interface RAGResult {
  /** True if similarity >= EXACT_MATCH_THRESHOLD — skip the pipeline entirely */
  exactMatch: boolean;
  /** The cached BibleAnswer to return directly when exactMatch is true */
  exactAnswer: BibleAnswer | null;
  /** Top similar approved answers to inject as context (empty if exactMatch) */
  contextMatches: CanonicalMatch[];
  /** Formatted context string ready to inject into pipeline Stage 1 prompt */
  contextPrompt: string;
}

/** Shape of a row returned by the match_canonical_answers() Supabase RPC */
interface MatchRow {
  id: string;
  question: string;
  answer_json: BibleAnswer;
  similarity: number;
}

// ─── OpenAI client (lazy, server-only) ───────────────────────────────────────

let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ─── Embedding ────────────────────────────────────────────────────────────────

/**
 * Generate a 1536-dimension embedding for the given text.
 * Uses OpenAI text-embedding-3-small.
 *
 * Normalizes input: lowercase, collapse whitespace.
 * Cost: ~$0.000002 per call.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: normalized,
    encoding_format: 'float',
  });

  const vector = response.data[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('OpenAI embedding response did not contain a valid vector');
  }

  return vector;
}

// ─── Question normalization & hashing ────────────────────────────────────────

/**
 * Normalize a question for consistent hashing and embedding.
 * Strips punctuation, lowercases, collapses whitespace.
 */
export function normalizeQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * SHA-256 hash of a normalized question string.
 * Used as canonical_answers.question_hash for exact deduplication on upsert.
 */
export function hashQuestion(question: string): string {
  return crypto
    .createHash('sha256')
    .update(normalizeQuestion(question))
    .digest('hex');
}

// ─── Vector Search ────────────────────────────────────────────────────────────

/**
 * Search canonical_answers via pgvector cosine similarity.
 * Calls the match_canonical_answers() SQL function in Supabase.
 *
 * Required SQL (add to your Supabase schema or migration):
 *
 *   create or replace function match_canonical_answers(
 *     query_embedding vector(1536),
 *     match_threshold float,
 *     match_count int
 *   )
 *   returns table (
 *     id uuid,
 *     question text,
 *     answer_json jsonb,
 *     similarity float
 *   )
 *   language sql stable
 *   as $$
 *     select
 *       id,
 *       question,
 *       answer_json,
 *       1 - (embedding <=> query_embedding) as similarity
 *     from canonical_answers
 *     where 1 - (embedding <=> query_embedding) > match_threshold
 *     order by embedding <=> query_embedding
 *     limit match_count;
 *   $$;
 */
async function searchCanonicalAnswers(embedding: number[]): Promise<CanonicalMatch[]> {
  const supabase = getServerClient();

  const { data, error } = await supabase.rpc('match_canonical_answers', {
    query_embedding: embedding,
    match_threshold: CONTEXT_MATCH_THRESHOLD,
    match_count: MAX_CONTEXT_MATCHES + 1, // +1 to detect exact match at top
  });

  if (error) {
    console.error('[RAG] Vector search error:', error.message);
    return [];
  }

  return (data as MatchRow[]).map((row) => ({
    id: row.id,
    question: row.question,
    answer_json: row.answer_json,
    similarity: row.similarity,
  }));
}

// ─── RAG Orchestration ────────────────────────────────────────────────────────

/**
 * Main RAG function. Called by /api/ask before the pipeline runs.
 *
 * Flow:
 *   1. Generate embedding for the question
 *   2. Search canonical_answers by cosine similarity
 *   3. similarity >= EXACT_MATCH_THRESHOLD (0.97) → return cached answer
 *   4. similarity >= CONTEXT_MATCH_THRESHOLD (0.75) → build Stage 1 context
 *   5. No matches → return empty (pipeline runs cold)
 *
 * RAG failures NEVER crash the pipeline — they degrade to empty context.
 */
export async function runRAG(question: string): Promise<RAGResult> {
  const empty: RAGResult = {
    exactMatch: false,
    exactAnswer: null,
    contextMatches: [],
    contextPrompt: '',
  };

  try {
    const embedding = await generateEmbedding(question);
    const matches = await searchCanonicalAnswers(embedding);

    if (matches.length === 0) return empty;

    // Exact match — return the cached answer, skip the pipeline entirely
    const top = matches[0];
    if (top.similarity >= EXACT_MATCH_THRESHOLD) {
      console.log(`[RAG] Exact match (${(top.similarity * 100).toFixed(1)}%) — serving cached answer`);
      return {
        exactMatch: true,
        exactAnswer: top.answer_json,
        contextMatches: [],
        contextPrompt: '',
      };
    }

    // Context matches — inject into pipeline Stage 1
    const contextMatches = matches
      .filter((m) => m.similarity >= CONTEXT_MATCH_THRESHOLD)
      .slice(0, MAX_CONTEXT_MATCHES);

    if (contextMatches.length === 0) return empty;

    const contextPrompt = buildContextPrompt(contextMatches);
    console.log(`[RAG] ${contextMatches.length} context match(es) injected into Stage 1`);

    return {
      exactMatch: false,
      exactAnswer: null,
      contextMatches,
      contextPrompt,
    };
  } catch (err) {
    // RAG failure must never break the pipeline
    console.error('[RAG] runRAG failed, proceeding without context:', err);
    return empty;
  }
}

// ─── Context Prompt Builder ───────────────────────────────────────────────────

/**
 * Builds the moderator-approved context string injected at the top of
 * pipeline Stage 1. Claude treats these as grounding reference — it must
 * not contradict them without strong scriptural justification.
 */
function buildContextPrompt(matches: CanonicalMatch[]): string {
  const sections = matches.map((match, i) => {
    const citations = extractCitations(match.answer_json);
    return [
      `[Approved Reference ${i + 1}] (similarity: ${(match.similarity * 100).toFixed(0)}%)`,
      `Question: ${match.question}`,
      `Summary: ${match.answer_json?.summary ?? '(no summary)'}`,
      citations.length > 0 ? `Scripture used: ${citations.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [
    '══════════════════════════════════════════════════',
    'VERIFIED MODERATOR-APPROVED REFERENCE ANSWERS',
    'These answers were reviewed by human moderators',
    '(pastors and theologians). Use them as grounding.',
    'Do not contradict them without strong scriptural',
    'justification. Present evidence; let the reader conclude.',
    '══════════════════════════════════════════════════',
    '',
    sections.join('\n\n'),
    '',
    '══════════════════════════════════════════════════',
    'Now answer the current question to the same standard.',
    '══════════════════════════════════════════════════',
  ].join('\n');
}

/**
 * Extract all citation strings from a BibleAnswer's dimensions.
 * Returns a deduplicated flat array of reference strings.
 */
function extractCitations(answer: BibleAnswer): string[] {
  const citations: string[] = [];
  const dims = answer?.dimensions;
  if (!dims) return [];

  for (const dim of Object.values(dims)) {
    if (Array.isArray(dim?.citations)) {
      citations.push(...dim.citations);
    }
  }

  return [...new Set(citations)];
}

// ─── Canonical Answer Storage ─────────────────────────────────────────────────

/**
 * Upsert an approved answer into canonical_answers with its embedding.
 * Called by the moderation system when a flagged answer is approved.
 *
 * Uses question_hash as the conflict key so re-approving a question
 * updates the stored answer rather than duplicating it.
 *
 * @param question    Original question text
 * @param answer      The approved BibleAnswer object
 * @param approvedBy  UUID of the moderator
 */
export async function storeCanonicalAnswer(
  question: string,
  answer: BibleAnswer,
  approvedBy: string
): Promise<void> {
  const supabase = getServerClient();
  const embedding = await generateEmbedding(question);
  const questionHash = hashQuestion(question);

  const { error } = await supabase
    .from('canonical_answers')
    .upsert(
      {
        question_hash: questionHash,
        question,
        answer_json: answer,
        embedding,
        approved_by: approvedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'question_hash' }
    );

  if (error) {
    console.error('[RAG] storeCanonicalAnswer error:', error.message);
    throw new Error(`Failed to store canonical answer: ${error.message}`);
  }

  console.log(`[RAG] Stored canonical answer for: "${question.slice(0, 60)}..."`);
}
