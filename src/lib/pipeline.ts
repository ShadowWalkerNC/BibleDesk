/**
 * pipeline.ts — 6-Stage Answer Pipeline for BibleDesk
 *
 * The pipeline replaces the single-shot Claude call.
 * Each stage builds on the last, grounding the final answer in
 * verified Scripture and historical Christian teaching.
 *
 * The AI acts as a pastor presenting evidence — never declaring
 * the answer. The reader draws their own conclusion.
 *
 * Stage 1: Classify     — topic, testament, doctrine area, sensitivity
 * Stage 2: Scripture    — fetch real verse text from bible-api.com
 * Stage 3: Accuracy     — verify verses are used in proper context
 * Stage 4: Historical   — Church Fathers, orthodox teaching, traditions
 * Stage 5: Synthesis    — theological reasoning, tensions, contradictions
 * Stage 6: Assembly     — compose final BibleAnswer JSON
 *
 * SERVER ONLY — never import from client components.
 */

import type { BibleAnswer, TranslationId } from '@/types';
import { fetchPassages } from '@/lib/bible';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClassificationResult {
  topic_type: string;
  testaments: string[];
  books: string[];
  doctrine_area: string;
  sensitivity_level: 'low' | 'medium' | 'high';
  auto_flag: boolean;
  candidate_verses: string[];
}

export interface VerifiedVerse {
  reference: string;
  text: string;
  relevant: boolean;
  context_note?: string;
}

export interface PipelineStageResult {
  stage: number;
  name: string;
  duration_ms: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: Record<string, any>;
}

export interface PipelineResult {
  answer: BibleAnswer;
  stages: PipelineStageResult[];
  total_ms: number;
}

export interface PipelineOptions {
  translation?: TranslationId;
  ragContext?: string;
  maxTokens?: number;
  /** Called after each stage completes — used by the SSE stream route */
  onStageComplete?: (stage: number, name: string, duration_ms: number) => void;
}

// ─── Gemini Client Integration ───────────────────────────────────────────────

import { callGemini } from './gemini';

async function callClaude(
  system: string,
  userMessage: string,
  maxTokens = 1024
): Promise<string> {
  void maxTokens;
  try {
    return await callGemini(system, userMessage);
  } catch (err: any) {
    if (err.message && err.message.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('AI Assistant is currently offline due to rate-limits or depleted credits. Please try again later.');
    }
    throw err;
  }
}

function tryParseJSON<T>(text: string): T | null {
  try {
    const stripped = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(stripped) as T;
  } catch {
    return null;
  }
}

// ─── Stage Prompts ──────────────────────────────────────────────────────────

const BASE_IDENTITY = `You are BibleDesk — a scholarly Bible study assistant.
Your role is that of a pastor: you present scriptural evidence and historical
Christian teaching so the reader can draw their own informed conclusion.
You never declare a definitive answer on matters of faith — you illuminate the evidence.
All claims must be traceable to Scripture or established Church history.
Never speculate. Never invent citations.`;

const STAGE1_SYSTEM = `${BASE_IDENTITY}

Your task: Classify the incoming Bible question.
Return ONLY valid JSON. No markdown. No explanation.

{
  "topic_type": "string — short topic label (e.g. salvation, prayer, creation)",
  "testaments": ["Old Testament" and/or "New Testament"],
  "books": ["array of Bible books most relevant to this question"],
  "doctrine_area": "string — theological category (e.g. soteriology, eschatology, ecclesiology, christology, ethics)",
  "sensitivity_level": "low | medium | high",
  "candidate_verses": ["array of 5-10 specific verse references most relevant to this question, e.g. John 3:16"]
}`;

const STAGE3_SYSTEM = `${BASE_IDENTITY}

You will receive a list of Bible verses with their actual text.
Your task: Evaluate each verse for accuracy and context.

For each verse assess:
1. Does this verse actually address the question when read in full context?
2. Is it being taken out of context (proof-texting)?
3. What does the surrounding passage clarify?

Return ONLY valid JSON. No markdown.

{
  "verified_verses": [
    {
      "reference": "Book Chapter:Verse",
      "relevant": true | false,
      "context_note": "Optional: warning if verse is commonly misused or needs context"
    }
  ]
}`;

