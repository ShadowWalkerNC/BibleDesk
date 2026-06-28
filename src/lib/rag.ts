/**
 * rag.ts — Retrieval-Augmented Generation for BibleDesk
 *
 * Responsibilities:
 *   1. Generate a 1536-dim embedding for any text (Anthropic API)
 *   2. Search canonical_answers by vector cosine similarity (pgvector)
 *   3. Build a RAG context string injected into pipeline Stage 1
 *
 * SERVER ONLY — never import this from client components.
 * All Anthropic and Supabase calls require server-side env vars.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanonicalMatch {
  id: string;
  question: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answer_json: Record<string, any>;
  similarity: number; // cosine similarity 0–1
}

export interface RAGResult {
  /** True if an exact canonical match was found (skip pipeline entirely) */
  exactMatch: boolean;
  /** The exact canonical answer to return directly, if exactMatch is true */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exactAnswer: Record<string, any> | null;
  /** Top similar answers to inject as context (empty if exactMatch) */
  contextMatches: CanonicalMatch[];
  /** Formatted context string ready to inject into pipeline Stage 1 prompt */
  contextPrompt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Cosine similarity threshold above which we treat a match as "exact" */
const EXACT_MATCH_THRESHOLD = 0.97;

/** Cosine similarity threshold for including a match as RAG context */
const CONTEXT_MATCH_THRESHOLD = 0.75;

/** Maximum number of similar answers to inject as context */
const MAX_CONTEXT_MATCHES = 3;

// ─── Clients (lazy init — server only) ───────────────────────────────────────

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars are not set');
  return createClient(url, key);
}

// ─── Embedding ────────────────────────────────────────────────────────────────

/**
 * Generate a 1536-dimension embedding vector for the given text.
 * Uses Anthropic's voyage-3-lite model via the embeddings endpoint.
 * Cost: ~$0.0001 per call.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getAnthropicClient();

  // Normalize text: lowercase, collapse whitespace, strip punctuation edges
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');

  // Anthropic embeddings via the dedicated endpoint
  // @ts-expect-error — embeddings endpoint is available but not yet in all SDK typings
  const response = await client.embeddings.create({
    model: 'voyage-3-lite',
    input: normalized,
    input_type: 'query',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const embedding = (response as any).embeddings?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding response did not contain a valid vector');
  }

  return embedding as number[];
}

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
 * Used as the canonical_answers.question_hash for exact deduplication.
 */
export function hashQuestion(question: string): string {
  return crypto
    .createHash('sha256')
    .update(normalizeQuestion(question))
    .digest('hex');
}

// ─── Vector Search ────────────────────────────────────────────────────────────

/**
 * Search canonical_answers using pgvector cosine similarity.
 * Returns up to MAX_CONTEXT_MATCHES results above CONTEXT_MATCH_THRESHOLD.
 *
 * Supabase does not yet expose a native vector search RPC in the JS client,
 * so we call a raw SQL function via supabase.rpc().
 *
 * Required SQL function in Supabase (add to schema.sql):
 *   See match_canonical_answers() below — already included in schema.
 */
async function searchCanonicalAnswers(
  embedding: number[]
): Promise<CanonicalMatch[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('match_canonical_answers', {
    query_embedding: embedding,
    match_threshold: CONTEXT_MATCH_THRESHOLD,
    match_count: MAX_CONTEXT_MATCHES + 1, // +1 so we can detect exact matches
  });

  if (error) {
    console.error('[RAG] Vector search error:', error.message);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id as string,
    question: row.question as string,
    answer_json: row.answer_json as Record<string, unknown>,
    similarity: row.similarity as number,
  }));
}

// ─── RAG Orchestration ────────────────────────────────────────────────────────

/**
 * Main RAG function. Called by /api/ask before the pipeline runs.
 *
 * Flow:
 *   1. Generate embedding for the question
 *   2. Search canonical_answers by cosine similarity
 *   3. If similarity >= EXACT_MATCH_THRESHOLD → return exact answer (skip pipeline)
 *   4. If similarity >= CONTEXT_MATCH_THRESHOLD → build context prompt for Stage 1
 *   5. If no matches → return empty context (pipeline runs cold)
 */
