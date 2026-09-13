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
//   4. Persist to Supabase (non-blocking), capture share_slug
//   5. Return answer + shareSlug
//
// SECURITY: Server Route — Anthropic + OpenAI API keys never reach the browser.

import { NextRequest, NextResponse } from 'next/server';
import { generateBibleAnswer } from '@/lib/claude';
import { saveAnswer } from '@/lib/supabase';
import { checkAutoFlag, saveFlag } from '@/lib/moderation';
import { checkRateLimit, getClientIp, RateLimitNamespace } from '@/lib/rate-limit';
import { runRAG } from '@/lib/rag';
import { getAuthenticatedUser } from '@/lib/auth';
import type { AskRequest, ApiResponse, BibleAnswer } from '@/types';
import { MIN_QUESTION_LENGTH } from '@/lib/ask-validation';

const MAX_QUESTION_LENGTH = 500;
const ASK_LIMIT_PER_DAY = 5;

function sanitizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, ' ').slice(0, MAX_QUESTION_LENGTH);
}

// ── Auto-moderation ───────────────────────────────────────────────────────────
// The pipeline's Stage-1 self-grading (answer.status) stays recorded as a
// signal, but it is NO LONGER the moderation decision on its own: the
// DB-backed checkAutoFlag result is authoritative for creating a persisted
// flag. Runs fire-and-forget; the answer row must already exist because
// saveFlag flips that row's status to 'under_review'.
async function runAutoModeration(question: string, answer: BibleAnswer): Promise<void> {
  const result = await checkAutoFlag(question, answer);
  console.log(
    `[ask] Auto-flag check for answer ${answer.id}: ${result.flagged ? 'FLAGGED' : 'clear'} ` +
    `(pipeline self-grade status: ${answer.status})`
  );
  if (!result.flagged) return;

  const flagReason = [
    `categories: ${result.categories.join(', ') || 'none'}`,
    `keywords: ${result.reasons.join(', ') || 'none'}`,
  ].join('; ');

  const flagId = await saveFlag({
    answerId:   answer.id,
    question,
    flagType:   'auto',
    flagReason,
  });

  if (flagId) {
    console.log(`[ask] Auto-flag saved for answer ${answer.id} (flag ${flagId}): ${flagReason}`);
  } else {
    // Loud failure: flagged content did NOT reach the moderation queue.
    console.error(`[ask] saveFlag FAILED for flagged answer ${answer.id}: ${flagReason}`);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // ── 1. Parse + validate ──────────────────────────────────────────────────────
    let body: AskRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const question   = sanitizeQuestion(body.question ?? '');
    const translation = body.translation ?? 'web';

    if (question.length < MIN_QUESTION_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'Question is too short. Please ask a complete question.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // ── 2. Authenticate User & Validate AI Access ────────────────────────────
    const user = await getAuthenticatedUser(req);
    // BYOK keys travel by header ONLY (x-gemini-api-key) — never the request body.
    const userApiKey = req.headers.get('x-gemini-api-key')?.trim() || undefined;

    // Guests must provide a personal Gemini API key to use AI features
    if (!user && !userApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please sign in or enter a free Gemini API key to use the 5-Dimension AI Assistant.',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    // Rate limit check: keyed by user ID if authenticated, else IP
    const rateLimitKey = user ? `user:${user.id}` : getClientIp(req);
    const rateLimit = await checkRateLimit(rateLimitKey, { namespace: RateLimitNamespace.ask });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `You've reached the limit of ${ASK_LIMIT_PER_DAY} free AI answers per day. Add your own free Gemini API key (BYOK) for unlimited answers, or try again tomorrow. Resets at ${rateLimit.resetAt.toLocaleTimeString()}.`,
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit':     String(ASK_LIMIT_PER_DAY),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset':     rateLimit.resetAt.toISOString(),
          },
        }
      );
    }

    // ── 3. RAG lookup ────────────────────────────────────────────────────────
    const rag = await runRAG(question);

    // Exact cache hit — serve canonical answer, no pipeline cost, no new slug
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

    // ── 4. Run pipeline (with optional RAG context & user API key) ─────────────
    const ragHitType = rag.contextMatches.length > 0 ? 'context' : 'none';

    // Authenticated users use the server's hidden GEMINI_API_KEY unless they explicitly passed an override
    const answer = await generateBibleAnswer(question, {
      translation,
      ragContext: rag.contextPrompt,
      apiKey: userApiKey || undefined,
    });

    // ── 5. Persist + capture share slug (non-blocking) ──────────────────────────
    // saveAnswer returns the slug synchronously from the UUID — we can
    // compute it here without waiting for the DB write to finish.
    const shareSlug = answer.id.slice(0, 8);

    // Moderation is chained after the answer row exists so saveFlag can flip
    // that row's status; still non-blocking for the HTTP response.
    saveAnswer(answer)
      .then(() => runAutoModeration(question, answer))
      .catch((err) =>
        console.error('[ask] Failed to save answer to Supabase:', err)
      );

    // ── 6. Return answer + shareSlug ─────────────────────────────────────────
    return NextResponse.json(
      { success: true, answer, shareSlug },
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
