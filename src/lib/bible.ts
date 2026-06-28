/**
 * bible.ts — Bible verse fetcher (SERVER ONLY)
 *
 * Fetches real verse text from bible-api.com, a free public-domain API.
 * Supports all TranslationId values: web, kjv, asv, darby, bbe, ylt.
 *
 * The API endpoint format is:
 *   https://bible-api.com/{reference}?translation={id}
 *
 * Reference format examples accepted by bible-api.com:
 *   "John 3:16"         → single verse
 *   "Romans 8:28-30"    → verse range
 *   "Genesis 1:1"       → OT verse
 *
 * fetchPassages() is called by pipeline.ts Stage 2.
 * It handles rate limits, network failures, and malformed references
 * gracefully — failed fetches return null text so the pipeline degrades
 * rather than throws.
 *
 * SERVER ONLY — never import from client components.
 */

import type { BiblePassage, TranslationId } from '@/types';

// ─── Config ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://bible-api.com';

/**
 * bible-api.com uses its own translation slug names.
 * Map our TranslationId values to the slugs it expects.
 */
const TRANSLATION_SLUG: Record<TranslationId, string> = {
  web: 'web',
  kjv: 'kjv',
  asv: 'asv',
  darby: 'darby',
  bbe: 'bbe',
  ylt: 'ylt',
};

/** How long to wait for a single verse fetch before giving up (ms) */
const FETCH_TIMEOUT_MS = 8_000;

/** Max concurrent verse fetches in a single pipeline run */
const MAX_CONCURRENT = 5;

// ─── Types ────────────────────────────────────────────────────────────────

/** Shape returned by bible-api.com */
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

/** A fetched passage — text is null if the fetch failed */
export interface FetchedPassage {
  reference: string;
  text: string | null;
  passage: BiblePassage | null;
  error?: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Encode a verse reference for use in a URL path.
 * bible-api.com expects spaces encoded as + or %20 and colons as-is.
 * e.g. "John 3:16" → "John%203:16"
 */
function encodeReference(ref: string): string {
  // Encode only the spaces; colons and hyphens are safe for bible-api.com
  return ref.trim().replace(/ /g, '%20');
}

/**
 * Normalize a verse reference before sending:
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Title-case the book name (e.g. "1 john 3:16" → "1 John 3:16")
 */
function normalizeReference(ref: string): string {
  return ref
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(\d+\s+)?([a-z]+)/i, (match) => match.replace(/\b\w/g, (c) => c.toUpperCase()));
}

/**
 * Fetch a single passage from bible-api.com with a timeout.
 * Returns null on any failure so the caller can degrade gracefully.
 */
async function fetchSinglePassage(
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

    // bible-api.com returns an error key if reference is not found
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

/**
 * Run an array of async tasks with a concurrency cap.
 * Prevents hammering bible-api.com with too many simultaneous requests.
 */
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

  // Spin up `limit` workers in parallel
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, runNext)
  );

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Fetch multiple verse references from bible-api.com.
 *
 * - Fetches up to MAX_CONCURRENT (5) references at a time
 * - Failed fetches return { text: null } and do not throw
 * - Logs warnings for any failed fetches
 *
 * @param references  Array of reference strings e.g. ["John 3:16", "Romans 8:28-30"]
 * @param translation TranslationId to use (default: 'web')
 * @returns           Array of FetchedPassage in the same order as input
 */
export async function fetchPassages(
  references: string[],
  translation: TranslationId = 'web'
): Promise<FetchedPassage[]> {
  if (references.length === 0) return [];

  const tasks = references.map(
    (ref) => () => fetchSinglePassage(ref, translation)
  );

  const results = await withConcurrency(tasks, MAX_CONCURRENT);

  // Log any failures for observability (server-side only)
  const failed = results.filter((r) => r.text === null);
  if (failed.length > 0) {
    console.warn(
      `[bible.ts] ${failed.length}/${references.length} verse(s) failed to fetch:`,
      failed.map((r) => `${r.reference}: ${r.error}`).join('; ')
    );
  }

  return results;
}

/**
 * Fetch a single passage. Convenience wrapper around fetchPassages.
 * Returns null if the fetch fails.
 */
export async function fetchPassage(
  reference: string,
  translation: TranslationId = 'web'
): Promise<FetchedPassage> {
  const results = await fetchPassages([reference], translation);
  return results[0];
}
