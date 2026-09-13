// BibleDesk — Universal Cross-Referencing & Indexing Engine
// Binds Greek/Hebrew Strong's numbers <-> Scripture passages <->
// Prayers <-> Sermons <-> Historical Catechisms.

import { BIBLE_BOOKS } from '@/lib/books';
import { searchCatechisms } from '@/lib/catechismData';
import { searchDoctrines } from '@/lib/doctrinesData';
import type {
  ConnectedKnowledge,
  ConnectedVerse,
  ConnectedStrongs,
  ConnectedPrayer,
  ConnectedSermon,
  ConnectedCatechism,
} from '@/types';
import type { PrayerCommitment } from '@/types/prayerCare';

// ─── Regex & Pattern Definitions ─────────────────────────────────────────────

// Build regex pattern matching all 66 Bible books and common abbreviations
const BOOK_NAMES = BIBLE_BOOKS.map(b => b.name);
const BOOK_ABBREVIATIONS: Record<string, string> = {
  gen: 'Genesis',
  ex: 'Exodus',
  exod: 'Exodus',
  lev: 'Leviticus',
  num: 'Numbers',
  deut: 'Deuteronomy',
  josh: 'Joshua',
  judg: 'Judges',
  ps: 'Psalms',
  psa: 'Psalms',
  psalm: 'Psalms',
  prov: 'Proverbs',
  eccl: 'Ecclesiastes',
  song: 'Song of Solomon',
  isa: 'Isaiah',
  jer: 'Jeremiah',
  lam: 'Lamentations',
  ezek: 'Ezekiel',
  dan: 'Daniel',
  hos: 'Hosea',
  matt: 'Matthew',
  mat: 'Matthew',
  mk: 'Mark',
  lk: 'Luke',
  jn: 'John',
  joh: 'John',
  act: 'Acts',
  rom: 'Romans',
  cor: 'Corinthians',
  gal: 'Galatians',
  eph: 'Ephesians',
  phil: 'Philippians',
  col: 'Colossians',
  thess: 'Thessalonians',
  tim: 'Timothy',
  tit: 'Titus',
  philem: 'Philemon',
  heb: 'Hebrews',
  jas: 'James',
  pet: 'Peter',
  rev: 'Revelation',
};

// Matches references like: "John 3:16", "Genesis 1:1", "1 Cor 13:4-8", "Rom 8:28"
const SCRIPTURE_REGEX = /\b((?:[123]\s+)?[A-Za-z]+)\.?\s+(\d+)(?::(\d+)(?:-(\d+))?)?\b/g;

// Matches Strong's numbers: "G2889", "H7225", "g26", "h1254"
const STRONGS_REGEX = /\b([GHgh])(\d{1,5})\b/g;

