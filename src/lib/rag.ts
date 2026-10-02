/**
 * rag.ts — Retrieval-Augmented Generation for BibleDesk
 *
 * Responsibilities:
 *   1. Retrieve grounded historical Christian doctrines & catechisms (offline/instant)
 *   2. Generate a 1536-dim embedding for any text (OpenAI text-embedding-3-small)
 *   3. Search canonical_answers by vector cosine similarity (pgvector in Railway PostgreSQL)
 *   4. Return an exact cached answer OR a unified context string for pipeline Stage 1 & Stage 4
 *
 * Server-only — never import from client components.
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import { getDb } from '@/db';
import { sql } from 'drizzle-orm';
import type { BibleAnswer } from '@/types';
import { searchDoctrines } from '@/lib/doctrinesData';
import { searchCatechisms } from '@/lib/catechismData';

// ─── Config ───────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EXACT_MATCH_THRESHOLD = 0.97;
const CONTEXT_MATCH_THRESHOLD = 0.75;
const MAX_CONTEXT_MATCHES = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanonicalMatch {
  id: string;
  question: string;
  answer_json: BibleAnswer;
  similarity: number;
}

export interface RAGResult {
  exactMatch: boolean;
  exactAnswer: BibleAnswer | null;
  contextMatches: CanonicalMatch[];
  contextPrompt: string;
  doctrinalContext?: string;
}

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

// ─── Vector Search (pgvector via raw SQL) ────────────────────────────────────

async function searchCanonicalAnswers(embedding: number[]): Promise<CanonicalMatch[]> {
  try {
    const db = await getDb();
    // pgvector cosine similarity via raw SQL
    // Requires: CREATE EXTENSION IF NOT EXISTS vector;
    // and canonical_answers.embedding column type = vector(1536)
    const vectorLiteral = `[${embedding.join(',')}]`;
    const rows = await db.execute(sql`
      SELECT id, question, answer_json,
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM canonical_answers
      WHERE 1 - (embedding <=> ${vectorLiteral}::vector) >= ${CONTEXT_MATCH_THRESHOLD}
      ORDER BY similarity DESC
      LIMIT ${MAX_CONTEXT_MATCHES + 1}
    `);

    return (rows.rows as unknown as MatchRow[]).map((row) => ({
      id: row.id,
      question: row.question,
      answer_json: row.answer_json,
      similarity: Number(row.similarity),
    }));
  } catch (err) {
    // pgvector may not be available — fall back gracefully
    console.warn('[RAG] Vector search unavailable (pgvector not installed or column missing):', err);
    return [];
  }
}

// ─── RAG Orchestration ────────────────────────────────────────────────────────

export async function runRAG(question: string): Promise<RAGResult> {
  const doctrinalContext = findRelevantDoctrinalContext(question);

  const fallbackResult: RAGResult = {
    exactMatch: false,
    exactAnswer: null,
    contextMatches: [],
    contextPrompt: doctrinalContext ? formatDoctrinalPrompt(doctrinalContext) : '',
    doctrinalContext,
  };

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
  const db = await getDb();
  const embedding = await generateEmbedding(question);
  const questionHash = hashQuestion(question);
  const vectorLiteral = `[${embedding.join(',')}]`;

  // Upsert with pgvector column via raw SQL (Drizzle doesn't have native vector type)
  await db.execute(sql`
    INSERT INTO canonical_answers (id, question_hash, question, answer_json, embedding, approved_by, updated_at)
    VALUES (
      gen_random_uuid()::text,
      ${questionHash},
      ${question},
      ${JSON.stringify(answer)}::jsonb,
      ${vectorLiteral}::vector,
      ${approvedBy},
      NOW()
    )
    ON CONFLICT (question_hash) DO UPDATE SET
      question    = EXCLUDED.question,
      answer_json = EXCLUDED.answer_json,
      embedding   = EXCLUDED.embedding,
      approved_by = EXCLUDED.approved_by,
      updated_at  = EXCLUDED.updated_at
  `);

  console.log(`[RAG] Stored canonical answer for: "${question.slice(0, 60)}..."`);
}
