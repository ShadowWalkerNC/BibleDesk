/**
 * scripts/ingest-bible-data.ts
 *
 * Downloads and normalizes public-domain Bible translations into the standardized
 * BibleDesk local module format.
 *
 * Supported local modules:
 * - kjv: King James Version (1769)
 * - asv: American Standard Version (1901)
 * - web: World English Bible
 * - bbe: Bible in Basic English
 * - darby: Darby Translation
 * - ylt: Young's Literal Translation
 */

import * as fs from 'fs';
import * as path from 'path';

interface StandardVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface StandardChapter {
  chapter: number;
  verses: StandardVerse[];
}

interface StandardBook {
  book_id: string;
  book_name: string;
  testament: 'OT' | 'NT';
  chapters: StandardChapter[];
}

interface StandardBibleModule {
  id: string;
  name: string;
  description: string;
  books: StandardBook[];
}

const CANONICAL_BOOKS: Array<{ id: string; name: string; testament: 'OT' | 'NT'; aliases: string[] }> = [
  // Old Testament
  { id: 'GEN', name: 'Genesis', testament: 'OT', aliases: ['genesis', 'gen', 'gn'] },
  { id: 'EXO', name: 'Exodus', testament: 'OT', aliases: ['exodus', 'exo', 'ex'] },
  { id: 'LEV', name: 'Leviticus', testament: 'OT', aliases: ['leviticus', 'lev', 'lv'] },
  { id: 'NUM', name: 'Numbers', testament: 'OT', aliases: ['numbers', 'num', 'nm'] },
  { id: 'DEU', name: 'Deuteronomy', testament: 'OT', aliases: ['deuteronomy', 'deut', 'deu', 'dt'] },
  { id: 'JOS', name: 'Joshua', testament: 'OT', aliases: ['joshua', 'josh', 'jos', 'js'] },
  { id: 'JDG', name: 'Judges', testament: 'OT', aliases: ['judges', 'judg', 'jdg', 'jg'] },
  { id: 'RUT', name: 'Ruth', testament: 'OT', aliases: ['ruth', 'rut', 'ru'] },
  { id: '1SA', name: '1 Samuel', testament: 'OT', aliases: ['1 samuel', '1samuel', '1 sam', '1sa', 'i samuel', '1 s'] },
  { id: '2SA', name: '2 Samuel', testament: 'OT', aliases: ['2 samuel', '2samuel', '2 sam', '2sa', 'ii samuel', '2 s'] },
  { id: '1KI', name: '1 Kings', testament: 'OT', aliases: ['1 kings', '1kings', '1 kgs', '1ki', 'i kings', '1 k'] },
  { id: '2KI', name: '2 Kings', testament: 'OT', aliases: ['2 kings', '2kings', '2 kgs', '2ki', 'ii kings', '2 k'] },
  { id: '1CH', name: '1 Chronicles', testament: 'OT', aliases: ['1 chronicles', '1chronicles', '1 chron', '1ch', 'i chronicles', '1 ch'] },
  { id: '2CH', name: '2 Chronicles', testament: 'OT', aliases: ['2 chronicles', '2chronicles', '2 chron', '2ch', 'ii chronicles', '2 ch'] },
  { id: 'EZR', name: 'Ezra', testament: 'OT', aliases: ['ezra', 'ezr'] },
  { id: 'NEH', name: 'Nehemiah', testament: 'OT', aliases: ['nehemiah', 'neh', 'ne'] },
  { id: 'EST', name: 'Esther', testament: 'OT', aliases: ['esther', 'esth', 'est', 'es'] },
  { id: 'JOB', name: 'Job', testament: 'OT', aliases: ['job', 'jb'] },
  { id: 'PSA', name: 'Psalms', testament: 'OT', aliases: ['psalms', 'psalm', 'psa', 'ps', 'pss'] },
  { id: 'PRO', name: 'Proverbs', testament: 'OT', aliases: ['proverbs', 'prov', 'pro', 'pr'] },
  { id: 'ECC', name: 'Ecclesiastes', testament: 'OT', aliases: ['ecclesiastes', 'eccles', 'ecc', 'ec'] },
  { id: 'SNG', name: 'Song of Solomon', testament: 'OT', aliases: ['song of solomon', 'song of songs', 'canticles', 'sng', 'sos', 'so'] },
  { id: 'ISA', name: 'Isaiah', testament: 'OT', aliases: ['isaiah', 'isa', 'is'] },
  { id: 'JER', name: 'Jeremiah', testament: 'OT', aliases: ['jeremiah', 'jer', 'je'] },
  { id: 'LAM', name: 'Lamentations', testament: 'OT', aliases: ['lamentations', 'lam', 'la'] },
  { id: 'EZK', name: 'Ezekiel', testament: 'OT', aliases: ['ezekiel', 'ezek', 'ezk'] },
  { id: 'DAN', name: 'Daniel', testament: 'OT', aliases: ['daniel', 'dan', 'da'] },
  { id: 'HOS', name: 'Hosea', testament: 'OT', aliases: ['hosea', 'hos', 'ho'] },
  { id: 'JOL', name: 'Joel', testament: 'OT', aliases: ['joel', 'jol', 'jl'] },
  { id: 'AMO', name: 'Amos', testament: 'OT', aliases: ['amos', 'amo', 'am'] },
  { id: 'OBA', name: 'Obadiah', testament: 'OT', aliases: ['obadiah', 'oba', 'ob'] },
  { id: 'JON', name: 'Jonah', testament: 'OT', aliases: ['jonah', 'jon', 'jh'] },
  { id: 'MIC', name: 'Micah', testament: 'OT', aliases: ['micah', 'mic', 'mc'] },
  { id: 'NAM', name: 'Nahum', testament: 'OT', aliases: ['nahum', 'nah', 'nam'] },
  { id: 'HAB', name: 'Habakkuk', testament: 'OT', aliases: ['habakkuk', 'hab', 'hk'] },
  { id: 'ZEP', name: 'Zephaniah', testament: 'OT', aliases: ['zephaniah', 'zeph', 'zep', 'zp'] },
  { id: 'HAG', name: 'Haggai', testament: 'OT', aliases: ['haggai', 'hag', 'hg'] },
  { id: 'ZEC', name: 'Zechariah', testament: 'OT', aliases: ['zechariah', 'zech', 'zec', 'zc'] },
  { id: 'MAL', name: 'Malachi', testament: 'OT', aliases: ['malachi', 'mal', 'ml'] },

  // New Testament
  { id: 'MAT', name: 'Matthew', testament: 'NT', aliases: ['matthew', 'matt', 'mat', 'mt'] },
  { id: 'MRK', name: 'Mark', testament: 'NT', aliases: ['mark', 'mrk', 'mk'] },
  { id: 'LUK', name: 'Luke', testament: 'NT', aliases: ['luke', 'luk', 'lk'] },
  { id: 'JHN', name: 'John', testament: 'NT', aliases: ['john', 'jhn', 'jn'] },
  { id: 'ACT', name: 'Acts', testament: 'NT', aliases: ['acts', 'act', 'ac'] },
  { id: 'ROM', name: 'Romans', testament: 'NT', aliases: ['romans', 'rom', 'ro', 'rm'] },
  { id: '1CO', name: '1 Corinthians', testament: 'NT', aliases: ['1 corinthians', '1corinthians', '1 cor', '1co', 'i corinthians', '1 co'] },
  { id: '2CO', name: '2 Corinthians', testament: 'NT', aliases: ['2 corinthians', '2corinthians', '2 cor', '2co', 'ii corinthians', '2 co'] },
  { id: 'GAL', name: 'Galatians', testament: 'NT', aliases: ['galatians', 'gal', 'ga'] },
  { id: 'EPH', name: 'Ephesians', testament: 'NT', aliases: ['ephesians', 'eph', 'ep'] },
  { id: 'PHP', name: 'Philippians', testament: 'NT', aliases: ['philippians', 'phil', 'php', 'pp'] },
  { id: 'COL', name: 'Colossians', testament: 'NT', aliases: ['colossians', 'col', 'co'] },
  { id: '1TH', name: '1 Thessalonians', testament: 'NT', aliases: ['1 thessalonians', '1thessalonians', '1 thess', '1th', 'i thessalonians', '1 th'] },
  { id: '2TH', name: '2 Thessalonians', testament: 'NT', aliases: ['2 thessalonians', '2thessalonians', '2 thess', '2th', 'ii thessalonians', '2 th'] },
  { id: '1TI', name: '1 Timothy', testament: 'NT', aliases: ['1 timothy', '1timothy', '1 tim', '1ti', 'i timothy', '1 ti'] },
  { id: '2TI', name: '2 Timothy', testament: 'NT', aliases: ['2 timothy', '2timothy', '2 tim', '2ti', 'ii timothy', '2 ti'] },
  { id: 'TIT', name: 'Titus', testament: 'NT', aliases: ['titus', 'tit', 'ti'] },
  { id: 'PHM', name: 'Philemon', testament: 'NT', aliases: ['philemon', 'philem', 'phm', 'pm'] },
  { id: 'HEB', name: 'Hebrews', testament: 'NT', aliases: ['hebrews', 'heb', 'he'] },
  { id: 'JAS', name: 'James', testament: 'NT', aliases: ['james', 'jas', 'jm'] },
  { id: '1PE', name: '1 Peter', testament: 'NT', aliases: ['1 peter', '1peter', '1 pet', '1pe', 'i peter', '1 pe'] },
  { id: '2PE', name: '2 Peter', testament: 'NT', aliases: ['2 peter', '2peter', '2 pet', '2pe', 'ii peter', '2 pe'] },
  { id: '1JN', name: '1 John', testament: 'NT', aliases: ['1 john', '1john', '1 jn', '1jn', 'i john', '1 j'] },
  { id: '2JN', name: '2 John', testament: 'NT', aliases: ['2 john', '2john', '2 jn', '2jn', 'ii john', '2 j'] },
  { id: '3JN', name: '3 John', testament: 'NT', aliases: ['3 john', '3john', '3 jn', '3jn', 'iii john', '3 j'] },
  { id: 'JUD', name: 'Jude', testament: 'NT', aliases: ['jude', 'jud', 'jd'] },
  { id: 'REV', name: 'Revelation', testament: 'NT', aliases: ['revelation', 'revelation of john', 'rev', 're', 'apocalypse'] },
];