// Curated high-frequency Strong's mappings for common theological keywords
export const CURATED_STRONGS_MAP: Record<string, { code: string; lemma: string; transliteration: string; definition: string }> = {
  'G26': { code: 'G26', lemma: 'ἀγάπη', transliteration: 'agape', definition: 'Divine, unconditional, self-sacrificial love.' },
  'G5485': { code: 'G5485', lemma: 'χάρις', transliteration: 'charis', definition: 'Unmerited divine favor, goodwill, and gracious empowerment.' },
  'G2889': { code: 'G2889', lemma: 'κόσμος', transliteration: 'kosmos', definition: 'The world, orderly arrangement, universe, humanity in need of redemption.' },
  'G4151': { code: 'G4151', lemma: 'πνεῦμα', transliteration: 'pneuma', definition: 'Spirit, breath, wind; the Holy Spirit of God.' },
  'G3056': { code: 'G3056', lemma: 'λόγος', transliteration: 'logos', definition: 'The Word, divine discourse, reason; the incarnate Son of God (John 1:1).' },
  'G3439': { code: 'G3439', lemma: 'μονογενής', transliteration: 'monogenes', definition: 'Only-begotten, unique, one-of-a-kind in relationship to the Father.' },
  'G4102': { code: 'G4102', lemma: 'πίστις', transliteration: 'pistis', definition: 'Faith, conviction of divine truth, reliance upon Christ.' },
  'G1343': { code: 'G1343', lemma: 'δικαιοσύνη', transliteration: 'dikaiosyne', definition: 'Righteousness, justice, state of being declared right before God.' },
  'G2222': { code: 'G2222', lemma: 'ζωή', transliteration: 'zoe', definition: 'Life, life essential, eternal divine vitality.' },
  'H7225': { code: 'H7225', lemma: 'רֵאשִׁית', transliteration: 'bereshit', definition: 'Beginning, first, foremost in time or supremacy.' },
  'H2617': { code: 'H2617', lemma: 'חֶסֶד', transliteration: 'chesed', definition: 'Covenant loyalty, steadfast unfailing love, lovingkindness.' },
  'H1254': { code: 'H1254', lemma: 'בָּרָא', transliteration: 'bara', definition: 'To create (exclusive divine act of bringing into being ex nihilo).' },
  'H7965': { code: 'H7965', lemma: 'שָׁלוֹם', transliteration: 'shalom', definition: 'Peace, completeness, wholeness, welfare, reconciliation.' },
  'H136':  { code: 'H136',  lemma: 'אֲדֹנָי', transliteration: 'Adonai', definition: 'The Sovereign Lord, Ruler of all.' },
  'H3068': { code: 'H3068', lemma: 'יְהוָה', transliteration: 'Yahweh', definition: 'The self-existent, covenant-keeping God (I AM THAT I AM).' },
  'H430':  { code: 'H430',  lemma: 'אֱלֹהִים', transliteration: 'Elohim', definition: 'God, Supreme Deity, Creator of heaven and earth.' },
  'H7307': { code: 'H7307', lemma: 'רוּחַ', transliteration: 'ruach', definition: 'Breath, wind, Spirit of God hovering over creation.' },
};

// ─── Extractors ──────────────────────────────────────────────────────────────

export function extractScriptureReferences(text: string): string[] {
  if (!text) return [];
  const matches: string[] = [];
  const regex = new RegExp(SCRIPTURE_REGEX.source, 'g');
  let match;

  while ((match = regex.exec(text)) !== null) {
    const rawBook = match[1].trim();
    const chapter = match[2];
    const verseStart = match[3];
    const verseEnd = match[4];

    // Canonical lookup
    let canonicalBook = BOOK_NAMES.find(b => b.toLowerCase() === rawBook.toLowerCase());
    if (!canonicalBook) {
      const lowerRaw = rawBook.toLowerCase().replace(/[^a-z]/g, '');
      const abbrKey = Object.keys(BOOK_ABBREVIATIONS).find(k => lowerRaw.startsWith(k));
      if (abbrKey) {
        canonicalBook = BOOK_ABBREVIATIONS[abbrKey];
      }
    }

    if (canonicalBook) {
      const ref = verseStart
        ? (verseEnd ? `${canonicalBook} ${chapter}:${verseStart}-${verseEnd}` : `${canonicalBook} ${chapter}:${verseStart}`)
        : `${canonicalBook} ${chapter}`;
      if (!matches.includes(ref)) {
        matches.push(ref);
      }
    }
  }

  return matches;
}

export function extractStrongsNumbers(text: string): string[] {
  if (!text) return [];
  const matches: string[] = [];
  const regex = new RegExp(STRONGS_REGEX.source, 'g');
  let match;

  while ((match = regex.exec(text)) !== null) {
    const prefix = match[1].toUpperCase();
    const num = match[2];
    const code = `${prefix}${num}`;
    if (!matches.includes(code)) {
      matches.push(code);
    }
  }

  return matches;
}

// ─── Local Storage Entity Loaders ─────────────────────────────────────────────

export function getLocalSermons(): Array<{ id: string; title: string; content: string; updated_at?: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('bibledesk_sermons_guest');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[universalIndexer] Failed to load local sermons:', e);
  }
  return [];
}

