/**
 * /api/ask/stream — SSE streaming endpoint
 *
 * Emits Server-Sent Events as the 6-stage pipeline progresses.
 * Each stage fires a `stage` event when it completes.
 * Final event is `answer` with the full BibleAnswer JSON + rateLimit info.
 * Error event is `error` with a message.
 *
 * Events:
 *   event: stage  — { stage, name, duration_ms }
 *   event: answer — BibleAnswer JSON + shareSlug + rateLimit: { remaining, limit }
 *   event: error  — { message }
 */

import { NextRequest } from 'next/server';
import { TRANSLATIONS, type TranslationId, type BibleAnswer } from '@/types';
import { MIN_QUESTION_LENGTH } from '@/lib/ask-validation';
import { runPipeline, type PipelineOptions } from '@/lib/pipeline';
import { runRAG } from '@/lib/rag';
import { saveAnswer } from '@/lib/supabase';
import { checkAutoFlag, saveFlag } from '@/lib/moderation';
import { checkRateLimit, getClientIp, RateLimitNamespace } from '@/lib/rate-limit';
import { getAuthenticatedUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const VALID_TRANSLATIONS: TranslationId[] = TRANSLATIONS.map((t) => t.id);
const ASK_LIMIT_PER_DAY = 5;

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ── Auto-moderation ───────────────────────────────────────────────────────────
// The pipeline's Stage-1 self-grading (answer.status) stays recorded as a
// signal, but it is NO LONGER the moderation decision on its own: the
// DB-backed checkAutoFlag result is authoritative for creating a persisted
// flag. Runs on the completed answer, fire-and-forget, so the SSE contract
// (stage → answer → close) is never delayed or altered. The answer row must
// already exist because saveFlag flips that row's status to 'under_review'.
async function runAutoModeration(question: string, answer: BibleAnswer): Promise<void> {
  const result = await checkAutoFlag(question, answer);
  console.log(
    `[stream] Auto-flag check for answer ${answer.id}: ${result.flagged ? 'FLAGGED' : 'clear'} ` +
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
    console.log(`[stream] Auto-flag saved for answer ${answer.id} (flag ${flagId}): ${flagReason}`);
  } else {
    // Loud failure: flagged content did NOT reach the moderation queue.
    console.error(`[stream] saveFlag FAILED for flagged answer ${answer.id}: ${flagReason}`);
  }
}

export async function POST(req: NextRequest) {
  let question: string;
  let translation: TranslationId;

  try {
    const body = await req.json();
    question = (body.question ?? '').trim();
    translation = VALID_TRANSLATIONS.includes(body.translation)
      ? (body.translation as TranslationId)
      : 'web';
  } catch {
    return new Response(sse('error', { message: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  if (!question || question.length < MIN_QUESTION_LENGTH) {
    return new Response(sse('error', { message: 'Question too short' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // Authenticate user & validate AI permissions.
  // BYOK keys travel by header ONLY (x-gemini-api-key) — never the request body.
  const user = await getAuthenticatedUser(req);
  const userApiKey = req.headers.get('x-gemini-api-key')?.trim() || undefined;

  if (!user && !userApiKey) {
    return new Response(
      sse('error', {
        message: 'Please sign in or enter a free Gemini API key to use the 5-Dimension AI Assistant.',
        code: 'AUTH_REQUIRED',
      }),
      { status: 401, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  // Rate limit check before opening stream (keyed by user ID if authenticated, else IP)
  const rateLimitKey = user ? `user:${user.id}` : getClientIp(req);
  const rateLimit = await checkRateLimit(rateLimitKey, { namespace: RateLimitNamespace.ask });

  if (!rateLimit.allowed) {
    return new Response(
      sse('error', {
        message: `You've reached the limit of ${ASK_LIMIT_PER_DAY} free AI answers per day. Add your own free Gemini API key (BYOK) for unlimited answers, or try again tomorrow. Resets at ${rateLimit.resetAt.toLocaleTimeString()}.`,
        code: 'RATE_LIMITED',
        rateLimit: { remaining: 0, limit: ASK_LIMIT_PER_DAY, resetAt: rateLimit.resetAt.toISOString() },
      }),
      { status: 429, headers: { 'Content-Type': 'text/event-stream' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        controller.enqueue(encoder.encode(sse(event, data)));
      }
      try {
        const ragResult = await runRAG(question).catch(() => null);
        const ragContext = ragResult?.contextPrompt || '';

        // Authenticated users automatically use the server's hidden GEMINI_API_KEY
        const options: PipelineOptions & {
          onStageComplete?: (stage: number, name: string, duration_ms: number) => void;
        } = {
          translation,
          ragContext,
          apiKey: userApiKey || undefined,
          onStageComplete(stage, name, duration_ms) {
            emit('stage', { stage, name, duration_ms });
          },
        };

        const { answer } = await runPipeline(question, options);

        // Persist, then run the authoritative auto-flag check — chained so the
        // answer row exists before saveFlag can flip its status; still
        // non-blocking, so the SSE stream closes without delay.
        saveAnswer(answer)
          .then(() => runAutoModeration(question, answer))
          .catch((e: unknown) =>
            console.error('[stream] saveAnswer failed:', e)
          );

        const shareSlug = answer.id.slice(0, 8);
        emit('answer', {
          answer,
          ...answer,
          shareSlug,
          rateLimit: {
            remaining: rateLimit.remaining,
            limit: ASK_LIMIT_PER_DAY,
          },
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        emit('error', { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
