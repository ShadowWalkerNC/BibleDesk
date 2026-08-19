/**
 * lib/bible-local.ts — Local Bible Engine (SERVER & NODE ENV)
 *
 * Provides offline Scripture access, fast random chapter lookups, multi-translation
 * verse comparisons, and local full-text search across bundled public-domain translations.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BiblePassage, BibleVerse, TranslationId } from '@/types';
import { TRANSLATIONS } from '@/types';
import { BIBLE_BOOKS } from './books';

export interface LocalVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface LocalChapter {
  chapter: number;
  verses: LocalVerse[];
}

export interface LocalBook {
  book_id: string;
  book_name: string;
  testament: 'OT' | 'NT';
  chapters: LocalChapter[];
}

export interface LocalBibleModule {
  id: string;
  name: string;
  description: string;
  books: LocalBook[];
}

// In-memory cache for loaded Bible modules
const moduleCache = new Map<TranslationId, LocalBibleModule>();

/**
 * Load a translation module from the local disk.
 */
export function getLocalBibleModule(translation: TranslationId = 'web'): LocalBibleModule | null {
  if (moduleCache.has(translation)) {
    return moduleCache.get(translation)!;
  }

  const filePath = path.join(process.cwd(), 'src', 'data', 'bibles', `${translation}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed: LocalBibleModule = JSON.parse(raw);
    moduleCache.set(translation, parsed);
    return parsed;
  } catch (err) {
    console.error(`[bible-local] Error loading local module ${translation}:`, err);
    return null;
  }
}

/**
 * Standardize book name resolution.
 */
export function matchBook(module: LocalBibleModule, bookName: string): LocalBook | null {
  const norm = bookName.trim().toLowerCase();
  return (
    module.books.find(
      (b) =>
        b.book_name.toLowerCase() === norm ||
        b.book_id.toLowerCase() === norm ||
        b.book_name.toLowerCase().replace(/\s+/g, '') === norm.replace(/\s+/g, '')
    ) || null
  );
}

/**
 * Fetch a full chapter from the local Bible module.
 */
export function getLocalChapter(
  bookName: string,
  chapterNumber: number,
  translation: TranslationId = 'web'
): BiblePassage | null {
  const mod = getLocalBibleModule(translation) || getLocalBibleModule('web') || getLocalBibleModule('kjv');
  if (!mod) return null;

  const book = matchBook(mod, bookName);
  if (!book) return null;

  const chapter = book.chapters.find((c) => c.chapter === chapterNumber);
  if (!chapter || !chapter.verses || chapter.verses.length === 0) return null;

  const verses: BibleVerse[] = chapter.verses.map((v) => ({
    book_id: v.book_id,
    book_name: book.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text,
  }));

  const fullText = verses.map((v) => `${v.verse} ${v.text}`).join(' ');

  return {
    reference: `${book.book_name} ${chapterNumber}`,
    verses,
    text: fullText,
    translation_id: mod.id,
    translation_name: mod.name,
    translation_note: mod.description,
  };
}

/**
 * Parse standard verse references like "John 3:16", "Romans 8:28-30", "Gen 1:1".
 */
export function parseReference(reference: string): {
  book: string;
  chapter: number;
  startVerse?: number;
  endVerse?: number;
} | null {
  const trimmed = reference.trim();
  // Regex to match: [Optional Book Number] [Book Name] [Chapter]:[StartVerse]-[EndVerse] or [Chapter]:[Verse] or just [Chapter]
  const match = trimmed.match(/^((?:\d\s+)?[a-zA-Z\s]+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) return null;

  const book = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const startVerse = match[3] ? parseInt(match[3], 10) : undefined;
  const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

  return { book, chapter, startVerse, endVerse };
}

/**
 * Fetch a specific passage or verse range locally.
 */
export function getLocalPassage(
  reference: string,
  translation: TranslationId = 'web'
): BiblePassage | null {
  const parsed = parseReference(reference);
  if (!parsed) return null;

  const mod = getLocalBibleModule(translation) || getLocalBibleModule('web') || getLocalBibleModule('kjv');
  if (!mod) return null;

  const book = matchBook(mod, parsed.book);
  if (!book) return null;

  const chapter = book.chapters.find((c) => c.chapter === parsed.chapter);
  if (!chapter) return null;

  let selectedVerses = chapter.verses;
  if (parsed.startVerse !== undefined) {
    const end = parsed.endVerse ?? parsed.startVerse;
    selectedVerses = chapter.verses.filter((v) => v.verse >= parsed.startVerse! && v.verse <= end);
  }

  if (selectedVerses.length === 0) return null;

  const verses: BibleVerse[] = selectedVerses.map((v) => ({
    book_id: v.book_id,
    book_name: book.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text,
  }));

  const fullText = verses.map((v) => `${v.verse} ${v.text}`).join(' ');

  let refStr = `${book.book_name} ${parsed.chapter}`;
  if (parsed.startVerse !== undefined) {
    refStr += `:${parsed.startVerse}`;
    if (parsed.endVerse && parsed.endVerse !== parsed.startVerse) {
      refStr += `-${parsed.endVerse}`;
    }
  }

  return {
    reference: refStr,
    verses,
    text: fullText,
    translation_id: mod.id,
    translation_name: mod.name,
    translation_note: mod.description,
  };
}

export interface SearchResultItem {
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
}

/**
 * Search local Bible text for keywords.
 */
export function searchLocalBible(
  query: string,
  translation: TranslationId = 'web',
  limit: number = 30
): { results: SearchResultItem[]; total: number } {
  const mod = getLocalBibleModule(translation) || getLocalBibleModule('web') || getLocalBibleModule('kjv');
  if (!mod) return { results: [], total: 0 };

  const q = query.trim().toLowerCase();
  if (q.length < 2) return { results: [], total: 0 };

  const keywords = q.split(/\s+/).filter(Boolean);
  const matches: SearchResultItem[] = [];

  for (const book of mod.books) {
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        const verseTextLower = verse.text.toLowerCase();
        
        // Match either full phrase or all keywords
        const phraseMatch = verseTextLower.includes(q);
        const allKeywordsMatch = keywords.every((kw) => verseTextLower.includes(kw));

        if (phraseMatch || allKeywordsMatch) {
          matches.push({
            book: book.book_name,
            chapter: chapter.chapter,
            verse: verse.verse,
            reference: `${book.book_name} ${chapter.chapter}:${verse.verse}`,
            text: verse.text,
          });
        }
      }
    }
  }

  return {
    results: matches.slice(0, limit),
    total: matches.length,
  };
}