export function getLocalPrayers(): PrayerCommitment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('bibledesk_prayer_circle_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.commitments && Array.isArray(parsed.commitments)) {
        return parsed.commitments;
      }
    }
  } catch (e) {
    console.warn('[universalIndexer] Failed to load local prayers:', e);
  }
  return [];
}

// ─── Cross-Connection Resolvers ───────────────────────────────────────────────

export interface IndexerResolveOptions {
  customSermons?: Array<{ id: string; title: string; content: string; updated_at?: string }>;
  customPrayers?: PrayerCommitment[];
  includePrivate?: boolean;
}

/**
 * Resolves all connected knowledge for a given Bible Verse or Passage.
 * Returns related Strong's lemmas, Sermons mentioning this passage,
 * Prayers citing or related to this passage, and historical Catechisms.
 */
export function resolveConnectionsForVerse(
  verseRef: string,
  options: IndexerResolveOptions = {}
): ConnectedKnowledge {
  const parts = verseRef.trim().split(/\s+/);
  const book = parts.slice(0, -1).join(' ') || parts[0];
  const chapVerse = parts[parts.length - 1] || '1';
  const [chapStr, vStr] = chapVerse.split(':');
  const chapter = parseInt(chapStr, 10) || 1;
  const verse = vStr ? parseInt(vStr, 10) : undefined;

  const sermons = options.customSermons || getLocalSermons();
  const prayers = options.customPrayers || getLocalPrayers();

  // 1. Find sermons mentioning this book & chapter or exact verse
  const matchedSermons: ConnectedSermon[] = [];
  for (const s of sermons) {
    const text = `${s.title} ${s.content}`;
    const refs = extractScriptureReferences(text);
    const mentionsPassage = refs.some(r => {
      if (r === verseRef) return true;
      if (r.startsWith(`${book} ${chapter}`)) return true;
      return false;
    });

    if (mentionsPassage || text.toLowerCase().includes(verseRef.toLowerCase())) {
      matchedSermons.push({
        id: s.id,
        title: s.title,
        excerpt: s.content.slice(0, 140) + '...',
        updated_at: s.updated_at,
      });
    }
  }

  // 2. Find prayers mentioning or tagged with this verse
  const matchedPrayers: ConnectedPrayer[] = [];
  for (const p of prayers) {
    if (!options.includePrivate && p.escalation_level === 'private') {
      // Respect tier-aware privacy
      continue;
    }
    const text = `${p.title} ${p.private_details || ''}`;
    const refs = extractScriptureReferences(text);
    const matches = refs.some(r => r.startsWith(`${book} ${chapter}`) || r === verseRef);

    if (matches || text.toLowerCase().includes(verseRef.toLowerCase())) {
      matchedPrayers.push({
        id: p.id,
        title: p.title,
        text: p.private_details || undefined,
        category: p.contact?.category,
        urgency: p.urgency_level,
        isPrivate: p.escalation_level === 'private',
        contactName: p.contact?.display_name,
        createdAt: p.created_at,
      });
    }
  }

  // 3. Match relevant Strong's lemmas
  const matchedStrongs: ConnectedStrongs[] = [];
  const lowerRef = verseRef.toLowerCase();
  if (lowerRef.includes('john 3:16') || lowerRef.includes('john 3')) {
    matchedStrongs.push(CURATED_STRONGS_MAP['G26']);   // agape
    matchedStrongs.push(CURATED_STRONGS_MAP['G2889']);  // kosmos
    matchedStrongs.push(CURATED_STRONGS_MAP['G3439']);  // monogenes
    matchedStrongs.push(CURATED_STRONGS_MAP['G4102']);  // pistis
    matchedStrongs.push(CURATED_STRONGS_MAP['G2222']);  // zoe
  } else if (lowerRef.includes('gen 1') || lowerRef.includes('genesis 1')) {
    matchedStrongs.push(CURATED_STRONGS_MAP['H7225']);  // bereshit
    matchedStrongs.push(CURATED_STRONGS_MAP['H1254']);  // bara
    matchedStrongs.push(CURATED_STRONGS_MAP['H430']);   // elohim
    matchedStrongs.push(CURATED_STRONGS_MAP['H7307']);  // ruach
  } else if (lowerRef.includes('rom 8') || lowerRef.includes('romans 8')) {
    matchedStrongs.push(CURATED_STRONGS_MAP['G26']);    // agape
    matchedStrongs.push(CURATED_STRONGS_MAP['G4151']);  // pneuma
    matchedStrongs.push(CURATED_STRONGS_MAP['G5485']);  // charis
    matchedStrongs.push(CURATED_STRONGS_MAP['G1343']);  // dikaiosyne
  } else {
    // Default foundational Greek & Hebrew lemmas
    matchedStrongs.push(CURATED_STRONGS_MAP['G5485']);
    matchedStrongs.push(CURATED_STRONGS_MAP['H2617']);
    matchedStrongs.push(CURATED_STRONGS_MAP['H7965']);
  }

  // 4. Match historical Catechisms
  const catechismMatches = searchCatechisms(verseRef).slice(0, 3);
  const matchedCatechisms: ConnectedCatechism[] = catechismMatches.map(c => ({
    catechism: c.catechism,
    qNum: c.question.number,
    question: c.question.question,
    answer: c.question.answer,
    tradition: c.tradition,
  }));

  return {
    queryEntity: {
      type: 'verse',
      identifier: verseRef,
      label: verseRef,
    },
    verses: [
      {
        ref: verseRef,
        book,
        chapter,
        verse,
      },
    ],
    strongs: matchedStrongs.filter(Boolean),
    prayers: matchedPrayers,
    sermons: matchedSermons,
    catechisms: matchedCatechisms,
  };
}

