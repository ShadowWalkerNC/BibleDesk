import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, formatBibleAnswerForWhatsApp } from '@/lib/whatsapp';
import { generateBibleAnswer } from '@/lib/claude';
import { DAILY_DEVOTIONALS } from '@/lib/dailyData';
import { parseReference } from '@/lib/books';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verification handler for Meta WhatsApp Cloud API Webhook
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'bibledesk_whatsapp_verify';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * Inbound WhatsApp message receiver
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check for standard WhatsApp message entry
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const from = message.from; // User's phone number
    const text = (message.text?.body || '').trim();

    if (!text) {
      return NextResponse.json({ status: 'empty' }, { status: 200 });
    }

    const lower = text.toLowerCase();

    // 1. Keyword: "daily" or "verse"
    if (lower === 'daily' || lower === 'verse' || lower === 'today') {
      const today = new Date();
      const dayOfYear = Math.floor(
        (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
      );
      const devotional = DAILY_DEVOTIONALS[dayOfYear % DAILY_DEVOTIONALS.length];

      const reply = [
        `☀️ *BibleDesk Daily Devotional*`,
        `📖 *${devotional.reference} (${devotional.translation})*`,
        `"${devotional.text}"`,
        '',
        `*Reflection:*`,
        devotional.reflection,
        '',
        `*Prayer:*`,
        devotional.prayer_focus,
        '',
        `🔗 ${process.env.NEXT_PUBLIC_APP_URL || 'https://bibledesk.org'}/daily`,
      ].join('\n');

      await sendWhatsAppMessage(from, reply);
      return NextResponse.json({ status: 'success', type: 'daily' });
    }

    // 2. Keyword: "ask: <question>" or "study: <question>"
    if (lower.startsWith('ask:') || lower.startsWith('study:') || lower.startsWith('q:')) {
      const question = text.replace(/^(ask|study|q):\s*/i, '').trim();
      if (question.length > 3) {
        const answer = await generateBibleAnswer(question, { translation: 'web' });
        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bibledesk.org'}/share/${answer.id.slice(0, 8)}`;
        const reply = formatBibleAnswerForWhatsApp(answer, shareUrl);

        await sendWhatsAppMessage(from, reply);
        return NextResponse.json({ status: 'success', type: 'ai_answer' });
      }
    }

    // 3. Bible Passage Lookup (e.g. "John 3:16" or "Romans 8:28")
    const parsedRef = parseReference(text);
    if (parsedRef && parsedRef.book) {
      const reply = [
        `📖 *BibleDesk Reader*`,
        `Passage: *${parsedRef.book} ${parsedRef.chapter || 1}*`,
        '',
        `Read online with Strong's Lexicons & 6 Translations:`,
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://bibledesk.org'}/bible?ref=${encodeURIComponent(text)}`,
      ].join('\n');

      await sendWhatsAppMessage(from, reply);
      return NextResponse.json({ status: 'success', type: 'passage' });
    }

    // Default Help Menu
    const helpReply = [
      `✦ *Welcome to BibleDesk on WhatsApp* ✦`,
      '',
      `Reply with any of the following:`,
      `• *daily* — Get today's scripture and devotional reflection`,
      `• *<Book Chapter:Verse>* (e.g. _John 3:16_) — Look up any Bible passage`,
      `• *ask: <question>* (e.g. _ask: What is the armor of God?_) — 5-Dimension AI Study Guide`,
      '',
      `🌐 Web: ${process.env.NEXT_PUBLIC_APP_URL || 'https://bibledesk.org'}`,
    ].join('\n');

    await sendWhatsAppMessage(from, helpReply);
    return NextResponse.json({ status: 'success', type: 'help' });
  } catch (err: any) {
    console.error('[WhatsApp Webhook] Processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
