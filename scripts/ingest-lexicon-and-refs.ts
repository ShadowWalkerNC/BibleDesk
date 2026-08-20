/**
 * scripts/ingest-lexicon-and-refs.ts
 *
 * Ingests:
 * 1. OpenScriptures Strong's Greek Dictionary (5,523 entries)
 * 2. OpenScriptures Strong's Hebrew Dictionary (8,674 entries)
 * 3. Treasury of Scripture Knowledge (TSK) Cross References across all 66 books (~29,336 indexed verses)
 */

import * as fs from 'fs';
import * as path from 'path';

interface StrongsEntry {
  number: string;
  lemma: string;
  translit: string;
  pronunciation?: string;
  derivation?: string;
  strongs_def: string;
  kjv_def: string;
}

async function main() {
  const outDir = path.join(process.cwd(), 'src', 'data', 'lexicon');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Ingesting OpenScriptures Strongs Greek Dictionary...');
  const grkRes = await fetch('https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js');
  const grkText = await grkRes.text();
  const parseGreek = new Function('module', 'exports', 'strongsGreekDictionary', grkText + '; return (typeof strongsGreekDictionary !== "undefined" ? strongsGreekDictionary : module.exports);');
  const modG: any = { exports: {} };
  const rawGreek = parseGreek(modG, modG.exports, {});

  const cleanGreek: Record<string, StrongsEntry> = {};
  for (const [key, val] of Object.entries(rawGreek as Record<string, any>)) {
    cleanGreek[key] = {
      number: key,
      lemma: val.lemma || '',
      translit: val.translit || '',
      derivation: val.derivation || '',
      strongs_def: (val.strongs_def || '').trim(),
      kjv_def: (val.kjv_def || '').trim(),
    };
  }
  fs.writeFileSync(path.join(outDir, 'greek.json'), JSON.stringify(cleanGreek));
  console.log(`✓ Greek Strongs saved (${Object.keys(cleanGreek).length} entries)`);

  console.log('Ingesting OpenScriptures Strongs Hebrew Dictionary...');
  const hebRes = await fetch('https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js');
  const hebText = await hebRes.text();
  const parseHebrew = new Function('module', 'exports', 'strongsHebrewDictionary', hebText + '; return (typeof strongsHebrewDictionary !== "undefined" ? strongsHebrewDictionary : module.exports);');
  const modH: any = { exports: {} };
  const rawHebrew = parseHebrew(modH, modH.exports, {});

  const cleanHebrew: Record<string, StrongsEntry> = {};
  for (const [key, val] of Object.entries(rawHebrew as Record<string, any>)) {
    cleanHebrew[key] = {
      number: key,
      lemma: val.lemma || '',
      translit: val.xlit || val.translit || '',
      pronunciation: val.pron || '',
      derivation: val.derivation || '',
      strongs_def: (val.strongs_def || '').trim(),
      kjv_def: (val.kjv_def || '').trim(),
    };
  }
  fs.writeFileSync(path.join(outDir, 'hebrew.json'), JSON.stringify(cleanHebrew));
  console.log(`✓ Hebrew Strongs saved (${Object.keys(cleanHebrew).length} entries)`);

  console.log('Ingesting Cross References (Treasury of Scripture Knowledge)...');
  const crossRefMap: Record<string, string[]> = {};
  for (let i = 0; i <= 6; i++) {
    const url = `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/extras/cross_references_${i}.json`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const json = await res.json();
    const list = json.cross_references || [];
    for (const item of list) {
      if (!item.from_verse || !item.to_verse || item.votes < 0) continue;
      const fromKey = `${item.from_verse.book} ${item.from_verse.chapter}:${item.from_verse.verse}`;
      if (!crossRefMap[fromKey]) crossRefMap[fromKey] = [];

      for (const target of item.to_verse) {
        let toKey = `${target.book} ${target.chapter}:${target.verse_start}`;
        if (target.verse_end && target.verse_end !== target.verse_start) {
          toKey += `-${target.verse_end}`;
        }
        if (!crossRefMap[fromKey].includes(toKey)) {
          crossRefMap[fromKey].push(toKey);
        }
      }
    }
  }

  const optimizedRefs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(crossRefMap)) {
    optimizedRefs[k] = v.slice(0, 15);
  }

  fs.writeFileSync(path.join(outDir, 'cross_references.json'), JSON.stringify(optimizedRefs));
  console.log(`✓ Cross References saved (${Object.keys(optimizedRefs).length} verses indexed)`);
}

main().catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
