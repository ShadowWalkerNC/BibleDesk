/**
 * lib/lexicon.ts — Lexicon & Cross-Reference Engine (SERVER & NODE ENV)
 *
 * Provides instant offline access to:
 * - Strong's Greek Dictionary (5,523 definitions)
 * - Strong's Hebrew Dictionary (8,674 definitions)
 * - Treasury of Scripture Knowledge (TSK) Cross References (29,336 indexed verses)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StrongsDefinition {
  number: string;
  lemma: string;
  translit: string;
  pronunciation?: string;
  derivation?: string;
  strongs_def: string;
  kjv_def: string;
}

let greekCache: Record<string, StrongsDefinition> | null = null;
let hebrewCache: Record<string, StrongsDefinition> | null = null;
let crossRefCache: Record<string, string[]> | null = null;

function loadGreek(): Record<string, StrongsDefinition> {
  if (greekCache) return greekCache;
  try {
    const file = path.join(process.cwd(), 'src', 'data', 'lexicon', 'greek.json');
    if (fs.existsSync(file)) {
      greekCache = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return greekCache!;
    }
  } catch (e) {
    console.error('[lexicon] Error loading greek.json:', e);
  }
  return {};
}

function loadHebrew(): Record<string, StrongsDefinition> {
  if (hebrewCache) return hebrewCache;
  try {
    const file = path.join(process.cwd(), 'src', 'data', 'lexicon', 'hebrew.json');
    if (fs.existsSync(file)) {
      hebrewCache = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return hebrewCache!;
    }
  } catch (e) {
    console.error('[lexicon] Error loading hebrew.json:', e);
  }
  return {};
}

function loadCrossRefs(): Record<string, string[]> {
  if (crossRefCache) return crossRefCache;
  try {
    const file = path.join(process.cwd(), 'src', 'data', 'lexicon', 'cross_references.json');
    if (fs.existsSync(file)) {
      crossRefCache = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return crossRefCache!;
    }
  } catch (e) {
    console.error('[lexicon] Error loading cross_references.json:', e);
  }
  return {};
}

/**
 * Look up a Strong's number (e.g. "G2889", "H7225", "2889", "g3056").
 */
export function getStrongsDefinition(strongsTag: string): StrongsDefinition | null {
  const norm = strongsTag.trim().toUpperCase();
  if (norm.startsWith('G')) {
    const gDict = loadGreek();
    return gDict[norm] || gDict[norm.replace('G0', 'G')] || null;
  }
  if (norm.startsWith('H')) {
    const hDict = loadHebrew();
    return hDict[norm] || hDict[norm.replace('H0', 'H')] || null;
  }

  // If no prefix, check Greek first then Hebrew
  const gDict = loadGreek();
  if (gDict[`G${norm}`]) return gDict[`G${norm}`];
  const hDict = loadHebrew();
  if (hDict[`H${norm}`]) return hDict[`H${norm}`];

  return null;
}

/**
 * Canonical book names exactly as they appear in cross_references.json keys.
 */
const CANONICAL_BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah',
  'Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah',
  'Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum',
  'Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John',
  'Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
  'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
];

/**
 * Common book abbreviations (punctuation/case-insensitive), e.g. "jn" -> "John",
 * "1jn" -> "1 John", "ps" -> "Psalms".
 */
