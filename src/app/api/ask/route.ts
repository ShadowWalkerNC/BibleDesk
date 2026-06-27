// BibleDesk — Main Ask API Route
// POST /api/ask
// SECURITY: Server Route — Anthropic API key never reaches the browser

import { NextRequest, NextResponse } from 'next/server';
import { generateBibleAnswer } from '@/lib/claude';
import { saveAnswer } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limit';
import type { AskRequest, ApiResponse } from '@/types';

// Input validation
const MAX_QUESTION_LENGTH = 500;
const MIN_QUESTION_LENGTH = 5;

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

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Parse body
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

    // Validate input
    if (question.length < MIN_QUESTION_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'Question is too short. Please ask a complete question.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Rate limit check
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `You've reached the limit of 15 questions per hour. Resets at ${rateLimit.resetAt.toLocaleTimeString()}.`,
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '15',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          },
        }
      );
    }

    // Generate AI answer
    const answer = await generateBibleAnswer(question, { translation });

    // Persist to Supabase (non-blocking — don't fail the request if this fails)
    saveAnswer(answer).catch((err) => console.error('Failed to save answer:', err));

    return NextResponse.json(
      { success: true, answer },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (err) {
    console.error('Ask API error:', err);
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
