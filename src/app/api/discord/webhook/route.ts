import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordWebhook, formatBibleAnswerDiscordEmbed } from '@/lib/discord';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhookUrl, type = 'answer', answer, title, message } = body;

    const url = webhookUrl || process.env.PRAYER_DISCORD_WEBHOOK_URL;
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Discord Webhook URL is required.' },
        { status: 400 }
      );
    }

    let payload: any;

    if (type === 'answer' && answer) {
      const shareUrl = answer.id
        ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://bibledesk.org'}/share/${answer.id.slice(0, 8)}`
        : undefined;
      payload = formatBibleAnswerDiscordEmbed(answer, shareUrl);
    } else {
      payload = {
        username: 'BibleDesk Community',
        avatar_url: 'https://bibledesk.org/icon-512.png',
        embeds: [
          {
            title: title || '✦ BibleDesk Shared Update',
            description: message || '',
            color: 0xb58414,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    const result = await sendDiscordWebhook(url, payload);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to dispatch Discord webhook' },
      { status: 500 }
    );
  }
}