const STAGE4_SYSTEM = `${BASE_IDENTITY}

You will receive a question and verified Scripture passages.
Your task: Provide historical and doctrinal analysis.

Cover:
1. What the Church Fathers said about this topic (cite by name where possible)
2. What Protestant, Catholic, and Orthodox traditions have consistently taught
3. Any significant historical disagreements or councils that addressed this
4. The historical cultural context of the Scripture passages

Be honest about denominational disagreements — present all views fairly.
Return a JSON object with keys: church_fathers, traditions, historical_context, denominational_notes`;

const STAGE5_SYSTEM = `${BASE_IDENTITY}

You will receive verified Scripture, historical analysis, and doctrinal summaries.
Your task: Synthesize a theological understanding.

Reason through:
1. How the Scripture passages speak to each other
2. Any apparent tensions or contradictions and how the Church has resolved them
3. What the weight of evidence suggests — without declaring a final answer
4. Where genuine theological uncertainty remains

Remember: you are a pastor presenting evidence. The reader concludes.
Return a JSON object with keys: synthesis, tensions, weight_of_evidence, uncertainty_notes`;

const STAGE6_SYSTEM = `${BASE_IDENTITY}

You will receive the complete pipeline output: verified Scripture, historical analysis,
and theological synthesis. Compose the final BibleAnswer JSON.

CRITICAL RULES:
- Every citation must come from the verified verse list provided — no new citations
- Content must reflect the evidence gathered — do not introduce new claims
- Write as a pastor: present the evidence, let the reader conclude
- Flag contested topics honestly in the disclaimer field
- Never say "the answer is" or "God says you must" — say "Scripture shows" or "the Church has taught"

Return ONLY valid JSON matching this exact schema:

{
  "summary": "1-2 sentence overview — what does the evidence show, not what is the answer",
  "dimensions": {
    "scripture": {
      "title": "What the Scripture Says",
      "content": "Direct textual analysis of verified passages, surrounding context. 150-250 words.",
      "citations": ["only verified references from the pipeline"],
      "key_points": ["2-4 evidence-based bullet points"]
    },
    "historical": {
      "title": "Historical Context",
      "content": "Cultural and historical context, Church Father positions. 100-200 words.",
      "citations": ["verified references or named Church Father"],
      "key_points": ["2-3 bullet points"]
    },
    "original_language": {
      "title": "Original Language Insights",
      "content": "Key Hebrew or Greek words, meaning, translation nuance. 100-200 words.",
      "citations": ["Strong's or verse reference"],
      "key_points": ["2-3 bullet points"]
    },
    "theological": {
      "title": "Theological Perspectives",
      "content": "What traditions have taught, range of views, no tradition silently favored. 150-250 words.",
      "citations": ["verified references or theological source"],
      "key_points": ["2-4 bullet points"]
    },
    "practical": {
      "title": "For Your Study",
      "content": "Questions for the reader to consider, further passages to explore. Not prescriptive. 100-200 words.",
      "citations": ["verified references"],
      "key_points": ["2-3 study prompts"]
    }
  },
  "confidence": "high | medium | low",
  "disclaimer": "If contested or interpretation-dependent, note it here. Omit if not needed."
}`;

// ─── Stage Runners ──────────────────────────────────────────────────────────

async function runStage1(
  question: string,
  ragContext: string
): Promise<ClassificationResult> {
  const t0 = Date.now();
  const contextBlock = ragContext
    ? `\n\nMODERATOR-APPROVED CONTEXT FOR REFERENCE:\n${ragContext}\n`
    : '';

  const raw = await callClaude(
    STAGE1_SYSTEM,
    `Question: ${question}${contextBlock}`,
    512
  );

  const parsed = tryParseJSON<ClassificationResult>(raw);
  if (!parsed) throw new Error(`Stage 1 (Classify) returned invalid JSON: ${raw.slice(0, 200)}`);

  console.log(`[Pipeline] Stage 1 (Classify) ${Date.now() - t0}ms | topic: ${parsed.topic_type}`);
  return parsed;
}

