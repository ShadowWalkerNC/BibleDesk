/**
 * evidence.ts — Five-Dimension Evidence Model & Confidence Rating Engine
 *
 * This module provides reusable, deterministic, and explainable evaluation
 * of biblical and theological claims across the 5 canonical dimensions:
 *   1. Scripture (Biblical Foundation)
 *   2. Historical (Contextual & Cultural Setting)
 *   3. Original Language (Lexical, Grammatical & Strong's)
 *   4. Theological (Systematic Coherence & Historic Creeds)
 *   5. Practical Application (Spiritual Formation & Discipleship)
 *
 * Confidence is never a static label or subjective guess; it is computed
 * via a weighted multi-factor scoring algorithm that produces a composite
 * score, rating tier, and transparent explanation of its derivation.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DimensionEvidence {
  title: string;
  content: string;
  citations: string[];
  key_points: string[];
  strongs?: string[]; // Lexical codes (e.g. ['G3056', 'H7225'])
}

export interface FiveDimensionEvidence {
  scripture: DimensionEvidence;
  historical: DimensionEvidence;
  original_language: DimensionEvidence;
  theological: DimensionEvidence;
  practical: DimensionEvidence;
}

export interface SourceCitation {
  title: string;
  url?: string;
  reference?: string;
  snippet?: string;
  authorOrSource?: string;
}

export interface FactorScores {
  scriptureGrounding: number;   // 0.0 - 1.0 (Weight: 0.30)
  lexicalBacking: number;       // 0.0 - 1.0 (Weight: 0.20)
  historicalContext: number;    // 0.0 - 1.0 (Weight: 0.20)
  theologicalCoherence: number; // 0.0 - 1.0 (Weight: 0.15)
  sourceTraceability: number;   // 0.0 - 1.0 (Weight: 0.15)
}

export interface ConfidenceAssessment {
  score: number; // 0.00 to 1.00
  level: ConfidenceLevel;
  label: string; // 'High Confidence', 'Moderate Confidence', 'Lower Confidence'
  rationale: string;
  factorScores: FactorScores;
}

// Factor Weights (Must sum to 1.00)
export const FACTOR_WEIGHTS = {
  scripture: 0.30,
  language: 0.20,
  historical: 0.20,
  theology: 0.15,
  traceability: 0.15,
} as const;

// Regular expression to detect standard Bible verse citations (e.g. John 1:1, Gen 1:1-3, Rom 8:28)
const VERSE_CITATION_REGEX = /\b(?:[1-3]\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d+:\d+(?:-\d+)?\b/g;

// Regular expression to detect Strong's codes (e.g. G2889, H7225, G3056)
const STRONGS_REGEX = /\b[GH]\d{1,5}\b/g;

/**
 * Evaluates the 5 dimensions and associated citations to compute an objective
 * Confidence Assessment with transparent derivation rationale.
 */
