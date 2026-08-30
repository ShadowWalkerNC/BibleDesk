/**
 * discord.ts — Discord Webhook and Interaction Utilities (SERVER ONLY)
 */

import crypto from 'crypto';
import type { BibleAnswer, DimensionKey } from '@/types';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

const GOLD_COLOR = 0xb58414; // #b58414
const DIMENSION_EMOJIS: Record<DimensionKey, string> = {
  scripture: '📖',
  historical: '🏛️',
  original_language: '📜',
  theological: '⛪',
  practical: '💡',
};

/**
 * Verify incoming Discord interaction request signature (Ed25519)
 */
export function verifyDiscordInteraction(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  if (!signature || !timestamp || !publicKey) return false;
  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(publicKey, 'hex'),
      format: 'der',
      type: 'spki',
    });
    const message = Buffer.from(timestamp + rawBody);
    const sig = Buffer.from(signature, 'hex');
    return crypto.verify(null, message, key, sig);
  } catch {
    // Fallback: try raw Ed25519 verify
    try {
      const key = crypto.createPublicKey({
        key: Buffer.concat([
          Buffer.from('302a300506032b6570032100', 'hex'),
          Buffer.from(publicKey, 'hex'),
        ]),
        format: 'der',
        type: 'spki',
      });
      const message = Buffer.from(timestamp + rawBody);
      const sig = Buffer.from(signature, 'hex');
      return crypto.verify(null, message, key, sig);
    } catch {
      return false;
    }
  }
}

/**
 * Build a formatted Discord Embed from a 5-Dimension BibleAnswer
 */
export function formatBibleAnswerDiscordEmbed(
  answer: BibleAnswer,
  shareUrl?: string
): DiscordWebhookPayload {
  const fields: DiscordEmbedField[] = Object.entries(answer.dimensions).map(
    ([key, dim]) => {
      const emoji = DIMENSION_EMOJIS[key as DimensionKey] || '✦';
      const citations = dim.citations.length > 0 ? `\n*Citations: ${dim.citations.join(', ')}*` : '';
      const text = dim.content.length > 350 ? `${dim.content.slice(0, 347)}...` : dim.content;
      return {
        name: `${emoji} ${dim.title}`,
        value: `${text}${citations}`,
        inline: false,
      };
    }
  );

  return {
    username: 'BibleDesk Assistant',
    avatar_url: 'https://bibledesk.org/icon-512.png',
    embeds: [
      {
        title: `Study Question: "${answer.question}"`,
        description: `**Overview:**\n${answer.summary}`,
        url: shareUrl,
        color: GOLD_COLOR,
        fields,
        footer: {
          text: `BibleDesk 5-Dimension Study • Translation: ${answer.translation_used.toUpperCase()}`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Send payload to a Discord Webhook URL
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Discord responded with ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send Discord webhook' };
  }
}
