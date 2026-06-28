/**
 * /api/ask/stream — SSE streaming endpoint
 *
 * Emits Server-Sent Events as the 6-stage pipeline progresses.
 * Each stage fires a `stage` event when it completes.
 * Final event is `answer` with the full BibleAnswer JSON.
 * Error event is `error` with a message.
 *
 * Events:
 *   event: stage  — { stage, name, duration_ms }
 *   event: answer — BibleAnswer JSON (full)
 *   event: error  — { message }
 */

import { NextRequest } from 'next/server';
import type { TranslationId } from '@/types';
import {
  runPipeline,
  type PipelineOptions,
} from '@/lib/pipeline';
import { getRagContext } from '@/lib/rag';
import { saveAnswer } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Up to 5-min timeout for the full pipeline on Render
export const maxDuration = 300;

const VALID_TRANSLATIONS: TranslationId[] = ['web', 'kjv', 'asr', 'bbe', 'darby'];

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

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        controller.enqueue(encoder.encode(sse(event, data)));
      }

      try {
        // RAG context lookup (silent — no event)
        const ragContext = await getRagContext(question).catch(() => '');

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

        // Persist to Supabase (fire-and-forget)
        saveAnswer(answer).catch((e: unknown) =>
          console.error('[stream] saveAnswer failed:', e)
        );

        const shareSlug = answer.id.slice(0, 8);
        emit('answer', { ...answer, shareSlug });
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
      'X-Accel-Buffering': 'no', // Disable Nginx buffering on Render
    },
  });
}
