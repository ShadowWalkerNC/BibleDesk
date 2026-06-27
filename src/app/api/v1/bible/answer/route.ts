// BibleDesk — Sigil-Compatible Webhook Endpoint
// POST /api/v1/bible/answer
// This endpoint follows the ShadowRealm Network contract so Sigil can call BibleDesk
// from its faith package (/bible /devotional /prayer commands).
//
// Auth: HMAC-SHA256 signature in x-bibledesk-signature header
// Body: { question: string, translation?: string, guild_id?: string, channel_id?: string }

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateBibleAnswer } from '@/lib/claude';
import type { TranslationId } from '@/types';

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.BIBLEDESK_WEBHOOK_SECRET;
  if (!secret) return false; // If no secret set, block all requests
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-bibledesk-signature') ?? '';

  // SECURITY: Verify HMAC signature from Sigil
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { question?: string; translation?: string; guild_id?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.question || body.question.trim().length < 5) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  try {
    const answer = await generateBibleAnswer(body.question.trim(), {
      translation: (body.translation as TranslationId) ?? 'web',
    });

    // Return Sigil-friendly format — compact for Discord embed
    return NextResponse.json({
      success: true,
      question: answer.question,
      summary: answer.summary,
      dimensions: Object.fromEntries(
        Object.entries(answer.dimensions).map(([key, dim]) => [
          key,
          { title: dim.title, content: dim.content.slice(0, 400), citations: dim.citations },
        ])
      ),
      share_url: `${process.env.NEXT_PUBLIC_APP_URL}/answer/${answer.id}`,
      confidence: answer.confidence,
    });
  } catch (err) {
    console.error('Sigil webhook error:', err);
    return NextResponse.json({ error: 'Failed to generate answer' }, { status: 500 });
  }
}

// Health check for ShadowRealm Network
export async function GET() {
  return NextResponse.json({
    service: 'bibledesk',
    version: '1.0.0',
    status: 'ok',
    endpoints: ['POST /api/v1/bible/answer'],
  });
}