/**
 * Resolves all connected knowledge for a Strong's Number (e.g. "G26" or "H7225").
 */
export function resolveConnectionsForStrongs(
  code: string,
  options: IndexerResolveOptions = {}
): ConnectedKnowledge {
  const norm = code.toUpperCase().trim();
  const definition = CURATED_STRONGS_MAP[norm] || {
    code: norm,
    lemma: norm.startsWith('G') ? 'Greek Lemma' : 'Hebrew Root',
    transliteration: norm.toLowerCase(),
    definition: `Strong's Dictionary Entry for ${norm}`,
  };

  const sermons = options.customSermons || getLocalSermons();
  const prayers = options.customPrayers || getLocalPrayers();

  // Find sermons referencing this Strong's code or its transliteration
  const matchedSermons: ConnectedSermon[] = [];
  for (const s of sermons) {
    const text = `${s.title} ${s.content}`;
    if (
      text.toUpperCase().includes(norm) ||
      (definition.transliteration && text.toLowerCase().includes(definition.transliteration.toLowerCase()))
    ) {
      matchedSermons.push({
        id: s.id,
        title: s.title,
        excerpt: s.content.slice(0, 140) + '...',
        updated_at: s.updated_at,
      });
    }
  }

  // Find prayers referencing the concept
  const matchedPrayers: ConnectedPrayer[] = [];
  for (const p of prayers) {
    if (!options.includePrivate && p.escalation_level === 'private') continue;
    const text = `${p.title} ${p.private_details || ''}`;
    if (
      text.toUpperCase().includes(norm) ||
      (definition.transliteration && text.toLowerCase().includes(definition.transliteration.toLowerCase()))
    ) {
      matchedPrayers.push({
        id: p.id,
        title: p.title,
        text: p.private_details || undefined,
        category: p.contact?.category,
        urgency: p.urgency_level,
        isPrivate: p.escalation_level === 'private',
        contactName: p.contact?.display_name,
        createdAt: p.created_at,
      });
    }
  }

  // Related verses for key Strong's
  const relatedVerses: ConnectedVerse[] = [];
  if (norm === 'G26') {
    relatedVerses.push({ ref: 'John 3:16', book: 'John', chapter: 3, verse: 16 });
    relatedVerses.push({ ref: '1 Corinthians 13:4', book: '1 Corinthians', chapter: 13, verse: 4 });
    relatedVerses.push({ ref: 'Romans 5:8', book: 'Romans', chapter: 5, verse: 8 });
  } else if (norm === 'G5485') {
    relatedVerses.push({ ref: 'Ephesians 2:8', book: 'Ephesians', chapter: 2, verse: 8 });
    relatedVerses.push({ ref: 'Romans 3:24', book: 'Romans', chapter: 3, verse: 24 });
    relatedVerses.push({ ref: '2 Corinthians 12:9', book: '2 Corinthians', chapter: 12, verse: 9 });
  } else if (norm === 'H7225' || norm === 'H1254') {
    relatedVerses.push({ ref: 'Genesis 1:1', book: 'Genesis', chapter: 1, verse: 1 });
    relatedVerses.push({ ref: 'John 1:1', book: 'John', chapter: 1, verse: 1 });
  } else {
    relatedVerses.push({ ref: 'John 1:1', book: 'John', chapter: 1, verse: 1 });
  }

  return {
    queryEntity: {
      type: 'strongs',
      identifier: norm,
      label: `${norm} (${definition.lemma} • ${definition.transliteration})`,
    },
    verses: relatedVerses,
    strongs: [definition],
    prayers: matchedPrayers,
    sermons: matchedSermons,
    catechisms: searchCatechisms(definition.transliteration || norm).slice(0, 2).map(c => ({
      catechism: c.catechism,
      qNum: c.question.number,
      question: c.question.question,
      answer: c.question.answer,
      tradition: c.tradition,
    })),
  };
}

