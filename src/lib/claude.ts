/**
 * claude.ts — Anthropic Claude client entry point (SERVER ONLY)
 *
 * SECURITY: This file must NEVER be imported from client components.
 * The API key lives only in process.env on the server.
 *
 * In Phase 2 this module is a thin wrapper around the 6-stage pipeline.
 * The public interface (generateBibleAnswer) is UNCHANGED so that
 * /api/ask/route.ts and /api/v1/bible/answer/route.ts need no edits.
 *
 * Phase 1 single-shot logic is preserved below as generateBibleAnswerLegacy
 * for reference / rollback only — it is not called in production.
 */

import type { BibleAnswer, TranslationId } from '@/types';
import { runPipeline } from '@/lib/pipeline';

export interface ClaudeAnswerOptions {
  translation?: TranslationId;
  maxTokens?: number;
  /** RAG context string from rag.ts — injected into pipeline Stage 1 */
  ragContext?: string;
}

/**
 * Generate a structured, 5-dimension Bible answer.
 *
 * Phase 2: delegates to the 6-stage pipeline in pipeline.ts.
 * Returns the same BibleAnswer shape as Phase 1 — no breaking changes.
 *
 * SERVER ONLY — never call from client components.
 */
export async function generateBibleAnswer(
  question: string,
  options: ClaudeAnswerOptions = {}
): Promise<BibleAnswer> {
  const { translation = 'web', maxTokens = 4096, ragContext = '' } = options;

  const result = await runPipeline(question, {
    translation,
    maxTokens,
    ragContext,
  });

  return result.answer;
}

/**
 * generateBibleAnswerLegacy — Phase 1 single-shot implementation.
 * NOT called in production. Kept for reference and emergency rollback.
 * To rollback: swap the body of generateBibleAnswer above to call this.
 */
export async function generateBibleAnswerLegacy(
  question: string,
  options: ClaudeAnswerOptions = {}
): Promise<BibleAnswer> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const { v4: uuidv4 } = await import('uuid');
  const { translation = 'web', maxTokens = 4096 } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey });

  const SYSTEM_PROMPT = `You are BibleDesk — a trusted, scholarly Bible study assistant.
Your purpose is to give structured, sourced, multi-dimensional answers to Bible questions.

RULES:
1. Answer ONLY from scripture and well-established biblical scholarship.
2. Every claim must be traceable to a specific Bible reference.
3. Do NOT invent, speculate, or add content beyond what scripture and scholarship support.
4. Be respectful of all Christian traditions (Protestant, Catholic, Orthodox).
5. Remain neutral on denominational disputes — present the range of views.
6. If a question cannot be answered from scripture, say so clearly.
7. Write for a broad audience: pastors, youth groups, and curious newcomers alike.
8. Citations must use standard format: Book Chapter:Verse (e.g., John 3:16, Romans 8:28-30).

OUTPUT FORMAT:
You MUST respond with valid JSON matching this exact schema. No markdown, no explanation — pure JSON only.

{
  "summary": "1-2 sentence overview of the answer",
  "dimensions": {
    "scripture": { "title": "...", "content": "...", "citations": [...], "key_points": [...] },
    "historical": { "title": "...", "content": "...", "citations": [...], "key_points": [...] },
    "original_language": { "title": "...", "content": "...", "citations": [...], "key_points": [...] },
    "theological": { "title": "...", "content": "...", "citations": [...], "key_points": [...] },
    "practical": { "title": "...", "content": "...", "citations": [...], "key_points": [...] }
  },
  "confidence": "high | medium | low",
  "disclaimer": "Optional"
}`;

  const userMessage = `Question: ${question}\n\nPreferred translation: ${translation.toUpperCase()}.`;

  const firstResponse = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const firstContent = firstResponse.content[0];
  if (firstContent.type !== 'text') throw new Error('Unexpected Claude response type');

  function stripAndParse(text: string) {
    try { return JSON.parse(text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()); }
    catch { return null; }
  }

  let parsed = stripAndParse(firstContent.text);
  if (!parsed) {
    const retry = await client.messages.create({
      model: 'claude-sonnet-4-5', max_tokens: maxTokens, system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: firstContent.text },
        { role: 'user', content: 'Return ONLY valid JSON. Start with { end with }.' },
      ],
    });
    const rc = retry.content[0];
    if (rc.type !== 'text') throw new Error('Unexpected type on retry');
    parsed = stripAndParse(rc.text);
    if (!parsed) throw new Error('Invalid JSON after retry');
  }

  return {
    id: uuidv4(),
    question,
    summary: parsed.summary,
    dimensions: parsed.dimensions,
    translation_used: translation,
    confidence: parsed.confidence ?? 'medium',
    disclaimer: parsed.disclaimer,
    status: 'approved',
    created_at: new Date().toISOString(),
  };
}
