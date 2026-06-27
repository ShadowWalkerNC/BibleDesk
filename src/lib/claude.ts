// BibleDesk — Anthropic Claude client (SERVER ONLY)
// SECURITY: This file must NEVER be imported from client components.
// The API key lives only in process.env on the server.

import Anthropic from '@anthropic-ai/sdk';
import type { BibleAnswer, DimensionKey, TranslationId } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Lazy-init so the client is only created when needed
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

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
    "scripture": {
      "title": "What the Scripture Says",
      "content": "Direct textual analysis, key passages, surrounding context. 150-250 words.",
      "citations": ["Book Chapter:Verse", ...],
      "key_points": ["Point 1", "Point 2", "Point 3"]
    },
    "historical": {
      "title": "Historical Context",
      "content": "Cultural, political, and social context of the time period. What was happening in that world. 100-200 words.",
      "citations": ["Book Chapter:Verse or scholarly reference", ...],
      "key_points": ["Point 1", "Point 2"]
    },
    "original_language": {
      "title": "Original Language Insights",
      "content": "Key Hebrew or Greek words, their meaning, nuance, and how translation choices affect understanding. 100-200 words.",
      "citations": ["Strong's reference or verse", ...],
      "key_points": ["Point 1", "Point 2"]
    },
    "theological": {
      "title": "Theological Meaning",
      "content": "What the Church has historically believed and taught. Major theological interpretations across traditions. 150-250 words.",
      "citations": ["Book Chapter:Verse or theological reference", ...],
      "key_points": ["Point 1", "Point 2", "Point 3"]
    },
    "practical": {
      "title": "Practical Application",
      "content": "How this truth applies to daily life today — for individuals, families, churches, and youth. Concrete, actionable. 100-200 words.",
      "citations": ["Book Chapter:Verse", ...],
      "key_points": ["Point 1", "Point 2", "Point 3"]
    }
  },
  "confidence": "high | medium | low",
  "disclaimer": "Optional note if the topic is contested or interpretation-dependent. Omit if not needed."
}`;

export interface ClaudeAnswerOptions {
  translation?: TranslationId;
  maxTokens?: number;
}

/**
 * Generate a 5-dimension Bible answer using Claude.
 * SERVER ONLY — never call from client components.
 */
export async function generateBibleAnswer(
  question: string,
  options: ClaudeAnswerOptions = {}
): Promise<BibleAnswer> {
  const { translation = 'web', maxTokens = 2048 } = options;

  const client = getClient();

  const userMessage = `Question: ${question}

Preferred translation: ${translation.toUpperCase()} (World English Bible if WEB, King James Version if KJV, American Standard Version if ASV).
Provide scripture quotes in this translation where possible.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const rawContent = response.content[0];
  if (rawContent.type !== 'text') {
    throw new Error('Unexpected Claude response type');
  }

  // Parse and validate the JSON response
  let parsed: Omit<BibleAnswer, 'id' | 'question' | 'translation_used' | 'created_at'>;
  try {
    // Strip any accidental markdown code fences
    const json = rawContent.text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Claude returned invalid JSON. Raw: ' + rawContent.text.slice(0, 200));
  }

  // Validate required dimension keys
  const requiredDimensions: DimensionKey[] = [
    'scripture', 'historical', 'original_language', 'theological', 'practical'
  ];
  for (const dim of requiredDimensions) {
    if (!parsed.dimensions?.[dim]) {
      throw new Error(`Claude response missing dimension: ${dim}`);
    }
  }

  return {
    id: uuidv4(),
    question,
    summary: parsed.summary,
    dimensions: parsed.dimensions,
    translation_used: translation,
    confidence: parsed.confidence ?? 'medium',
    disclaimer: parsed.disclaimer,
    created_at: new Date().toISOString(),
  };
}