/**
 * Resolves all connected knowledge for a Sermon Outline.
 */
export function resolveConnectionsForSermon(
  sermon: { id: string; title: string; content: string; updated_at?: string },
  options: IndexerResolveOptions = {}
): ConnectedKnowledge {
  const fullText = `${sermon.title}\n${sermon.content}`;
  const refs = extractScriptureReferences(fullText);
  const strongsCodes = extractStrongsNumbers(fullText);

  const matchedVerses: ConnectedVerse[] = refs.map(r => {
    const parts = r.split(/\s+/);
    const book = parts.slice(0, -1).join(' ') || parts[0];
    const [chap, v] = (parts[parts.length - 1] || '1').split(':');
    return {
      ref: r,
      book,
      chapter: parseInt(chap, 10) || 1,
      verse: v ? parseInt(v, 10) : undefined,
    };
  });

  const matchedStrongs: ConnectedStrongs[] = strongsCodes
    .map(c => CURATED_STRONGS_MAP[c])
    .filter(Boolean);

  const prayers = options.customPrayers || getLocalPrayers();
  const matchedPrayers: ConnectedPrayer[] = [];

  for (const p of prayers) {
    if (!options.includePrivate && p.escalation_level === 'private') continue;
    const pText = `${p.title} ${p.private_details || ''}`;
    const pRefs = extractScriptureReferences(pText);
    const sharesVerse = pRefs.some(pr => refs.includes(pr));
    if (sharesVerse) {
      matchedPrayers.push({
        id: p.id,
        title: p.title,
        text: p.private_details || undefined,
        category: p.contact?.category,
        urgency: p.urgency_level,
        isPrivate: p.escalation_level === 'private',
        contactName: p.contact?.display_name,
        createdAt: p.created_at,
      });
    }
  }

  return {
    queryEntity: {
      type: 'sermon',
      identifier: sermon.id,
      label: sermon.title,
    },
    verses: matchedVerses,
    strongs: matchedStrongs,
    prayers: matchedPrayers,
    sermons: [
      {
        id: sermon.id,
        title: sermon.title,
        excerpt: sermon.content.slice(0, 140),
        updated_at: sermon.updated_at,
      },
    ],
    catechisms: refs.length > 0 ? searchCatechisms(refs[0]).slice(0, 2).map(c => ({
      catechism: c.catechism,
      qNum: c.question.number,
      question: c.question.question,
      answer: c.question.answer,
      tradition: c.tradition,
    })) : [],
  };
}
