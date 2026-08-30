/**
 * whatsapp.ts — WhatsApp Cloud API and Click-to-Chat Utilities (SERVER & CLIENT)
 */

import type { BibleAnswer } from '@/types';

/**
 * Generate a WhatsApp Click-to-Chat link with pre-formatted text
 */
export function createWhatsAppShareLink(text: string): string {
  const encoded = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

/**
 * Format a 5-Dimension BibleAnswer for WhatsApp Markdown
 * (*bold*, _italic_, ~strikethrough~, ```monospace```)
 */
export function formatBibleAnswerForWhatsApp(answer: BibleAnswer, shareUrl?: string): string {
  const lines: string[] = [
    `📖 *BibleDesk Study:* "${answer.question}"`,
    '',
    `*Summary:* ${answer.summary}`,
    '',
    '───────────────',
  ];

  for (const [key, dim] of Object.entries(answer.dimensions)) {
    const label = key.replace('_', ' ').toUpperCase();
    lines.push(`\n*${label}:* ${dim.title}`);
    lines.push(dim.content);
    if (dim.citations.length > 0) {
      lines.push(`_Citations: ${dim.citations.join(', ')}_`);
    }
  }

  if (shareUrl) {
    lines.push('', '───────────────', `🔗 *Read full study:* ${shareUrl}`);
  }

  return lines.join('\n');
}

/**
 * Send a WhatsApp message via official Meta WhatsApp Business Cloud API (SERVER ONLY)
 */
export async function sendWhatsAppMessage(
  toPhoneNumber: string,
  text: string,
  config?: { token?: string; phoneNumberId?: string }
): Promise<{ success: boolean; error?: string }> {
  const token = config?.token || process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      success: false,
      error: 'WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.',
    };
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhoneNumber,
        type: 'text',
        text: { preview_url: true, body: text },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `WhatsApp Cloud API error (${res.status}): ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send WhatsApp message' };
  }
}