const BOOK_ABBREVIATIONS: Record<string, string> = {
  gen: 'Genesis', exo: 'Exodus', ex: 'Exodus', lev: 'Leviticus', num: 'Numbers',
  deut: 'Deuteronomy', de: 'Deuteronomy', dt: 'Deuteronomy', josh: 'Joshua',
  judg: 'Judges', jdgs: 'Judges', ruth: 'Ruth',
  '1sam': '1 Samuel', '2sam': '2 Samuel',
  '1kgs': '1 Kings', '2kgs': '2 Kings', '1kings': '1 Kings', '2kings': '2 Kings',
  '1chr': '1 Chronicles', '2chr': '2 Chronicles', '1chron': '1 Chronicles', '2chron': '2 Chronicles',
  ezra: 'Ezra', neh: 'Nehemiah', est: 'Esther', esth: 'Esther', job: 'Job',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', psalms: 'Psalms',
  prov: 'Proverbs', pr: 'Proverbs', eccl: 'Ecclesiastes', ecc: 'Ecclesiastes',
  song: 'Song of Solomon', sos: 'Song of Solomon', sg: 'Song of Solomon',
  isa: 'Isaiah', is: 'Isaiah', jer: 'Jeremiah', je: 'Jeremiah', lam: 'Lamentations',
  ezek: 'Ezekiel', eze: 'Ezekiel', dan: 'Daniel', da: 'Daniel',
  hos: 'Hosea', joel: 'Joel', amos: 'Amos', obad: 'Obadiah', ob: 'Obadiah',
  jonah: 'Jonah', jon: 'Jonah', mic: 'Micah', mi: 'Micah', nah: 'Nahum', na: 'Nahum',
  hab: 'Habakkuk', zeph: 'Zephaniah', zep: 'Zephaniah', hag: 'Haggai', hg: 'Haggai',
  zech: 'Zechariah', zec: 'Zechariah', mal: 'Malachi',
  mt: 'Matthew', matt: 'Matthew', mk: 'Mark', mrk: 'Mark', lk: 'Luke', luk: 'Luke',
  jn: 'John', jhn: 'John', acts: 'Acts', ac: 'Acts', rom: 'Romans', ro: 'Romans',
  '1cor': '1 Corinthians', '2cor': '2 Corinthians',
  gal: 'Galatians', ga: 'Galatians', eph: 'Ephesians', ephes: 'Ephesians',
  phil: 'Philippians', php: 'Philippians', col: 'Colossians',
  '1thess': '1 Thessalonians', '2thess': '2 Thessalonians',
  '1tim': '1 Timothy', '2tim': '2 Timothy', tit: 'Titus', ti: 'Titus',
  phlm: 'Philemon', phm: 'Philemon', heb: 'Hebrews', jas: 'James', jm: 'James',
  '1pet': '1 Peter', '2pet': '2 Peter',
  '1jn': '1 John', '2jn': '2 John', '3jn': '3 John',
  jude: 'Jude', jud: 'Jude', rev: 'Revelation', re: 'Revelation', apoc: 'Revelation',
};

/**
 * Normalize a human-typed verse reference to the canonical TSK key format
 * ("John 3:16"). Case-insensitive, tolerant of extra whitespace and punctuation,
 * and expands common book abbreviations ("Jn" -> "John", "1Jn" -> "1 John",
 * "Ps" -> "Psalms"). Unrecognized input is returned in best-effort form.
 */
export function normalizeVerseRef(verseRef: string): string {
  const cleaned = verseRef.trim().replace(/\s+/g, ' ');
  const m = cleaned.match(/^(.*?)\s*(\d+\s*:\s*\d+.*)$/);
  let bookPart: string;
  let rest: string;
  if (m) {
    bookPart = m[1].trim();
    rest = m[2].replace(/\s*:\s*/, ':').replace(/\s+/g, ' ');
  } else {
    bookPart = cleaned;
    rest = '';
  }
  const key = bookPart.toLowerCase().replace(/[^a-z0-9]/g, '');
  let book = BOOK_ABBREVIATIONS[key];
  if (!book) {
    book = CANONICAL_BOOKS.find(
      (b) => b.toLowerCase().replace(/[^a-z0-9]/g, '') === key
    ) ?? bookPart;
  }
  return rest ? `${book} ${rest}` : book;
}

/**
 * Look up curated Treasury of Scripture Knowledge cross-references for a verse.
 * Accepts human input like "Jn 3:16" or "ps 23:1" (see normalizeVerseRef).
 */
export function getCrossReferences(verseRef: string): string[] {
  const map = loadCrossRefs();
  const norm = normalizeVerseRef(verseRef);
  return map[norm] || map[verseRef.trim()] || [];
}
