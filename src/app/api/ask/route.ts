// BibleDesk — Main Ask API Route
// POST /api/ask
//
// Flow:
//   1. Validate input + rate limit
//   2. runRAG(question)
//      a. exactMatch → return cached BibleAnswer instantly (free, no pipeline)
//      b. contextMatches → inject contextPrompt into pipeline Stage 1
//      c. no match → pipeline runs cold (original behavior)
//   3. generateBibleAnswer (pipeline) → BibleAnswer
//   4. Persist to Supabase (non-blocking)
//   5. Return answer
//
// SECURITY: Server Route — Anthropic + OpenAI API keys never reach the browser.

import { NextRequest, NextResponse } from 'next/server';
import { generateBibleAnswer } from '@/lib/claude';
import { saveAnswer } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import { runRAG } from '@/lib/rag';
import type { AskRequest, ApiResponse } from '@/types';

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_QUESTION_LENGTH = 500;
const MIN_QUESTION_LENGTH = 5;
const RATE_LIMIT_PER_HOUR = 15;

// ─── Helpers ─────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

function sanitizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, ' ').slice(0, MAX_QUESTION_LENGTH);
}

// ─── Route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // ── 1. Parse + validate input ───────────────────────────────────────
    let body: AskRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const question = sanitizeQuestion(body.question ?? '');
    const translation = body.translation ?? 'web';

    if (question.length < MIN_QUESTION_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: 'Question is too short. Please ask a complete question.',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // ── 2. Rate limit ───────────────────────────────────────────────
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `You’ve reached the limit of ${RATE_LIMIT_PER_HOUR} questions per hour. Resets at ${rateLimit.resetAt.toLocaleTimeString()}.`,
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_PER_HOUR),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          },
        }
      );
    }

    // ── 3. RAG lookup ──────────────────────────────────────────────
    // runRAG never throws — failures return empty context gracefully.
    const rag = await runRAG(question);

    // Exact cache hit: return stored canonical answer immediately.
    // No pipeline call, no Anthropic cost, no Supabase write needed.
    if (rag.exactMatch && rag.exactAnswer) {
      console.log('[ask] RAG exact hit — serving canonical answer without pipeline');
      return NextResponse.json(
        { success: true, answer: rag.exactAnswer },
        {
          headers: {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RAG-Hit': 'exact',
          },
        }
      );
    }

    // ── 4. Run pipeline (with optional RAG context) ───────────────────
    const ragHitType = rag.contextMatches.length > 0 ? 'context' : 'none';

    const answer = await generateBibleAnswer(question, {
      translation,
      ragContext: rag.contextPrompt, // empty string when no matches
    });

    // ── 5. Persist (non-blocking — never fails the request) ─────────────
    saveAnswer(answer).catch((err) =>
      console.error('[ask] Failed to save answer to Supabase:', err)
    );

    // ── 6. Return ─────────────────────────────────────────────────
    return NextResponse.json(
      { success: true, answer },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RAG-Hit': ragHitType,
        },
      }
    );
  } catch (err) {
    console.error('[ask] Unhandled error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Something went wrong generating your answer. Please try again.',
        code: 'AI_ERROR',
      },
      { status: 500 }
    );
  }
}