function findCanonicalBook(input: string) {
  const norm = input.trim().toLowerCase();
  for (const book of CANONICAL_BOOKS) {
    if (book.name.toLowerCase() === norm || book.id.toLowerCase() === norm || book.aliases.includes(norm)) {
      return book;
    }
  }
  return null;
}

async function fetchScrollmapperFormat(url: string, id: string, name: string, desc: string): Promise<StandardBibleModule> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const data = await res.json();

  const books: StandardBook[] = [];

  for (const canon of CANONICAL_BOOKS) {
    const rawBook = data.books.find((b: any) => {
      const match = findCanonicalBook(b.name);
      return match && match.id === canon.id;
    });

    if (!rawBook) {
      console.warn(`[Scrollmapper] Book missing for ${id}: ${canon.name}`);
      continue;
    }

    const standardChapters: StandardChapter[] = [];
    for (let cIdx = 0; cIdx < rawBook.chapters.length; cIdx++) {
      const ch = rawBook.chapters[cIdx];
      const chNum = ch.chapter ?? (cIdx + 1);
      const verses: StandardVerse[] = [];

      for (let vIdx = 0; vIdx < ch.verses.length; vIdx++) {
        const v = ch.verses[vIdx];
        const vNum = v.verse ?? (vIdx + 1);
        verses.push({
          book_id: canon.id,
          book_name: canon.name,
          chapter: chNum,
          verse: vNum,
          text: (v.text || '').trim(),
        });
      }

      standardChapters.push({
        chapter: chNum,
        verses,
      });
    }

    books.push({
      book_id: canon.id,
      book_name: canon.name,
      testament: canon.testament,
      chapters: standardChapters,
    });
  }

  return {
    id,
    name,
    description: desc,
    books,
  };
}

