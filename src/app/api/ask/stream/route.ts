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
import type { TranslationId } from '@/types';
import { runPipeline, type PipelineOptions } from '@/lib/pipeline';
import { runRAG } from '@/lib/rag';
import { saveAnswer } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const VALID_TRANSLATIONS: TranslationId[] = ['web', 'kjv', 'asv'];
const RATE_LIMIT_PER_HOUR = 15;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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

  if (!question || question.length < 3) {
    return new Response(sse('error', { message: 'Question too short' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // Rate limit check before opening stream
  const ip        = getClientIp(req);
  const rateLimit = await checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return new Response(
      sse('error', {
        message: `You've reached the limit of ${RATE_LIMIT_PER_HOUR} questions per hour. Resets at ${rateLimit.resetAt.toLocaleTimeString()}.`,
        code: 'RATE_LIMITED',
        rateLimit: { remaining: 0, limit: RATE_LIMIT_PER_HOUR, resetAt: rateLimit.resetAt.toISOString() },
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

        const options: PipelineOptions & {
          onStageComplete?: (stage: number, name: string, duration_ms: number) => void;
        } = {
          translation,
          ragContext,
          onStageComplete(stage, name, duration_ms) {
            emit('stage', { stage, name, duration_ms });
          },
        };

        const { answer } = await runPipeline(question, options);

        saveAnswer(answer).catch((e: unknown) =>
          console.error('[stream] saveAnswer failed:', e)
        );

        const shareSlug = answer.id.slice(0, 8);
        emit('answer', {
          ...answer,
          shareSlug,
          rateLimit: {
            remaining: rateLimit.remaining,
            limit: RATE_LIMIT_PER_HOUR,
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
