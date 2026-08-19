/**
 * bible.ts — Bible verse fetcher (SERVER ONLY)
 *
 * Local-first: Resolves scripture directly from bundled public domain modules
 * (KJV, ASV, WEB, BBE, Darby, YLT) without network dependency.
 * Gracefully falls back to bible-api.com if an unbundled translation is requested.
 *
 * SERVER ONLY — never import from client components.
 */

import type { BiblePassage, TranslationId } from '@/types';
import { getLocalPassage } from './bible-local';

// ─── Config ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://bible-api.com';

const TRANSLATION_SLUG: Record<TranslationId, string> = {
  web: 'web',
  kjv: 'kjv',
  asv: 'asv',
  darby: 'darby',
  bbe: 'bbe',
  ylt: 'ylt',
};

const FETCH_TIMEOUT_MS = 8_000;
const MAX_CONCURRENT = 5;

// ─── Types ────────────────────────────────────────────────────────────────

interface BibleApiResponse {
  reference: string;
  verses: Array<{
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
  }>;
  text: string;
  translation_id: string;
  translation_name: string;
  translation_note: string;
}

export interface FetchedPassage {
  reference: string;
  text: string | null;
  passage: BiblePassage | null;
  error?: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function encodeReference(ref: string): string {
  return ref.trim().replace(/ /g, '%20');
}

function normalizeReference(ref: string): string {
  return ref
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(\d+\s+)?([a-z]+)/i, (match) => match.replace(/\b\w/g, (c) => c.toUpperCase()));
}

async function fetchRemotePassage(
  ref: string,
  translation: TranslationId
): Promise<FetchedPassage> {
  const normalized = normalizeReference(ref);
  const slug = TRANSLATION_SLUG[translation] ?? 'web';
  const url = `${BASE_URL}/${encodeReference(normalized)}?translation=${slug}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        reference: normalized,
        text: null,
        passage: null,
        error: `HTTP ${response.status} for reference "${normalized}"`,
      };
    }

    const data: BibleApiResponse = await response.json();

    if (!data.verses || data.verses.length === 0) {
      return {
        reference: normalized,
        text: null,
        passage: null,
        error: `No verses returned for "${normalized}"`,
      };
    }

    const passage: BiblePassage = {
      reference: data.reference,
      verses: data.verses,
      text: data.text.trim(),
      translation_id: data.translation_id,
      translation_name: data.translation_name,
      translation_note: data.translation_note,
    };

    return {
      reference: data.reference,
      text: passage.text,
      passage,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err instanceof Error ? err.message : String(err);
    return {
      reference: normalized,
      text: null,
      passage: null,
      error: message.includes('abort') ? `Timeout fetching "${normalized}"` : message,
    };
  }
}

async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const queue = [...tasks];

  async function runNext(): Promise<void> {
    const task = queue.shift();
    if (!task) return;
    results.push(await task());
    await runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, runNext)
  );

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Fetch a single verse or passage.
 * Checks local bundled Bible modules first. If missing, falls back to bible-api.com.
 */
export async function fetchPassage(
  reference: string,
  translation: TranslationId = 'web'
): Promise<FetchedPassage> {
  const normalized = normalizeReference(reference);

  // 1. Try local module first
  try {
    const local = getLocalPassage(normalized, translation);
    if (local) {
      return {
        reference: local.reference,
        text: local.text,
        passage: local,
      };
    }
  } catch (err) {
    console.warn(`[bible.ts] Local passage lookup failed for "${normalized}", falling back:`, err);
  }

  // 2. Fall back to remote API
  return fetchRemotePassage(normalized, translation);
}

/**
 * Fetch multiple verse references.
 * Resolves local modules synchronously/asynchronously and falls back gracefully.
 */
export async function fetchPassages(
  references: string[],
  translation: TranslationId = 'web'
): Promise<FetchedPassage[]> {
  if (references.length === 0) return [];

  const tasks = references.map((ref) => () => fetchPassage(ref, translation));
  return withConcurrency(tasks, MAX_CONCURRENT);
}