async function fetchThiagobodrukFormat(url: string, id: string, name: string, desc: string): Promise<StandardBibleModule> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const text = await res.text();
  const rawBooks = JSON.parse(text.replace(/^\uFEFF/, ''));

  const books: StandardBook[] = [];

  for (let i = 0; i < CANONICAL_BOOKS.length; i++) {
    const canon = CANONICAL_BOOKS[i];
    const rawBook = rawBooks.find((b: any) => {
      const match = findCanonicalBook(b.name || b.abbrev || '');
      return match && match.id === canon.id;
    }) || rawBooks[i];

    if (!rawBook) {
      console.warn(`[Thiagobodruk] Book missing for ${id}: ${canon.name}`);
      continue;
    }

    const standardChapters: StandardChapter[] = [];
    for (let cIdx = 0; cIdx < rawBook.chapters.length; cIdx++) {
      const chNum = cIdx + 1;
      const rawVerses = rawBook.chapters[cIdx];
      const verses: StandardVerse[] = [];

      for (let vIdx = 0; vIdx < rawVerses.length; vIdx++) {
        const vNum = vIdx + 1;
        verses.push({
          book_id: canon.id,
          book_name: canon.name,
          chapter: chNum,
          verse: vNum,
          text: (rawVerses[vIdx] || '').trim(),
        });
      }

      standardChapters.push({
        chapter: chNum,
        verses,
      });
    }

    books.push({
      book_id: canon.id,
      book_name: canon.name,
      testament: canon.testament,
      chapters: standardChapters,
    });
  }

  return {
    id,
    name,
    description: desc,
    books,
  };
}

