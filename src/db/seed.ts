import fs from 'fs';
import path from 'path';
import { getDb } from './index';
import {
  users,
  scriptureVerses,
  crossReferences,
  commentaries,
  studyNotes,
  studyCollections,
  collectionItems,
  researchFindings,
} from './schema';
import { calculateConfidence, type FiveDimensionEvidence } from '../lib/evidence';

export async function seedDatabase() {
  console.log('[Seed] Starting BibleDesk database seed...');
  const db = await getDb();

  // 1. Seed Demo User
  console.log('[Seed] Seeding demo user...');
  const demoUserId = 'user_demo_01';
  await db
    .insert(users)
    .values({
      id: demoUserId,
      email: 'scholar@bibledesk.org',
      name: 'Berean Scholar',
    })
    .onConflictDoNothing();

  // 2. Seed Scripture Verses (Full Gospel of John & Genesis 1 from web.json)
  console.log('[Seed] Loading bundled Scripture from src/data/bibles/web.json...');
  const webBiblePath = path.join(process.cwd(), 'src', 'data', 'bibles', 'web.json');
  if (fs.existsSync(webBiblePath)) {
    const raw = fs.readFileSync(webBiblePath, 'utf8');
    const bibleData = JSON.parse(raw);

    // Target books: John (all 21 chapters) + Genesis (Chapter 1)
    const targetBooks = ['John', 'Genesis'];
    const versesToInsert: any[] = [];

    for (const book of bibleData.books) {
      if (!targetBooks.includes(book.book_name)) continue;

      const bookNumber = book.book_name === 'Genesis' ? 1 : 43;

      for (const chapter of book.chapters) {
        // If Genesis, only seed Chapter 1 for speed and focus; for John, seed all 21 chapters!
        if (book.book_name === 'Genesis' && chapter.chapter > 1) continue;

        for (const verse of chapter.verses) {
          versesToInsert.push({
            translation: 'web',
            book: book.book_name,
            bookNumber,
            chapter: chapter.chapter,
            verse: verse.verse,
            text: verse.text,
          });
        }
      }
    }

    console.log(`[Seed] Inserting ${versesToInsert.length} Scripture verses into PostgreSQL...`);
    // Batch insert
    const BATCH_SIZE = 100;
    for (let i = 0; i < versesToInsert.length; i += BATCH_SIZE) {
      const batch = versesToInsert.slice(i, i + BATCH_SIZE);
      await db.insert(scriptureVerses).values(batch).onConflictDoNothing();
    }
  }

  // 3. Seed Cross-References from TSK data
  console.log('[Seed] Loading cross-references from src/data/lexicon/cross_references.json...');
  const tskPath = path.join(process.cwd(), 'src', 'data', 'lexicon', 'cross_references.json');
  if (fs.existsSync(tskPath)) {
    const rawTsk = fs.readFileSync(tskPath, 'utf8');
    const tskData: Record<string, string[]> = JSON.parse(rawTsk);

    const crossRefsToInsert: any[] = [];

    // Parse references for John 1-3 and Genesis 1
    for (const [fromRef, toRefs] of Object.entries(tskData)) {
      const fromMatch = fromRef.match(/^([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)$/);
      if (!fromMatch) continue;

      const [, fromBook, fromChStr, fromVStr] = fromMatch;
      const fromCh = parseInt(fromChStr, 10);
      const fromV = parseInt(fromVStr, 10);

      // Focus on John chapters 1-3 and Genesis 1
      const isTarget =
        (fromBook === 'John' && fromCh <= 3) ||
        (fromBook === 'Genesis' && fromCh === 1);

      if (!isTarget) continue;

      for (const toRef of toRefs.slice(0, 5)) { // Top 5 per verse
        const toMatch = toRef.match(/^([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)$/);
        if (toMatch) {
          crossRefsToInsert.push({
            fromBook: fromBook.trim(),
            fromChapter: fromCh,
            fromVerse: fromV,
            toBook: toMatch[1].trim(),
            toChapter: parseInt(toMatch[2], 10),
            toVerse: parseInt(toMatch[3], 10),
            votes: 5,
          });
        }
      }
    }

    console.log(`[Seed] Inserting ${crossRefsToInsert.length} cross-references into PostgreSQL...`);
    const BATCH_SIZE = 100;
    for (let i = 0; i < crossRefsToInsert.length; i += BATCH_SIZE) {
      const batch = crossRefsToInsert.slice(i, i + BATCH_SIZE);
      await db.insert(crossReferences).values(batch);
    }
  }

  // 4. Seed Evidence-Based Commentaries
  console.log('[Seed] Seeding structured 5-dimension commentaries...');
  const commentariesData: {
    id: string;
    verseRef: string;
    title: string;
    summary: string;
    dimensions: FiveDimensionEvidence;
    citations: string[];
  }[] = [
    {
      id: 'comm_john_1_1',
      verseRef: 'John 1:1',
      title: 'The Eternal Deity and Pre-existence of the Logos',
      summary: 'John 1:1 establishes the eternal pre-existence, distinct personhood, and divine nature of Jesus Christ as the Logos who was both with God and was God.',
      dimensions: {
        scripture: {
          title: 'Biblical Foundation: Divine Creation and Canonical Horizon',
          content: 'The opening phrase "In the beginning" (Ἐν ἀρχῇ) deliberately echoes Genesis 1:1, asserting that before created time existed, the Word already was. Colossians 1:16-17 and Hebrews 1:2 corroborate that all things were created through Him.',
          citations: ['John 1:1-3', 'Genesis 1:1', 'Colossians 1:16-17', 'Hebrews 1:1-3'],
          key_points: ['Eternal existence prior to creation', 'Direct link to Genesis creation account'],
        },
        historical: {
          title: 'Historical and Cultural Context in Late 1st-Century Ephesus',
          content: 'Written to a mixed Jewish and Greco-Roman audience. In Jewish Targums, the "Memra" (Word) signified the divine personal presence. In Hellenistic philosophy (Heraclitus, Stoics), the Logos represented cosmic rational order. John synthesizes both to proclaim that divine Wisdom became incarnate.',
          citations: ['Irenaeus Against Heresies III.11', 'Philo of Alexandria De Opificio Mundi'],
          key_points: ['Bridges Jewish Memra and Greek philosophical Logos', 'Affirms real historical revelation in Asia Minor'],
        },
        original_language: {
          title: 'Greek Lexical and Grammatical Analysis of the Logos',
          content: 'The Greek phrase "καὶ Θεὸς ἦν ὁ Λόγος" features an anarthrous pre-verbal predicate noun (Θεὸς). According to Colwell\'s Rule and modern Greek syntax (Wallace), "theos" is qualitative, emphasizing the essential divine nature of the Logos without equating Him with the Father (avoiding Sabellianism).',
          citations: ['G3056 (logos)', 'G2316 (theos)', 'Wallace Greek Grammar Beyond the Basics p. 266'],
          key_points: ['Logos (G3056) conveys personal divine communication', 'Anarthrous theos denotes divine essence and deity'],
          strongs: ['G3056', 'G2316'],
        },
        theological: {
          title: 'Systematic Trinitarian Orthodoxy',
          content: 'Historically, this passage served as the pillar at the Council of Nicaea (AD 325) affirming Christ as "homoousios" (consubstantial) with the Father. It refutes both Arianism (which claims the Word had a beginning) and modalism (which denies distinction of persons).',
          citations: ['Nicene Creed (AD 325)', 'Athanasius On the Incarnation II'],
          key_points: ['Affirms eternal generation of the Son', 'Foundational basis for orthodox Trinitarianism'],
        },
        practical: {
          title: 'Spiritual Formation and Christian Living',
          content: 'Because Christ is the eternal Word, God is not an impersonal force or silent creator, but a God who communicates. Believers anchor their worship, obedience, and endurance in the unchanging divine authority of Jesus Christ.',
          citations: ['Hebrews 4:14-16'],
          key_points: ['Confidence in God\'s personal self-revelation', 'Worshiping Christ as Lord of all creation'],
        },
      },
      citations: ['John 1:1', 'Genesis 1:1', 'Colossians 1:16', 'Hebrews 1:1-3'],
    },
    {
      id: 'comm_john_3_16',
      verseRef: 'John 3:16',
      title: 'The Breadth of God\'s Sacrificial Love and Eternal Life',
      summary: 'John 3:16 summarizes the heart of the Gospel: God\'s unconditional love demonstrated in giving His unique Son, offering eternal life through faith.',
      dimensions: {
        scripture: {
          title: 'Biblical Foundation: The Bronze Serpent and the Cross',
          content: 'Contextualized by John 3:14-15 referencing Numbers 21:8-9, where looking upon the lifted bronze serpent brought physical healing. Christ\'s being lifted up on the Cross brings spiritual healing and eternal life to everyone who believes.',
          citations: ['John 3:14-17', 'Numbers 21:8-9', 'Romans 5:8', '1 John 4:9-10'],
          key_points: ['Typological fulfillment of Numbers 21', 'Universal offer of salvation through faith'],
        },
        historical: {
          title: 'Greco-Roman and Second Temple Jewish Context',
          content: 'In 2nd Temple Judaism, divine love was often conceived as exclusive to the covenant nation of Israel. Jesus shocks Nicodemus by declaring that God\'s redemptive love encompasses the entire "cosmos" (world).',
          citations: ['Babylonian Talmud Sanhedrin 90a', 'Dead Sea Scrolls 1QS'],
          key_points: ['Radical expansion of redemptive love to all nations', 'Confrontation with sectarian exclusivity'],
        },
        original_language: {
          title: 'Greek Grammatical Nuance: Houtōs and Monogenēs',
          content: 'The adverb "οὕτως" (houtōs) emphasizes the manner and degree of love ("in this way"). "μονογενής" (monogenēs, G3439) does not mean "only begotten" biologically, but "unique, one-of-a-kind, uniquely beloved", parallel to Isaac in Genesis 22.',
          citations: ['G3439 (monogenēs)', 'G25 (agapaō)', 'BDAG Lexicon p. 658'],
          key_points: ['Monogenēs (G3439) signifies unique, irreplaceable status', 'Agapaō reflects active, sacrificial commitment'],
          strongs: ['G3439', 'G25'],
        },
        theological: {
          title: 'Theology of Atonement and Grace',
          content: 'Demonstrates the harmony of divine sovereignty, penal substitutionary atonement, and human responsibility. Salvation is a gift of unmerited grace received exclusively through faith (sola fide).',
          citations: ['Canons of Dort II.5', 'Westminster Shorter Catechism Q. 33'],
          key_points: ['Initiative of salvation originates in God the Father', 'Eternal life is present possession, not merely future hope'],
        },
        practical: {
          title: 'Assurance of Salvation and World Evangelism',
          content: 'Freed from the tyranny of performance and condemnation, believers are called to extend that same sacrificial love to their neighbors, enemies, and the nations through evangelism and mercy.',
          citations: ['Romans 10:14-15', '2 Corinthians 5:18-20'],
          key_points: ['Liberating assurance of eternal security in Christ', 'Mandate for global missions and daily compassion'],
        },
      },
      citations: ['John 3:16', 'Numbers 21:8-9', 'Romans 5:8', '1 John 4:9-10'],
    },
  ];

  for (const item of commentariesData) {
    const assessment = calculateConfidence(item.dimensions);
    await db
      .insert(commentaries)
      .values({
        id: item.id,
        verseRef: item.verseRef,
        title: item.title,
        summary: item.summary,
        dimensions: item.dimensions,
        confidence: assessment.level,
        confidenceScore: assessment.score,
        confidenceDerivation: assessment,
        citations: item.citations,
      })
      .onConflictDoNothing();
  }

  // 5. Seed Study Collection & Notes
  console.log('[Seed] Seeding sample study collection and personal notes...');
  const sampleCollectionId = 'coll_christology_01';
  await db
    .insert(studyCollections)
    .values({
      id: sampleCollectionId,
      userId: demoUserId,
      name: 'Christology & The Logos',
      description: 'Systematic study of the deity, pre-existence, and incarnation of Jesus Christ.',
      color: '#b58414',
    })
    .onConflictDoNothing();

  const sampleNoteId = 'note_john_1_1';
  await db
    .insert(studyNotes)
    .values({
      id: sampleNoteId,
      userId: demoUserId,
      verseRef: 'John 1:1',
      title: 'Significance of Anarthrous Theos in John 1:1',
      content: 'Key finding from lexical study: "kai theos ēn ho logos" means the Word had the full nature of God without modalistic collapse into the person of the Father. Direct counter to Arianism.',
      tags: ['theology', 'greek', 'trinity'],
    })
    .onConflictDoNothing();

  await db
    .insert(collectionItems)
    .values({
      id: 'ci_01',
      collectionId: sampleCollectionId,
      itemType: 'verse',
      itemRef: 'John 1:1',
      notes: 'Foundation verse for Christology.',
    })
    .onConflictDoNothing();

  await db
    .insert(collectionItems)
    .values({
      id: 'ci_02',
      collectionId: sampleCollectionId,
      itemType: 'commentary',
      itemRef: 'comm_john_1_1',
      notes: '5D evidence commentary with High Confidence rating.',
    })
    .onConflictDoNothing();

  // 6. Seed Sample Research Finding
  console.log('[Seed] Seeding sample research finding...');
  const mockResearchDimensions: FiveDimensionEvidence = {
    scripture: {
      title: 'Canonical Parallels: Proverbs 8 and Colossians 1',
      content: 'The concept of Logos in John 1:1 parallels the divine personification of Wisdom in Proverbs 8:22-31 and the creative supremacy of Christ in Colossians 1:15-20.',
      citations: ['Proverbs 8:22-31', 'Colossians 1:15-20', 'Hebrews 1:1-4'],
      key_points: ['Scripture interprets scripture regarding the pre-existent Word'],
    },
    historical: {
      title: 'First-Century Ephesus and the Johannine Community',
      content: 'Early church testimony (Irenaeus, Polycarp) confirms John composed this Gospel in Ephesus to establish apostolic truth amidst nascent Gnostic distortions such as Cerinthianism.',
      citations: ['Irenaeus Adversus Haereses III.3.4', 'Eusebius Ecclesiastical History III.23'],
      key_points: ['Historical combat against Docetic and Cerinthian heresies'],
    },
    original_language: {
      title: 'Lexical Field of Logos in Septuagint and Koine',
      content: 'In the Septuagint (LXX), the "Word of the LORD" (Dabar Yahweh) performs acts of creation (Psalm 33:6). John links this Hebrew concept with the Greek term Logos (G3056).',
      citations: ['Psalm 33:6 (LXX Psalm 32:6)', 'Strong\'s G3056'],
      key_points: ['Dabar Yahweh rendered as Logos'],
      strongs: ['G3056'],
    },
    theological: {
      title: 'Trinitarian Formulation: Distinct Personhood and Co-Equality',
      content: 'The preposition "pros" (πρός) with the accusative denotes face-to-face intimate communion, indicating that the Son is personally distinct from the Father while fully sharing His divine essence.',
      citations: ['Athanasian Creed', 'Augustine De Trinitate IV'],
      key_points: ['Pros ton theon indicates personal communion in the Godhead'],
    },
    practical: {
      title: 'Pastoral Assurance of Divine Compassion',
      content: 'Knowing that the Creator Himself entered human history in love gives Christians steadfast hope in times of suffering and temptation.',
      citations: ['Hebrews 2:17-18'],
      key_points: ['The transcendent Creator is also the personal Redeemer'],
    },
  };

  const researchAssessment = calculateConfidence(mockResearchDimensions, [
    { title: 'Christian Classics Ethereal Library - Irenaeus', url: 'https://ccel.org/ccel/irenaeus/against_heresies.html' },
    { title: 'Perseus Digital Library - John 1:1 Koine Greek Text', url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0155:verse=1:1' },
    { title: 'Blue Letter Bible - Strong\'s G3056 Logos', url: 'https://www.blueletterbible.org/lexicon/g3056/kjv/tr/0-1/' },
  ]);

  await db
    .insert(researchFindings)
    .values({
      id: 'rf_logos_background',
      userId: demoUserId,
      query: 'What is the historical background and meaning of Logos in John 1:1?',
      verseRef: 'John 1:1',
      summary: 'Research confirms that the Logos in John 1:1 bridges Hebrew Dabar Yahweh (creative word) and Greco-Roman philosophical order, affirming Christ\'s eternal deity and distinct personhood.',
      dimensions: mockResearchDimensions,
      confidence: researchAssessment.level,
      confidenceScore: researchAssessment.score,
      confidenceDerivation: researchAssessment,
      sources: [
        { title: 'Christian Classics Ethereal Library - Irenaeus', url: 'https://ccel.org/ccel/irenaeus/against_heresies.html', snippet: 'Apostolic witness regarding the Johannine authorship and Ephesian setting.' },
        { title: 'Perseus Digital Library - John 1:1 Koine Greek Text', url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.01.0155:verse=1:1', snippet: 'Koine Greek morphological analysis and syntax.' },
        { title: 'Blue Letter Bible - Strong\'s G3056 Logos', url: 'https://www.blueletterbible.org/lexicon/g3056/kjv/tr/0-1/', snippet: 'Lexical definitions and occurrences across the New Testament corpus.' },
      ],
    })
    .onConflictDoNothing();

  console.log('[Seed] Database seeding completed successfully!');
}

// Allow direct CLI execution
if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error during database seed:', err);
      process.exit(1);
    });
}
