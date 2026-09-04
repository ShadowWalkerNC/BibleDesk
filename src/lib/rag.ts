/**
 * rag.ts — Retrieval-Augmented Generation for BibleDesk
 *
 * Responsibilities:
 *   1. Retrieve grounded historical Christian doctrines & catechisms (offline/instant)
 *   2. Generate a 1536-dim embedding for any text (OpenAI text-embedding-3-small)
 *   3. Search canonical_answers by vector cosine similarity (pgvector in Supabase)
 *   4. Return an exact cached answer OR a unified context string for pipeline Stage 1 & Stage 4
 *
 * Server-only — never import from client components.
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import { getServerClient } from '@/lib/supabase';
import type { BibleAnswer } from '@/types';
import { searchDoctrines } from '@/lib/doctrinesData';
import { searchCatechisms } from '@/lib/catechismData';

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
  /** Grounded doctrinal summaries and catechism questions */
  doctrinalContext?: string;
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

// ─── Doctrinal Retrieval (Offline / Zero-Cost) ─────────────────────────────────

/**
 * Searches local core doctrines, confessions, and catechisms to build a
 * high-authority theological grounding prompt for the pipeline.
 * Runs instantly in 0ms without requiring network or external API keys.
 */
export function findRelevantDoctrinalContext(question: string): string {
  const matchedDoctrines = searchDoctrines(question);
  const matchedCatechisms = searchCatechisms(question);

  if (matchedDoctrines.length === 0 && matchedCatechisms.length === 0) {
    return '';
  }

  const sections: string[] = [];

  if (matchedDoctrines.length > 0) {
    sections.push('── HISTORIC DOCTRINAL LOCI & CONFESSIONS ──');
    for (const doc of matchedDoctrines.slice(0, 2)) {
      const traditionBullets = doc.traditions
        .map(t => `  • ${t.tradition}: ${t.summary} (${t.confessionalBasis})`)
        .join('\n');

      sections.push(
        `[Locus: ${doc.locus}] ${doc.title}\n` +
        `Summary: ${doc.summary}\n` +
        `Historical Consensus: ${doc.historicalConsensus}\n` +
        `Scripture Proofs: ${doc.scriptureProofs.join(', ')}\n` +
        `Confessional Perspectives across Traditions:\n${traditionBullets}`
      );
    }
  }

  if (matchedCatechisms.length > 0) {
    sections.push('── HISTORIC CATECHISM Q&A ──');
    for (const item of matchedCatechisms.slice(0, 3)) {
      sections.push(
        `[${item.catechism} — ${item.tradition}] Q${item.question.number}: "${item.question.question}"\n` +
        `Answer: "${item.question.answer}"\n` +
        (item.question.proofTexts.length > 0 ? `Proof Texts: ${item.question.proofTexts.join(', ')}` : '')
      );
    }
  }

  return sections.join('\n\n');
}

// ─── Embedding ────────────────────────────────────────────────────────────────

/**
 * Generate a 1536-dimension embedding for the given text.
 * Uses OpenAI text-embedding-3-small.
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

export function normalizeQuestion(question: string): string {
  return question
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function hashQuestion(question: string): string {
  return crypto
    .createHash('sha256')
    .update(normalizeQuestion(question))
    .digest('hex');
}

// ─── Vector Search ────────────────────────────────────────────────────────────

async function searchCanonicalAnswers(embedding: number[]): Promise<CanonicalMatch[]> {
  const supabase = getServerClient();

  const { data, error } = await supabase.rpc('match_canonical_answers', {
    query_embedding: embedding,
    match_threshold: CONTEXT_MATCH_THRESHOLD,
    match_count: MAX_CONTEXT_MATCHES + 1,
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
 *   1. Retrieve local doctrinal/catechism grounding (instant, offline-ready)
 *   2. If OpenAI key available, generate question embedding and query Supabase
 *   3. If exact canonical match (>= 0.97), return cached answer immediately
 *   4. Merge canonical answers with doctrinal context for Stage 1 and Stage 4
 */
export async function runRAG(question: string): Promise<RAGResult> {
  const doctrinalContext = findRelevantDoctrinalContext(question);

  const fallbackResult: RAGResult = {
    exactMatch: false,
    exactAnswer: null,
    contextMatches: [],
    contextPrompt: doctrinalContext ? formatDoctrinalPrompt(doctrinalContext) : '',
    doctrinalContext,
  };

  // If OpenAI key is missing, return grounded doctrinal context immediately
  if (!process.env.OPENAI_API_KEY) {
    if (doctrinalContext) {
      console.log('[RAG] Offline/Local doctrinal grounding injected into pipeline');
    }
    return fallbackResult;
  }

  try {
    const embedding = await generateEmbedding(question);
    const matches = await searchCanonicalAnswers(embedding);

    if (matches.length === 0) return fallbackResult;

    // Exact match — return cached approved answer
    const top = matches[0];
    if (top.similarity >= EXACT_MATCH_THRESHOLD) {
      console.log(`[RAG] Exact match (${(top.similarity * 100).toFixed(1)}%) — serving cached answer`);
      return {
        exactMatch: true,
        exactAnswer: top.answer_json,
        contextMatches: [],
        contextPrompt: '',
        doctrinalContext,
      };
    }

    // Context matches — combine with doctrinal context
    const contextMatches = matches
      .filter((m) => m.similarity >= CONTEXT_MATCH_THRESHOLD)
      .slice(0, MAX_CONTEXT_MATCHES);

    const contextPrompt = buildCombinedPrompt(contextMatches, doctrinalContext);
    console.log(`[RAG] ${contextMatches.length} canonical match(es) + doctrinal grounding injected into Stage 1`);

    return {
      exactMatch: false,
      exactAnswer: null,
      contextMatches,
      contextPrompt,
      doctrinalContext,
    };
  } catch (err) {
    console.warn('[RAG] Vector RAG error, proceeding with local doctrinal grounding:', err);
    return fallbackResult;
  }
}

// ─── Context Prompt Builders ──────────────────────────────────────────────────

function formatDoctrinalPrompt(doctrinalContext: string): string {
  return [
    '══════════════════════════════════════════════════',
    'HISTORIC CHRISTIAN DOCTRINAL & CONFESSIONAL GROUNDING',
    'Use these verified historic confessions, catechisms,',
    'and scriptural proofs to ground the theological and',
    'historical dimensions of your answer. Fairly cite',
    'the traditions represented (e.g. Reformed, Lutheran,',
    'Baptist, Anglican, Wesleyan, Pentecostal).',
    '══════════════════════════════════════════════════',
    '',
    doctrinalContext,
    '',
    '══════════════════════════════════════════════════',
  ].join('\n');
}

function buildCombinedPrompt(matches: CanonicalMatch[], doctrinalContext?: string): string {
  const parts: string[] = [];

  if (matches.length > 0) {
    const canonicalSections = matches.map((match, i) => {
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

    parts.push(
      '══════════════════════════════════════════════════',
      'VERIFIED MODERATOR-APPROVED REFERENCE ANSWERS',
      'These answers were reviewed by human moderators',
      '(pastors and theologians). Use them as grounding.',
      '══════════════════════════════════════════════════',
      '',
      canonicalSections.join('\n\n'),
      ''
    );
  }

  if (doctrinalContext) {
    parts.push(formatDoctrinalPrompt(doctrinalContext));
  }

  return parts.join('\n');
}

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