async function fetchTehShrikeWebFormat(id: string, name: string, desc: string): Promise<StandardBibleModule> {
  const books: StandardBook[] = [];
  const filenames = [
    'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
    'joshua', 'judges', 'ruth', '1samuel', '2samuel', '1kings', '2kings',
    '1chronicles', '2chronicles', 'ezra', 'nehemiah', 'esther', 'job',
    'psalms', 'proverbs', 'ecclesiastes', 'songofsolomon', 'isaiah', 'jeremiah',
    'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah',
    'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
    'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1corinthians', '2corinthians',
    'galatians', 'ephesians', 'philippians', 'colossians', '1thessalonians', '2thessalonians',
    '1timothy', '2timothy', 'titus', 'philemon', 'hebrews', 'james', '1peter', '2peter',
    '1john', '2john', '3john', 'jude', 'revelation'
  ];

  for (let i = 0; i < CANONICAL_BOOKS.length; i++) {
    const canon = CANONICAL_BOOKS[i];
    const filename = filenames[i];
    const url = `https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json/${filename}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching WEB ${filename}`);
    const items = await res.json();

    const chapterMap = new Map<number, Map<number, string>>();

    for (const item of items) {
      if (item.type === 'paragraph text' || item.type === 'verse' || item.type === 'line text') {
        const ch = item.chapterNumber;
        const v = item.verseNumber;
        if (!ch || !v) continue;
        if (!chapterMap.has(ch)) chapterMap.set(ch, new Map());
        const vMap = chapterMap.get(ch)!;
        const prev = vMap.get(v) || '';
        vMap.set(v, (prev + (item.value || '')).trim());
      }
    }

    const standardChapters: StandardChapter[] = [];
    const sortedChapters = Array.from(chapterMap.keys()).sort((a, b) => a - b);

    for (const chNum of sortedChapters) {
      const vMap = chapterMap.get(chNum)!;
      const sortedVerses = Array.from(vMap.keys()).sort((a, b) => a - b);
      const verses: StandardVerse[] = [];

      for (const vNum of sortedVerses) {
        verses.push({
          book_id: canon.id,
          book_name: canon.name,
          chapter: chNum,
          verse: vNum,
          text: vMap.get(vNum) || '',
        });
      }

      standardChapters.push({
        chapter: chNum,
        verses,
      });
    }

    books.push({
      book_id: canon.id,
      book_name: canon.name,
      testament: canon.testament,
      chapters: standardChapters,
    });
  }

  return {
    id,
    name,
    description: desc,
    books,
  };
}

async function main() {
  const outDir = path.join(process.cwd(), 'src', 'data', 'bibles');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Ingesting KJV...');
  const kjv = await fetchThiagobodrukFormat(
    'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json',
    'kjv',
    'King James Version (1769)',
    'Classic, public domain'
  );
  fs.writeFileSync(path.join(outDir, 'kjv.json'), JSON.stringify(kjv));
  console.log(`✓ KJV saved (${kjv.books.length} books)`);

  console.log('Ingesting ASV...');
  const asv = await fetchScrollmapperFormat(
    'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/ASV.json',
    'asv',
    'American Standard Version (1901)',
    'Literal, public domain'
  );
  fs.writeFileSync(path.join(outDir, 'asv.json'), JSON.stringify(asv));
  console.log(`✓ ASV saved (${asv.books.length} books)`);

  console.log('Ingesting WEB...');
  const web = await fetchTehShrikeWebFormat(
    'web',
    'World English Bible',
    'Modern, public domain'
  );
  fs.writeFileSync(path.join(outDir, 'web.json'), JSON.stringify(web));
  console.log(`✓ WEB saved (${web.books.length} books)`);

  console.log('Ingesting BBE...');
  const bbe = await fetchThiagobodrukFormat(
    'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_bbe.json',
    'bbe',
    'Bible in Basic English',
    'Simple English vocabulary, public domain'
  );
  fs.writeFileSync(path.join(outDir, 'bbe.json'), JSON.stringify(bbe));
  console.log(`✓ BBE saved (${bbe.books.length} books)`);

  console.log('Ingesting Darby...');
  const darby = await fetchScrollmapperFormat(
    'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/Darby.json',
    'darby',
    'Darby Bible',
    '19th Century Translation, public domain'
  );
  fs.writeFileSync(path.join(outDir, 'darby.json'), JSON.stringify(darby));
  console.log(`✓ Darby saved (${darby.books.length} books)`);

  console.log('Ingesting YLT...');
  const ylt = await fetchScrollmapperFormat(
    'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/YLT.json',
    'ylt',
    "Young's Literal Translation",
    'Strict word-for-word, public domain'
  );
  fs.writeFileSync(path.join(outDir, 'ylt.json'), JSON.stringify(ylt));
  console.log(`✓ YLT saved (${ylt.books.length} books)`);

  console.log('\nAll 6 public domain translations ingested successfully!');
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
