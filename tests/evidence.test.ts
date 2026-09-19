import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateConfidence,
  validateFiveDimensions,
  type FiveDimensionEvidence,
} from '../src/lib/evidence';

describe('Five-Dimension Evidence Model & Confidence Rating Engine', () => {
  const mockComprehensiveEvidence: FiveDimensionEvidence = {
    scripture: {
      title: 'Biblical Foundation: Divine Logos in Creation',
      content: 'In John 1:1-3, the author opens with "In the beginning was the Word, and the Word was with God, and the Word was God." This mirrors Genesis 1:1 and establishes the eternal deity of Christ as the instrument of all creation.',
      citations: ['John 1:1-3', 'Genesis 1:1', 'Colossians 1:16'],
      key_points: ['Eternal pre-existence of Christ', 'Active agent in creation'],
    },
    historical: {
      title: 'Greco-Roman and Jewish Context of the Logos',
      content: 'Written late 1st century AD for both Jewish and Hellenistic audiences in Ephesus. In Jewish thought, the "Memra" (Word of the Lord) was God\'s creative wisdom. In Stoic philosophy, the Logos was the rational principle ordering the cosmos. The author bridges both worlds.',
      citations: ['Early Church Tradition', 'Irenaeus Against Heresies III.1'],
      key_points: ['Bridges Jewish Memra and Greek philosophical Logos', 'Affirms real historical incarnation'],
    },
    original_language: {
      title: 'Greek Lexical Analysis of Logos and Theos',
      content: 'The Greek term "Logos" (λόγος, G3056) denotes reasoned speech, divine wisdom, and personal manifestation. In the clause "kai theos ēn ho logos", "theos" is pre-verbal and lacks the definite article, functioning qualitatively to signify that the Word possessed the very essence of God.',
      citations: ['G3056 (logos)', 'G2316 (theos)'],
      key_points: ['Logos (G3056) indicates personal divine communication', 'Anarthrous theos signifies divine nature without modalism'],
      strongs: ['G3056', 'G2316'],
    },
    theological: {
      title: 'Consensus of Orthodox Trinitarian Theology',
      content: 'The passage serves as foundational evidence for the doctrine of the Trinity, as codified in the Nicene-Constantinopolitan Creed (AD 381): Christ is "begotten, not made, being of one substance with the Father" (homoousios).',
      citations: ['Nicene Creed (AD 381)', 'Westminster Confession of Faith II.3'],
      key_points: ['Affirms distinct hypostasis yet shared divine ousia', 'Directly refutes Arian subordinationism'],
    },
    practical: {
      title: 'Life Application: Confidence in Christ and Discipleship',
      content: 'Because Christ is the eternal Word through whom all things were made, believers can trust Him with every facet of life and suffering. Worshiping Christ is not honoring an exalted prophet, but worshiping God Himself.',
      citations: ['Hebrews 1:1-3'],
      key_points: ['Spiritual assurance grounded in cosmic authority', 'Call to worship and obedient discipleship'],
    },
  };

  test('validates complete FiveDimensionEvidence structure', () => {
    assert.strictEqual(validateFiveDimensions(mockComprehensiveEvidence), true);
  });

  test('computes High Confidence rating for well-grounded multifaceted evidence', () => {
    const assessment = calculateConfidence(mockComprehensiveEvidence, [
      { title: 'Perseus Digital Greek Library', url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0155:verse=1:1' },
      { title: 'Early Christian Writings - Irenaeus', url: 'https://www.earlychristianwritings.com/irenaeus.html' },
    ]);

    assert.strictEqual(assessment.level, 'high');
    assert.strictEqual(assessment.label, 'High Confidence');
    assert.ok(assessment.score >= 0.75, `Expected score >= 0.75, got ${assessment.score}`);
    assert.ok(assessment.factorScores.scriptureGrounding >= 0.8, 'Expected high scripture grounding');
    assert.ok(assessment.factorScores.lexicalBacking >= 0.7, 'Expected high lexical backing');
    assert.ok(assessment.rationale.length > 20, 'Expected non-empty explanation rationale');
  });

  test('computes Moderate or Lower Confidence when original language or historical grounding is lacking', () => {
    const sparseEvidence: FiveDimensionEvidence = {
      scripture: {
        title: 'Basic verse mention',
        content: 'Mentions a verse briefly.',
        citations: ['John 1:1'],
        key_points: ['Brief point'],
      },
      historical: {
        title: 'Unknown',
        content: 'Little historical detail known.',
        citations: [],
        key_points: [],
      },
      original_language: {
        title: 'None',
        content: 'No Greek or Hebrew details analyzed.',
        citations: [],
        key_points: [],
      },
      theological: {
        title: 'Opinion',
        content: 'General impression.',
        citations: [],
        key_points: [],
      },
      practical: {
        title: 'Idea',
        content: 'General reflection.',
        citations: [],
        key_points: [],
      },
    };

    const assessment = calculateConfidence(sparseEvidence, []);
    assert.ok(assessment.score < 0.75, `Expected score < 0.75, got ${assessment.score}`);
    assert.ok(['medium', 'low'].includes(assessment.level));
  });

  test('transparently breaks down all 5 factors and weights in factorScores', () => {
    const assessment = calculateConfidence(mockComprehensiveEvidence);
    const { factorScores } = assessment;

    assert.ok(typeof factorScores.scriptureGrounding === 'number');
    assert.ok(typeof factorScores.lexicalBacking === 'number');
    assert.ok(typeof factorScores.historicalContext === 'number');
    assert.ok(typeof factorScores.theologicalCoherence === 'number');
    assert.ok(typeof factorScores.sourceTraceability === 'number');

    // All scores must be in range [0, 1]
    Object.values(factorScores).forEach((score) => {
      assert.ok(score >= 0 && score <= 1.0, `Score ${score} out of bounds`);
    });
  });
});
