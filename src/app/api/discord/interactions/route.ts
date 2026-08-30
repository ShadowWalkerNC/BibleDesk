import { NextRequest, NextResponse } from 'next/server';
import { verifyDiscordInteraction, formatBibleAnswerDiscordEmbed } from '@/lib/discord';
import { generateBibleAnswer } from '@/lib/claude';
import { DAILY_DEVOTIONALS } from '@/lib/dailyData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Discord Interaction Types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
};

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
};

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-signature-ed25519') || '';
  const timestamp = req.headers.get('x-signature-timestamp') || '';
  const rawBody = await req.text();

  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (publicKey) {
    const isValid = verifyDiscordInteraction(rawBody, signature, timestamp, publicKey);
    if (!isValid) {
      return new NextResponse('Invalid interaction signature', { status: 401 });
    }
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Handle Discord Ping
  if (body.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  // Handle Slash Commands
  if (body.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = body.data?.name;
    const options = body.data?.options || [];

    // 1. /daily
    if (commandName === 'daily') {
      const today = new Date();
      const dayOfYear = Math.floor(
        (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
      );
      const devotional = DAILY_DEVOTIONALS[dayOfYear % DAILY_DEVOTIONALS.length];

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: `☀️ Daily Devotional • ${devotional.reference}`,
              description: `*"${devotional.text}"*\n\n**Reflection:**\n${devotional.reflection}\n\n**Prayer Focus:**\n${devotional.prayer_focus}`,
              color: 0xb58414,
              footer: { text: `BibleDesk Daily • Translation: ${devotional.translation}` },
            },
          ],
        },
      });
    }

    // 2. /bible [reference]
    if (commandName === 'bible') {
      const refOption = options.find((o: any) => o.name === 'reference')?.value || 'John 3';
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `📖 **Reading Passage:** ${refOption}\nRead directly on BibleDesk: ${process.env.NEXT_PUBLIC_APP_URL || 'https://bibledesk.org'}/bible?ref=${encodeURIComponent(refOption)}`,
        },
      });
    }

    // 3. /ask [question]
    if (commandName === 'ask') {
      const question = options.find((o: any) => o.name === 'question')?.value;
      if (!question) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Please provide a Bible question to study.' },
        });
      }

      try {
        const answer = await generateBibleAnswer(question, { translation: 'web' });
        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bibledesk.org'}/share/${answer.id.slice(0, 8)}`;
        const discordPayload = formatBibleAnswerDiscordEmbed(answer, shareUrl);

        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: discordPayload,
        });
      } catch (err: any) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `⚠️ Could not complete study answer: ${err.message}` },
        });
      }
    }
  }

  return NextResponse.json({ error: 'Unknown interaction' }, { status: 400 });
}
