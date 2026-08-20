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
 * Look up curated Treasury of Scripture Knowledge cross-references for a verse.
 * e.g. "John 3:16" or "Genesis 1:1"
 */
export function getCrossReferences(verseRef: string): string[] {
  const map = loadCrossRefs();
  const norm = verseRef.trim();
  return map[norm] || [];
}