export async function runRAG(question: string): Promise<RAGResult> {
  const empty: RAGResult = {
    exactMatch: false,
    exactAnswer: null,
    contextMatches: [],
    contextPrompt: '',
  };

  try {
    // Step 1: Generate embedding
    const embedding = await generateEmbedding(question);

    // Step 2: Vector search
    const matches = await searchCanonicalAnswers(embedding);

    if (matches.length === 0) return empty;

    // Step 3: Check for exact match
    const topMatch = matches[0];
    if (topMatch.similarity >= EXACT_MATCH_THRESHOLD) {
      return {
        exactMatch: true,
        exactAnswer: topMatch.answer_json,
        contextMatches: [],
        contextPrompt: '',
      };
    }

    // Step 4: Build context matches (exclude anything below threshold)
    const contextMatches = matches
      .filter((m) => m.similarity >= CONTEXT_MATCH_THRESHOLD)
      .slice(0, MAX_CONTEXT_MATCHES);

    if (contextMatches.length === 0) return empty;

    // Step 5: Build context prompt for pipeline Stage 1
    const contextPrompt = buildContextPrompt(contextMatches);

    return {
      exactMatch: false,
      exactAnswer: null,
      contextMatches,
      contextPrompt,
    };
  } catch (err) {
    // RAG failure must never break the pipeline — degrade gracefully
    console.error('[RAG] runRAG failed, proceeding without context:', err);
    return empty;
  }
}

// ─── Context Prompt Builder ───────────────────────────────────────────────────

/**
 * Builds the RAG context string injected at the top of pipeline Stage 1.
 * Instructs Claude to treat these as grounding reference, not to contradict
 * without strong scriptural justification.
 */
function buildContextPrompt(matches: CanonicalMatch[]): string {
  const sections = matches.map((match, i) => {
    const citations: string[] = extractCitations(match.answer_json);
    return [
      `[Approved Reference ${i + 1}]`,
      `Question: ${match.question}`,
      `Summary: ${match.answer_json?.summary ?? '(no summary)'}`,
      citations.length > 0 ? `Scripture used: ${citations.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [
    '══════════════════════════════════════════════════',
    'VERIFIED MODERATOR-APPROVED CONTEXT',
    'The following answers were reviewed and approved by',
    'human moderators (pastors and theologians). Use them',
    'as grounding reference. Do not contradict them without',
    'strong scriptural justification.',
    '══════════════════════════════════════════════════',
    '',
    sections.join('\n\n'),
    '',
    '══════════════════════════════════════════════════',
    'Answer the current question using the same standard',
    'of scriptural grounding. Present evidence and let',
    'the reader draw their own conclusion.',
    '══════════════════════════════════════════════════',
  ].join('\n');
}

/**
 * Extract all citation strings from a BibleAnswer JSON object.
 * Traverses the dimensions object looking for citations arrays.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCitations(answerJson: Record<string, any>): string[] {
  const citations: string[] = [];
  const dimensions = answerJson?.dimensions ?? {};
  for (const dim of Object.values(dimensions)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dimCitations = (dim as any)?.citations;
    if (Array.isArray(dimCitations)) {
      citations.push(...dimCitations);
    }
  }
  // Deduplicate
  return [...new Set(citations)];
}

// ─── Canonical Answer Storage ─────────────────────────────────────────────────

/**
 * Store an approved answer as a canonical answer with its embedding.
 * Called by the moderation system when a flag is approved.
 *
 * @param question  The original question text
 * @param answerJson  The approved BibleAnswer JSON object
 * @param approvedBy  UUID of the moderator who approved it
 */
export async function storeCanonicalAnswer(
  question: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  answerJson: Record<string, any>,
  approvedBy: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const embedding = await generateEmbedding(question);
  const questionHash = hashQuestion(question);

  const { error } = await supabase
    .from('canonical_answers')
    .upsert(
      {
        question_hash: questionHash,
        question,
        answer_json: answerJson,
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
}