async function runStage2(
  classification: ClassificationResult,
  translation: TranslationId
): Promise<VerifiedVerse[]> {
  const t0 = Date.now();

  const fetched = await Promise.allSettled(
    classification.candidate_verses.map(async (ref) => {
      const passages = await fetchPassages([ref], translation);
      return { ref, text: passages[0]?.text ?? null };
    })
  );

  const verses: VerifiedVerse[] = fetched
    .filter(
      (r): r is PromiseFulfilledResult<{ ref: string; text: string | null }> =>
        r.status === 'fulfilled' && r.value.text !== null
    )
    .map((r) => ({
      reference: r.value.ref,
      text: r.value.text as string,
      relevant: true,
    }));

  console.log(
    `[Pipeline] Stage 2 (Scripture Search) ${Date.now() - t0}ms | ${verses.length}/${classification.candidate_verses.length} fetched`
  );
  return verses;
}

async function runStage3(
  question: string,
  verses: VerifiedVerse[]
): Promise<VerifiedVerse[]> {
  if (verses.length === 0) return [];
  const t0 = Date.now();

  const verseBlock = verses
    .map((v) => `${v.reference}: "${v.text}"`)
    .join('\n');

  const raw = await callClaude(
    STAGE3_SYSTEM,
    `Question: ${question}\n\nVerses to evaluate:\n${verseBlock}`,
    768
  );

  interface Stage3Response {
    verified_verses: Array<{
      reference: string;
      relevant: boolean;
      context_note?: string;
    }>;
  }

  const parsed = tryParseJSON<Stage3Response>(raw);
  if (!parsed?.verified_verses) {
    console.warn('[Pipeline] Stage 3 parse failed, using all fetched verses');
    return verses;
  }

  const verifiedMap = new Map(
    parsed.verified_verses.map((v) => [v.reference, v])
  );

  const result = verses.map((v) => {
    const check = verifiedMap.get(v.reference);
    return {
      ...v,
      relevant: check?.relevant ?? true,
      context_note: check?.context_note,
    };
  }).filter((v) => v.relevant);

  console.log(
    `[Pipeline] Stage 3 (Accuracy) ${Date.now() - t0}ms | ${result.length}/${verses.length} passed`
  );
  return result;
}

