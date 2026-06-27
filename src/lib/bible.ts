// BibleDesk — bible-api.com client
// Free, no API key required, public domain translations only.
// Docs: https://bible-api.com/

import type { BiblePassage, TranslationId } from '@/types';

const BASE_URL = 'https://bible-api.com';

/**
 * Fetch a Bible passage by reference.
 * @example fetchPassage('john 3:16', 'web')
 * @example fetchPassage('romans 8:28-30', 'kjv')
 */
export async function fetchPassage(
  reference: string,
  translation: TranslationId = 'web'
): Promise<BiblePassage> {
  const encoded = encodeURIComponent(reference.trim());
  const url = `${BASE_URL}/${encoded}?translation=${translation}`;

  const res = await fetch(url, {
    next: { revalidate: 86400 }, // Cache 24h — scripture doesn't change
  });

  if (!res.ok) {
    throw new Error(`bible-api.com error: ${res.status} for "${reference}"`);
  }

  const data = await res.json();

  if (!data.verses || data.verses.length === 0) {
    throw new Error(`No verses found for "${reference}"`);
  }

  return data as BiblePassage;
}

/**
 * Fetch multiple passages concurrently.
 * Silently skips any that fail (returns only successful ones).
 */
export async function fetchPassages(
  references: string[],
  translation: TranslationId = 'web'
): Promise<BiblePassage[]> {
  const results = await Promise.allSettled(
    references.map((ref) => fetchPassage(ref, translation))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<BiblePassage> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Fetch context passages for a question to ground the AI answer.
 * Returns formatted text ready to inject into the Claude prompt.
 */
export async function fetchContextForQuestion(
  translation: TranslationId = 'web'
): Promise<string> {
  // We let Claude determine which passages to pull — we pass the translation
  // preference here for any follow-up lookups.
  return `Translation preference: ${translation.toUpperCase()}. Use bible-api.com format references.`;
}

/**
 * Format a BiblePassage into clean readable text for display.
 */
export function formatPassage(passage: BiblePassage): string {
  return passage.verses
    .map((v) => `${v.book_name} ${v.chapter}:${v.verse} — ${v.text.trim()}`)
    .join('\n');
}