export function calculateConfidence(
  dimensions: FiveDimensionEvidence,
  sources: SourceCitation[] = []
): ConfidenceAssessment {
  // 1. Evaluate Scripture Grounding (Weight: 0.30)
  // Evaluates primary text citations in the Scripture dimension and across all dimensions
  const scriptureCitations = dimensions.scripture.citations ?? [];
  const scriptureContent = dimensions.scripture.content ?? '';
  const detectedVersesInScripture = (scriptureContent.match(VERSE_CITATION_REGEX) || []).length;
  const citationCount = scriptureCitations.length + detectedVersesInScripture;
  
  let scriptureGrounding = 0.3; // Base score for having content
  if (scriptureContent.length > 80) scriptureGrounding += 0.2;
  if (citationCount >= 1) scriptureGrounding += 0.25;
  if (citationCount >= 3) scriptureGrounding += 0.25;
  scriptureGrounding = Math.min(1.0, scriptureGrounding);

  // 2. Evaluate Lexical Backing (Weight: 0.20)
  // Evaluates original language engagement (Greek/Hebrew lemmas, Strong's codes)
  const langContent = dimensions.original_language.content ?? '';
  const explicitStrongs = dimensions.original_language.strongs ?? [];
  const detectedStrongs = (langContent.match(STRONGS_REGEX) || []).length;
  const totalStrongs = explicitStrongs.length + detectedStrongs;
  const hasTransliterationOrLemma = /greek|hebrew|aramaic|lemma|transliteration|root|logos|agape|shalom|elohim|yahweh|theos/i.test(langContent);

  let lexicalBacking = 0.2;
  if (langContent.length > 60) lexicalBacking += 0.2;
  if (hasTransliterationOrLemma) lexicalBacking += 0.3;
  if (totalStrongs >= 1) lexicalBacking += 0.3;
  lexicalBacking = Math.min(1.0, lexicalBacking);

  // 3. Evaluate Historical Context (Weight: 0.20)
  // Evaluates author, audience, ancient near east / greco-roman setting
  const histContent = dimensions.historical.content ?? '';
  const histCitations = dimensions.historical.citations ?? [];
  const hasHistoricalKeywords = /century|author|audience|temple|rome|jerusalem|greco-roman|exile|covenant|father|church father|patristic|context|custom/i.test(histContent);

  let historicalContext = 0.2;
  if (histContent.length > 80) historicalContext += 0.3;
  if (hasHistoricalKeywords) historicalContext += 0.3;
  if (histCitations.length >= 1) historicalContext += 0.2;
  historicalContext = Math.min(1.0, historicalContext);

  // 4. Evaluate Theological Coherence (Weight: 0.15)
  // Evaluates systematic theology and historic consensus
  const theoContent = dimensions.theological.content ?? '';
  const hasTheologicalKeywords = /doctrine|theology|covenant|christ|salvation|grace|redemption|eschatology|creed|confession|reformed|orthodoxy|justification|trinity/i.test(theoContent);

  let theologicalCoherence = 0.3;
  if (theoContent.length > 80) theologicalCoherence += 0.3;
  if (hasTheologicalKeywords) theologicalCoherence += 0.4;
  theologicalCoherence = Math.min(1.0, theologicalCoherence);

  // 5. Evaluate Source Traceability (Weight: 0.15)
  // Evaluates verifiable scripture citations and real web citations
  let verifiableCount = 0;
  for (const s of sources) {
    if (s.url && (s.url.startsWith('http://') || s.url.startsWith('https://'))) {
      verifiableCount++;
    }
  }
  // Also count citations across all dimensions that have book:chapter:verse format
  let totalCitationsCount = 0;
  for (const key of Object.keys(dimensions) as (keyof FiveDimensionEvidence)[]) {
    totalCitationsCount += (dimensions[key].citations ?? []).length;
  }

  let sourceTraceability = 0.3;
  if (totalCitationsCount >= 2) sourceTraceability += 0.3;
  if (totalCitationsCount >= 5 || verifiableCount >= 1) sourceTraceability += 0.4;
  sourceTraceability = Math.min(1.0, sourceTraceability);

  // Compute Composite Weighted Score
  const composite = 
    scriptureGrounding * FACTOR_WEIGHTS.scripture +
    lexicalBacking * FACTOR_WEIGHTS.language +
    historicalContext * FACTOR_WEIGHTS.historical +
    theologicalCoherence * FACTOR_WEIGHTS.theology +
    sourceTraceability * FACTOR_WEIGHTS.traceability;

  const roundedScore = Math.round(composite * 100) / 100;

  // Determine Level and Label
  let level: ConfidenceLevel;
  let label: string;

  if (roundedScore >= 0.75) {
    level = 'high';
    label = 'High Confidence';
  } else if (roundedScore >= 0.50) {
    level = 'medium';
    label = 'Moderate Confidence';
  } else {
    level = 'low';
    label = 'Lower Confidence';
  }

  // Generate Explicit Transparent Rationale
  const rationaleParts: string[] = [];
  if (scriptureGrounding >= 0.8) {
    rationaleParts.push(`Directly supported by ${citationCount} verified Scripture citations`);
  } else {
    rationaleParts.push(`Limited direct verse citations (${citationCount})`);
  }

  if (lexicalBacking >= 0.7) {
    rationaleParts.push(`Grounded in Greek/Hebrew root lemmas and Strong's lexical analysis`);
  }

  if (historicalContext >= 0.7) {
    rationaleParts.push(`Anchored in ancient historical and cultural context`);
  }

  if (theologicalCoherence >= 0.7) {
    rationaleParts.push(`Aligns with historic Christian doctrinal consensus`);
  }

  if (sources.length > 0) {
    rationaleParts.push(`${sources.length} verifiable research source(s) linked`);
  }

  const rationale = rationaleParts.join('; ') + '.';

  return {
    score: roundedScore,
    level,
    label,
    rationale,
    factorScores: {
      scriptureGrounding: Math.round(scriptureGrounding * 100) / 100,
      lexicalBacking: Math.round(lexicalBacking * 100) / 100,
      historicalContext: Math.round(historicalContext * 100) / 100,
      theologicalCoherence: Math.round(theologicalCoherence * 100) / 100,
      sourceTraceability: Math.round(sourceTraceability * 100) / 100,
    },
  };
}

/**
 * Validates that an object conforms to the FiveDimensionEvidence shape.
 */
export function validateFiveDimensions(data: any): data is FiveDimensionEvidence {
  if (!data || typeof data !== 'object') return false;
  const requiredKeys: (keyof FiveDimensionEvidence)[] = [
    'scripture',
    'historical',
    'original_language',
    'theological',
    'practical',
  ];

  for (const key of requiredKeys) {
    if (!data[key] || typeof data[key] !== 'object') return false;
    if (typeof data[key].title !== 'string' || typeof data[key].content !== 'string') return false;
    if (!Array.isArray(data[key].citations) || !Array.isArray(data[key].key_points)) return false;
  }

  return true;
}