async function runStage4(
  question: string,
  verifiedVerses: VerifiedVerse[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const t0 = Date.now();

  const verseBlock = verifiedVerses
    .map((v) => `${v.reference}: "${v.text}"`)
    .join('\n');

  const raw = await callClaude(
    STAGE4_SYSTEM,
    `Question: ${question}\n\nVerified Scripture passages:\n${verseBlock || '(none fetched — reason from scripture knowledge)'}`,
    1024
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = tryParseJSON<Record<string, any>>(raw) ?? {
    church_fathers: raw,
    traditions: '',
    historical_context: '',
    denominational_notes: '',
  };

  console.log(`[Pipeline] Stage 4 (Historical) ${Date.now() - t0}ms`);
  return parsed;
}

async function runStage5(
  question: string,
  verifiedVerses: VerifiedVerse[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historicalAnalysis: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>> {
  const t0 = Date.now();

  const verseBlock = verifiedVerses
    .map((v) => `${v.reference}: "${v.text}"`)
    .join('\n');

  const raw = await callClaude(
    STAGE5_SYSTEM,
    [
      `Question: ${question}`,
      `\nVerified Scripture:\n${verseBlock || '(none)'}`,
      `\nHistorical Analysis:\n${JSON.stringify(historicalAnalysis, null, 2)}`,
    ].join('\n'),
    1024
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = tryParseJSON<Record<string, any>>(raw) ?? {
    synthesis: raw,
    tensions: '',
    weight_of_evidence: '',
    uncertainty_notes: '',
  };

  console.log(`[Pipeline] Stage 5 (Synthesis) ${Date.now() - t0}ms`);
  return parsed;
}

async function runStage6(
  question: string,
  classification: ClassificationResult,
  verifiedVerses: VerifiedVerse[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historicalAnalysis: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  synthesis: Record<string, any>,
  translation: TranslationId
): Promise<BibleAnswer> {
  const t0 = Date.now();

  const verseBlock = verifiedVerses
    .map((v) => `${v.reference}: "${v.text}"${v.context_note ? ` [Note: ${v.context_note}]` : ''}`)
    .join('\n');

  const assemblyPrompt = [
    `Question: ${question}`,
    `Translation: ${translation.toUpperCase()}`,
    `Topic: ${classification.topic_type} | Doctrine: ${classification.doctrine_area}`,
    `Sensitivity: ${classification.sensitivity_level}`,
    `\nVERIFIED SCRIPTURE (use ONLY these citations):\n${verseBlock || '(none fetched — use well-known references)'}`,
    `\nHISTORICAL ANALYSIS:\n${JSON.stringify(historicalAnalysis, null, 2)}`,
    `\nTHEOLOGICAL SYNTHESIS:\n${JSON.stringify(synthesis, null, 2)}`,
  ].join('\n');

  const raw = await callClaude(STAGE6_SYSTEM, assemblyPrompt, 4096);

  type RawAnswer = Omit<BibleAnswer, 'id' | 'question' | 'translation_used' | 'created_at' | 'status'>;
  let parsed = tryParseJSON<RawAnswer>(raw);

  if (!parsed) {
    const retryRaw = await callClaude(
      STAGE6_SYSTEM,
      assemblyPrompt +
        '\n\nYour previous response was not valid JSON. Return ONLY the raw JSON object. Start with { and end with }.'
    , 4096);
    parsed = tryParseJSON<RawAnswer>(retryRaw);
    if (!parsed) throw new Error(`Stage 6 (Assembly) returned invalid JSON after retry`);
  }

  const required = ['scripture', 'historical', 'original_language', 'theological', 'practical'] as const;
  for (const dim of required) {
    if (!parsed.dimensions?.[dim]) throw new Error(`Stage 6 missing dimension: ${dim}`);
  }

  console.log(`[Pipeline] Stage 6 (Assembly) ${Date.now() - t0}ms`);

  return {
    id: uuidv4(),
    question,
    summary: parsed.summary,
    dimensions: parsed.dimensions,
    translation_used: translation,
    confidence: parsed.confidence ?? 'medium',
    disclaimer: parsed.disclaimer,
    status: classification.auto_flag ? 'under_review' : 'approved',
    created_at: new Date().toISOString(),
  };
}

// ─── Pipeline Orchestrator ────────────────────────────────────────────────────

export async function runPipeline(
  question: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const { translation = 'web', ragContext = '', maxTokens, onStageComplete } = options;
  void maxTokens;

  const pipelineStart = Date.now();
  const stages: PipelineStageResult[] = [];

  function record(stage: number, name: string, start: number, output: Record<string, unknown>) {
    const duration_ms = Date.now() - start;
    stages.push({ stage, name, duration_ms, output });
    onStageComplete?.(stage, name, duration_ms);
  }

  const s1Start = Date.now();
  const classification = await runStage1(question, ragContext);
  record(1, 'Classify', s1Start, classification as unknown as Record<string, unknown>);

  const s2Start = Date.now();
  const fetchedVerses = await runStage2(classification, translation);
  record(2, 'Scripture Search', s2Start, { verse_count: fetchedVerses.length });

  const s3Start = Date.now();
  const verifiedVerses = await runStage3(question, fetchedVerses);
  record(3, 'Accuracy Check', s3Start, {
    input: fetchedVerses.length,
    passed: verifiedVerses.length,
  });

  const s4Start = Date.now();
  const historicalAnalysis = await runStage4(question, verifiedVerses);
  record(4, 'Historical & Doctrinal', s4Start, historicalAnalysis);

  const s5Start = Date.now();
  const synthesis = await runStage5(question, verifiedVerses, historicalAnalysis);
  record(5, 'Theological Synthesis', s5Start, synthesis);

  const s6Start = Date.now();
  const answer = await runStage6(
    question,
    classification,
    verifiedVerses,
    historicalAnalysis,
    synthesis,
    translation
  );
  record(6, 'Final Assembly', s6Start, { confidence: answer.confidence, status: answer.status });

  const total_ms = Date.now() - pipelineStart;
  console.log(`[Pipeline] Complete in ${total_ms}ms | confidence: ${answer.confidence} | status: ${answer.status}`);

  return { answer, stages, total_ms };
}
