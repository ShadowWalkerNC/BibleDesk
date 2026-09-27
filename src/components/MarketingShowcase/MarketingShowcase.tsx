'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  Globe,
  Code,
  ArrowRight,
  Check,
  Layers,
  Scroll,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Compass,
  Download,
  Share2,
} from 'lucide-react';
import styles from './MarketingShowcase.module.css';

interface DemoQuery {
  id: string;
  reference: string;
  query: string;
  confidence: number;
  confidenceTier: 'High' | 'Moderate';
  dimensions: {
    scripture: string;
    historical: string;
    originalLanguage: string;
    theological: string;
    practical: string;
  };
  sources: Array<{ title: string; url: string }>;
}

const DEMO_QUERIES: DemoQuery[] = [
  {
    id: 'john-1-1',
    reference: 'John 1:1',
    query: 'Theological and Linguistic Meaning of Logos (Word)',
    confidence: 94,
    confidenceTier: 'High',
    dimensions: {
      scripture: 'John 1:1 deliberately echoes Genesis 1:1 ("In the beginning"), identifying the Word with God before creation (cf. 1 John 1:1, Col 1:15-17).',
      historical: 'Written to 1st-century Greco-Roman and Jewish audiences; bridging the Hebrew "Dabar Yahweh" (active creative Word) and Greek philosophical Logos (rational principle of the cosmos).',
      originalLanguage: 'Greek: Logos (λόγος, G3056) — divine expression, self-revelation. "The Word was with God (pros ton theon) and the Word was God (theos ēn ho logos)" indicates personal distinction yet shared divine essence.',
      theological: 'Foundational Johannine Christology: affirms the eternal deity, co-equality, and distinct hypostasis of the Son within the Holy Trinity (Nicene Orthodoxy).',
      practical: 'Jesus is not an abstract distant concept, but God speaking directly and relationally to humanity. To know Christ is to know the very heart of the Father.',
    },
    sources: [
      { title: 'Blue Letter Bible — Greek Lexicon Strong’s G3056 (Logos)', url: 'https://www.blueletterbible.org/lexicon/g3056/kjv/tr/0-1/' },
      { title: 'Treasury of Scripture Knowledge (TSK) — John 1:1 Cross References', url: 'https://www.blueletterbible.org/tsk/kjv/jhn/1/1/' },
    ],
  },
  {
    id: 'ephesians-6-11',
    reference: 'Ephesians 6:11',
    query: 'The Whole Armor of God & Roman Military Imagery',
    confidence: 91,
    confidenceTier: 'High',
    dimensions: {
      scripture: 'Paul charges the Ephesian church to "put on the whole armor of God" to stand firm against the schemes of the adversary (Eph 6:10-18; cf. Isaiah 59:17).',
      historical: 'Written while Paul was chained to a Roman legionary guardsman in Rome (c. AD 60-62). Paul transforms the heavy panoply of the Roman soldier into a spiritual defense metaphor.',
      originalLanguage: 'Greek: Panoplia (πανοπλία, G3833) — the complete set of defensive and offensive weapons. Methodeia (μεθοδεία, G3180) — deceptive cunning schemes or crafted traps.',
      theological: 'The battle is essentially spiritual rather than physical (Eph 6:12). Victory is derived from Christ’s accomplished cross and resurrection, not personal human willpower.',
      practical: 'Daily spiritual readiness requires immersing our minds in gospel truth, righteous integrity, peace, persistent faith, and unceasing biblical prayer.',
    },
    sources: [
      { title: 'Strong’s Greek Concordance G3833 (Panoplia)', url: 'https://www.blueletterbible.org/lexicon/g3833/kjv/tr/0-1/' },
      { title: 'Historical Roman Arms & Paul’s Captivity — Ancient Context', url: 'https://biblehub.com/commentaries/ephesians/6-11.htm' },
    ],
  },
  {
    id: 'romans-8-28',
    reference: 'Romans 8:28',
    query: 'Divine Sovereignty and the Good of the Believer',
    confidence: 93,
    confidenceTier: 'High',
    dimensions: {
      scripture: 'Paul affirms that God works all things together for good to those who love God and are called according to His purpose (Rom 8:28-30; cf. Gen 50:20).',
      historical: 'Addressed to believers in imperial Rome experiencing suffering, persecution, and political tension under the reign of Nero (c. AD 57).',
      originalLanguage: 'Greek: Synergei (συνεργεῖ, G4903) — actively works together, coordinates in synergy. Agathon (ἀγαθόν, G18) — spiritual, eternal, and ultimate good (conformity to Christ, v. 29).',
      theological: 'The doctrine of Divine Providence: God’s sovereign grace weaves even trials, setbacks, and suffering into the tapestry of eternal sanctification and glorification.',
      practical: 'In difficult seasons, believers can rest in the unshakeable certainty that no circumstance is wasted in God’s redemptive purpose.',
    },
    sources: [
      { title: 'Strong’s Greek Concordance G4903 (Synergeo)', url: 'https://www.blueletterbible.org/lexicon/g4903/kjv/tr/0-1/' },
      { title: 'Treasury of Scripture Knowledge — Romans 8:28', url: 'https://www.blueletterbible.org/tsk/kjv/rom/8/28/' },
    ],
  },
];

const FAQS = [
  {
    q: 'Is Scripture reading really 100% free forever without subscriptions?',
    a: 'Yes, unconditionally. In strict accordance with our core founding rules, the Bible is God’s gift to humanity and will never be paywalled. You can read, search, study, compare 6 translations (KJV, ASV, WEB, BBE, Darby, YLT), and look up Strong’s Greek and Hebrew lexicons 100% free with zero advertisements, forever.',
  },
  {
    q: 'How does BibleDesk eliminate AI hallucinations in theology?',
    a: 'Unlike generic AI chatbots that invent quotes or historical facts, BibleDesk’s research assistant enforces a strict 5-Dimension Evidence Model (Scripture, History, Original Language, Theology, Practical Application). Every claim is validated against real biblical manuscripts and cross-references, assigned a multi-factor confidence rating, and backed by verifiable citations with clickable links.',
  },
  {
    q: 'Can I use my own Google Gemini or Claude API key?',
    a: 'Absolutely. We proudly support Bring-Your-Own-Key (BYOK). You can paste your free personal Google Gemini key into settings to enjoy unlimited, high-speed 5-dimension study queries for $0 without purchasing any paid tier.',
  },
  {
    q: 'Where are my study notes, highlights, and prayers stored?',
    a: 'BibleDesk follows a local-first philosophy. Your study notes, highlights, and private prayer commitments are stored securely directly on your device. Signed-in users can optionally enable encrypted cloud backup to sync notes across devices.',
  },
  {
    q: 'Why do you offer Pro and Ministry plans if the core is free?',
    a: 'Paid plans exist for users who want hosted AI compute without having to manage their own API keys, as well as multi-device real-time cloud synchronization, 1-click Obsidian vault export, and church pastoral care team workflows. Paid subscriptions fund server compute so the core Bible app can remain free for everyone.',
  },
];

export default function MarketingShowcase() {
  const [activeDemo, setActiveDemo] = useState<DemoQuery>(DEMO_QUERIES[0]);
  const [activeDimension, setActiveDimension] = useState<keyof DemoQuery['dimensions']>('originalLanguage');
  const [annualBilling, setAnnualBilling] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className={styles.container}>
      {/* ── 1. Editorial Split Hero Section ── */}
      <section className={styles.heroSection} aria-label="BibleDesk Overview">
        <div className={styles.heroGrid}>
          
          {/* Left Column: Scholarly Editorial Masthead */}
          <div className={styles.heroEditorial}>
            <div className={styles.heroLedgerTag}>
              <span className={styles.tagDot} aria-hidden="true" />
              <span>BIBLEDESK CODEX · REVISED EDITION 2026</span>
            </div>

            <h1 className={styles.heroTitle}>
              A Living Codex for Scripture &amp; <em>Systematic Inquiry</em>
            </h1>

            <p className={styles.heroSubtitle}>
              Engineered for deep study without commercial compromise. Read six public-domain translations offline, interrogate Strong’s lexical philology, and research theological questions through an open 5-dimension evidence engine that cites primary manuscripts instead of guessing.
            </p>

            <div className={styles.heroActions}>
              <Link href="/bible" className={styles.primaryAction}>
                <BookOpen size={16} />
                <span>Open Study Desk</span>
                <ArrowRight size={14} className={styles.actionArrow} />
              </Link>

              <Link href="/research" className={styles.secondaryAction}>
                <Sparkles size={15} color="var(--gold-400)" />
                <span>5D Research Workbench</span>
                <kbd className={styles.kbdPill}>⌘K</kbd>
              </Link>
            </div>

            {/* Architectural Ledger Assurances */}
            <div className={styles.assuranceLedger}>
              <div className={styles.assuranceItem}>
                <span className={styles.assuranceCheck}>✓</span>
                <span>Works 100% Offline</span>
              </div>
              <div className={styles.assuranceDivider} />
              <div className={styles.assuranceItem}>
                <span className={styles.assuranceCheck}>✓</span>
                <span>Free BYOK Unlimited AI</span>
              </div>
              <div className={styles.assuranceDivider} />
              <div className={styles.assuranceItem}>
                <span className={styles.assuranceCheck}>✓</span>
                <span>Zero Ads or Trackers</span>
              </div>
              <div className={styles.assuranceDivider} />
              <div className={styles.assuranceItem}>
                <span className={styles.assuranceCheck}>✓</span>
                <span>MIT Open-Source Core</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Philology Workbench Terminal */}
          <div className={styles.heroWorkbench}>
            <div className={styles.terminalBezel}>
              {/* Terminal Window Header Bar */}
              <div className={styles.terminalHeader}>
                <div className={styles.passageTabs}>
                  {DEMO_QUERIES.map(q => (
                    <button
                      key={q.id}
                      type="button"
                      className={`${styles.passageTabBtn} ${activeDemo.id === q.id ? styles.passageTabActive : ''}`}
                      onClick={() => {
                        setActiveDemo(q);
                        setActiveDimension('originalLanguage');
                      }}
                    >
                      <span className={styles.tabMarker}>§</span>
                      <span>{q.reference}</span>
                    </button>
                  ))}
                </div>

                <div className={styles.confidenceScoreBadge}>
                  <ShieldCheck size={13} color="var(--dim-theological)" />
                  <span className={styles.confidenceScoreText}>
                    {activeDemo.confidence}% Confidence · {activeDemo.confidenceTier}
                  </span>
                </div>
              </div>

              {/* Terminal Sub-Bar: Subject Line */}
              <div className={styles.terminalSubjectBar}>
                <div className={styles.subjectPrompt}>
                  <Search size={14} className={styles.subjectIcon} />
                  <span className={styles.subjectTitle}>{activeDemo.query}</span>
                </div>
                <span className={styles.subjectScope}>[COGNITIVE 5D ENGINE]</span>
              </div>

              {/* 5-Dimension Precision Indicator Matrix */}
              <div className={styles.dimensionRail} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDimension === 'scripture'}
                  className={`${styles.dimTabBtn} ${activeDimension === 'scripture' ? styles.dimTabActiveScripture : ''}`}
                  onClick={() => setActiveDimension('scripture')}
                >
                  <span className={styles.dimNum}>01</span>
                  <span>Scripture</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDimension === 'historical'}
                  className={`${styles.dimTabBtn} ${activeDimension === 'historical' ? styles.dimTabActiveHistorical : ''}`}
                  onClick={() => setActiveDimension('historical')}
                >
                  <span className={styles.dimNum}>02</span>
                  <span>Historical</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDimension === 'originalLanguage'}
                  className={`${styles.dimTabBtn} ${activeDimension === 'originalLanguage' ? styles.dimTabActiveLanguage : ''}`}
                  onClick={() => setActiveDimension('originalLanguage')}
                >
                  <span className={styles.dimNum}>03</span>
                  <span>Philology</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDimension === 'theological'}
                  className={`${styles.dimTabBtn} ${activeDimension === 'theological' ? styles.dimTabActiveTheology : ''}`}
                  onClick={() => setActiveDimension('theological')}
                >
                  <span className={styles.dimNum}>04</span>
                  <span>Theology</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDimension === 'practical'}
                  className={`${styles.dimTabBtn} ${activeDimension === 'practical' ? styles.dimTabActivePraxis : ''}`}
                  onClick={() => setActiveDimension('practical')}
                >
                  <span className={styles.dimNum}>05</span>
                  <span>Praxis</span>
                </button>
              </div>

              {/* Dimension Body Content & Scholarly Margin */}
              <div className={styles.terminalBody}>
                <div className={styles.manuscriptView}>
                  <p className={styles.manuscriptText}>
                    {activeDemo.dimensions[activeDimension]}
                  </p>
                </div>

                {/* Footnote Citations Tray */}
                <div className={styles.citationsTray}>
                  <span className={styles.citationsHeading}>Primary Sourced Citations:</span>
                  <div className={styles.citationLinks}>
                    {activeDemo.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.citationChip}
                      >
                        <span>{src.title}</span>
                        <ExternalLink size={10} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Terminal Footer Status Bar */}
              <div className={styles.terminalFooter}>
                <div className={styles.statusIndicator}>
                  <span className={styles.statusDot} />
                  <span>LOCAL-FIRST ENGINE · ZERO LATENCY</span>
                </div>
                <div className={styles.statusMeta}>
                  <span>TSK cross-refs: 29,481</span>
                  <span>·</span>
                  <span>Morphology: Verified</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. Architectural Metrics Ledger ── */}
      <section className={styles.ledgerSection} aria-label="System Metrics Ledger">
        <div className={styles.ledgerGrid}>
          <div className={styles.ledgerCell}>
            <div className={styles.ledgerNumber}>6</div>
            <div className={styles.ledgerLabel}>Translations Offline</div>
            <div className={styles.ledgerDetail}>KJV, ASV, WEB, BBE, Darby, YLT</div>
          </div>
          <div className={styles.ledgerCell}>
            <div className={styles.ledgerNumber}>14,100+</div>
            <div className={styles.ledgerLabel}>Strong’s Lemmata</div>
            <div className={styles.ledgerDetail}>8,600+ Hebrew &amp; 5,500+ Greek</div>
          </div>
          <div className={styles.ledgerCell}>
            <div className={styles.ledgerNumber}>500,000+</div>
            <div className={styles.ledgerLabel}>TSK Cross-References</div>
            <div className={styles.ledgerDetail}>Bidirectional scripture indexing</div>
          </div>
          <div className={styles.ledgerCell}>
            <div className={styles.ledgerNumber}>5</div>
            <div className={styles.ledgerLabel}>Analytical Dimensions</div>
            <div className={styles.ledgerDetail}>Scripture, History, Lang, Theol, Praxis</div>
          </div>
          <div className={styles.ledgerCell}>
            <div className={styles.ledgerNumber}>100%</div>
            <div className={styles.ledgerLabel}>Open-Core MIT Covenant</div>
            <div className={styles.ledgerDetail}>Zero corporate tracking &bull; Local data</div>
          </div>
        </div>
      </section>

      {/* ── 3. The Comparative Scriptorium Ledger ── */}
      <section className={styles.comparisonSection} aria-label="Comparative Architecture">
        <div className={styles.sectionHeader}>
          <span className={styles.headerTag}>ARCHITECTURAL AUDIT</span>
          <h2 className={styles.sectionTitle}>
            Why Scholars &amp; Ministers Are Migrating to BibleDesk
          </h2>
          <p className={styles.sectionSubtitle}>
            Traditional software built multi-million dollar walled gardens by locking public-domain Scripture behind paywalls. Commercial AI fabricates quotes. BibleDesk restores academic rigor and honest stewardship.
          </p>
        </div>

        <div className={styles.comparisonMatrix}>
          {/* Legacy Software Column */}
          <div className={styles.matrixColumnLegacy}>
            <div className={styles.columnHeader}>
              <div className={styles.columnBadgeLegacy}>
                <XCircle size={15} />
                <span>Commercial Software &amp; Generic AI</span>
              </div>
              <h3 className={styles.columnTitle}>The Walled Garden &amp; Black Box</h3>
            </div>

            <ul className={styles.matrixList}>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <XCircle size={16} className={styles.legacyIcon} />
                  <strong>$300–$1,500 License Paywalls</strong>
                </div>
                <p>Basic commentaries, concordance search, and morphological lexicons are gated behind escalating price tiers.</p>
              </li>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <XCircle size={16} className={styles.legacyIcon} />
                  <strong>Hallucinatory Black-Box AI</strong>
                </div>
                <p>Commercial chatbots invent verses, confabulate historical context, and offer zero verifiable citations.</p>
              </li>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <XCircle size={16} className={styles.legacyIcon} />
                  <strong>Surveillance &amp; Ad Monetization</strong>
                </div>
                <p>Free Bible portals clutter reading with behavioral ad pixels, banners, and analytics tracking.</p>
              </li>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <XCircle size={16} className={styles.legacyIcon} />
                  <strong>Proprietary Data Lock-In</strong>
                </div>
                <p>Your notes and insights are held hostage in proprietary database formats that cannot export to Markdown or Obsidian.</p>
              </li>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <XCircle size={16} className={styles.legacyIcon} />
                  <strong>Fragile Online Dependency</strong>
                </div>
                <p>If network connectivity falters during sermon preparation or a rural retreat, your study library is unreachable.</p>
              </li>
            </ul>
          </div>

          {/* BibleDesk Column */}
          <div className={styles.matrixColumnDesk}>
            <div className={styles.columnHeader}>
              <div className={styles.columnBadgeDesk}>
                <CheckCircle2 size={15} />
                <span>BibleDesk Scriptorium</span>
              </div>
              <h3 className={styles.columnTitle}>The Open Scripture Codex</h3>
            </div>

            <ul className={styles.matrixList}>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <CheckCircle2 size={16} className={styles.deskIcon} />
                  <strong>100% Free Core Scripture Forever</strong>
                </div>
                <p>Six public-domain translations and complete Strong’s lexicons bundled forever with zero paywalls.</p>
              </li>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <CheckCircle2 size={16} className={styles.deskIcon} />
                  <strong>Verifiable 5-Dimension Evidence</strong>
                </div>
                <p>Every finding is tested against 5 scholarly dimensions, mathematically scored, and backed by primary citations.</p>
              </li>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <CheckCircle2 size={16} className={styles.deskIcon} />
                  <strong>Local-First &amp; Zero Surveillance</strong>
                </div>
                <p>No corporate ad pixels, no tracking cookies, and complete data sovereignty. Your study belongs entirely to you.</p>
              </li>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <CheckCircle2 size={16} className={styles.deskIcon} />
                  <strong>Universal Markdown &amp; Obsidian Export</strong>
                </div>
                <p>1-click export of personal notes with `[[wikilinks]]`, formatted PDF study guides, and open REST/MCP agent endpoints.</p>
              </li>
              <li className={styles.matrixRow}>
                <div className={styles.rowLead}>
                  <CheckCircle2 size={16} className={styles.deskIcon} />
                  <strong>True Offline Independence</strong>
                </div>
                <p>Read, search, and cross-reference Scripture anywhere in the world with zero network connection required.</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 4. The 5-Dimension Evidence Compass ── */}
      <section className={styles.compassSection} aria-label="5-Dimension Evidence Compass">
        <div className={styles.sectionHeader}>
          <span className={styles.headerTag}>HERMENEUTICAL METHOD</span>
          <h2 className={styles.sectionTitle}>The Five Dimensions of Sourced Truth</h2>
          <p className={styles.sectionSubtitle}>
            To eliminate superficial answers and theological hallucinations, every BibleDesk insight is evaluated through five interconnected scholarly dimensions.
          </p>
        </div>

        <div className={styles.compassGrid}>
          <div className={`${styles.compassCard} ${styles.cardScripture}`}>
            <div className={styles.compassBadge}>01 · SCRIPTURE</div>
            <h3 className={styles.compassTitle}>Scriptural Context</h3>
            <p className={styles.compassText}>Textual fidelity, grammatical syntax, genre conventions, and canonical harmony across Old and New Testaments.</p>
            <div className={styles.compassWeight}>Mathematical Weight: 30%</div>
          </div>

          <div className={`${styles.compassCard} ${styles.cardHistory}`}>
            <div className={styles.compassBadge}>02 · HISTORICAL</div>
            <h3 className={styles.compassTitle}>Historical Setting</h3>
            <p className={styles.compassText}>Ancient Near Eastern culture, Second Temple Judaism, Greco-Roman imperialism, authorial context, and archaeology.</p>
            <div className={styles.compassWeight}>Mathematical Weight: 20%</div>
          </div>

          <div className={`${styles.compassCard} ${styles.cardPhilology}`}>
            <div className={styles.compassBadge}>03 · PHILOLOGY</div>
            <h3 className={styles.compassTitle}>Original Language</h3>
            <p className={styles.compassText}>Koine Greek, Biblical Hebrew, and Aramaic lemmata parsed through Strong’s concordance without illegitimate root transfer.</p>
            <div className={styles.compassWeight}>Mathematical Weight: 20%</div>
          </div>

          <div className={`${styles.compassCard} ${styles.cardTheology}`}>
            <div className={styles.compassBadge}>04 · THEOLOGY</div>
            <h3 className={styles.compassTitle}>Theological Coherence</h3>
            <p className={styles.compassText}>Ecumenical creeds (Nicene, Chalcedonian), historic confessions, and systematic canonical dogmatics.</p>
            <div className={styles.compassWeight}>Mathematical Weight: 15%</div>
          </div>

          <div className={`${styles.compassCard} ${styles.cardPraxis}`}>
            <div className={styles.compassBadge}>05 · PRAXIS</div>
            <h3 className={styles.compassTitle}>Practical Application</h3>
            <p className={styles.compassText}>Pastoral sanctification, ethical discipleship, liturgical renewal, and heart-level discipleship for contemporary life.</p>
            <div className={styles.compassWeight}>Mathematical Weight: 15%</div>
          </div>
        </div>

        {/* Mathematical Derivation Box */}
        <div className={styles.derivationBox}>
          <div className={styles.derivationHeader}>
            <Compass size={16} className={styles.derivationIcon} />
            <span>TRANSPARENT CONFIDENCE DERIVATION FORMULA</span>
          </div>
          <div className={styles.derivationFormula}>
            Confidence = 0.30(Scripture) + 0.20(Language) + 0.20(History) + 0.15(Theology) + 0.15(Citations)
          </div>
          <p className={styles.derivationNote}>
            A High Confidence score (&ge; 75%) requires positive grounding across all five factors. Answers with missing manuscript provenance are flagged with transparent uncertainty.
          </p>
        </div>
      </section>

      {/* ── 5. Lifelong Study Suite ── */}
      <section className={styles.suiteSection} aria-label="Product Features">
        <div className={styles.sectionHeader}>
          <span className={styles.headerTag}>RESEARCH INSTRUMENT</span>
          <h2 className={styles.sectionTitle}>Everything Required for Lifelong Study</h2>
          <p className={styles.sectionSubtitle}>
            A precision scholarly instrument for pastors, seminary researchers, small group teachers, and prayer intercessors.
          </p>
        </div>

        <div className={styles.suiteGrid}>
          {/* Feature 1: Study Desk */}
          <div className={styles.suiteCellHero}>
            <div className={styles.suiteCellHeader}>
              <div className={styles.cellIconWrap}><BookOpen size={18} /></div>
              <span className={styles.cellTag}>CORE SANCTUARY</span>
            </div>
            <h3 className={styles.cellTitle}>3-Column Study Desk &amp; Parallel Comparison</h3>
            <p className={styles.cellBody}>
              A distraction-free reading sanctuary. Read translations side-by-side (e.g. WEB alongside KJV), inspect Strong’s lexicons on click, navigate via ⌘K Quick Jump, and customize line height to your exact reading cadence.
            </p>
            <div className={styles.cellPills}>
              <span>Parallel Translation</span>
              <span>6 Bundled Modules</span>
              <span>Focus Reader Mode</span>
              <span>Ctrl+K Quick Jump</span>
            </div>
          </div>

          {/* Feature 2: Research Workbench */}
          <div className={styles.suiteCell}>
            <div className={styles.suiteCellHeader}>
              <div className={styles.cellIconWrap}><Sparkles size={18} /></div>
              <span className={styles.cellTag}>ACADEMIC WEB GROUNDING</span>
            </div>
            <h3 className={styles.cellTitle}>Anthropic Claude 3.5 Sonnet Workbench</h3>
            <p className={styles.cellBody}>
              Equipped with live academic web tools to unearth primary historical treatises, scholarly lexicons, and verifiable theological citations.
            </p>
          </div>

          {/* Feature 3: World PrayerAtlas */}
          <div className={styles.suiteCell}>
            <div className={styles.suiteCellHeader}>
              <div className={styles.cellIconWrap}><Globe size={18} /></div>
              <span className={styles.cellTag}>GLOBAL INTERCESSION</span>
            </div>
            <h3 className={styles.cellTitle}>Interactive 2D World PrayerAtlas</h3>
            <p className={styles.cellBody}>
              Intercede for global beacons across restricted regions, church plants, and medical needs with consent-gated public submissions.
            </p>
          </div>

          {/* Feature 4: Catechisms Lab */}
          <div className={styles.suiteCell}>
            <div className={styles.suiteCellHeader}>
              <div className={styles.cellIconWrap}><Scroll size={18} /></div>
              <span className={styles.cellTag}>HISTORIC RECALL</span>
            </div>
            <h3 className={styles.cellTitle}>Multi-Tradition Catechism &amp; Creedal Lab</h3>
            <p className={styles.cellBody}>
              Study Westminster, Heidelberg, Luther’s Small, 1689 London Baptist, and 39 Articles with interactive recall and verse memory.
            </p>
          </div>

          {/* Feature 5: Knowledge Vault */}
          <div className={styles.suiteCell}>
            <div className={styles.suiteCellHeader}>
              <div className={styles.cellIconWrap}><Layers size={18} /></div>
              <span className={styles.cellTag}>LOCAL SOVEREIGNTY</span>
            </div>
            <h3 className={styles.cellTitle}>Obsidian &amp; PDF Vault Exporter</h3>
            <p className={styles.cellBody}>
              Own your research forever. Export your notes and scripture references as an Obsidian Markdown vault (.zip) or print passage study guides.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Kingdom Stewardship Pricing ── */}
      <section className={styles.pricingSection} aria-label="Transparent Membership">
        <div className={styles.sectionHeader}>
          <span className={styles.headerTag}>KINGDOM COVENANT</span>
          <h2 className={styles.sectionTitle}>Simple, Transparent Stewardship</h2>
          <p className={styles.sectionSubtitle}>
            God’s Word is never for sale. Core Scripture reading is free forever. Paid tiers sponsor hosted server AI compute and multi-device cloud synchronization.
          </p>

          {/* Billing Switcher Toggle */}
          <div className={styles.billingToggle}>
            <span className={!annualBilling ? styles.billingActive : ''}>Monthly</span>
            <button
              type="button"
              className={styles.toggleTrack}
              onClick={() => setAnnualBilling(!annualBilling)}
              aria-label="Toggle Annual Billing"
            >
              <div className={`${styles.toggleThumb} ${annualBilling ? styles.toggleThumbActive : ''}`} />
            </button>
            <span className={annualBilling ? styles.billingActive : ''}>
              Annual <span className={styles.saveBadge}>Save 30%</span>
            </span>
          </div>
        </div>

        <div className={styles.pricingGrid}>
          {/* Tier 1: Free Community */}
          <div className={styles.pricingCard}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadge}>FREE COVENANT</span>
              <h3 className={styles.tierName}>Community Open Core</h3>
              <div className={styles.tierPriceRow}>
                <span className={styles.tierPrice}>$0</span>
                <span className={styles.tierPeriod}>Free Forever</span>
              </div>
              <p className={styles.tierDesc}>
                Complete, unhindered Scripture study and prayer tools for every believer on earth.
              </p>
            </div>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>6 Bundled Offline Translations</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Strong’s Greek &amp; Hebrew Lexicons</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>500,000+ TSK Cross-References</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Local Notes &amp; Highlights</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>5 Free Hosted AI Answers / Day</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span><strong>Unlimited AI with BYOK (Free Gemini)</strong></span>
              </div>
            </div>

            <Link href="/bible" className={styles.tierActionSecondary}>
              <span>Start Studying Free</span>
            </Link>
          </div>

          {/* Tier 2: BibleDesk Pro */}
          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.tierHeader}>
              <span className={styles.featuredBadge}>MOST POPULAR</span>
              <h3 className={styles.tierName}>BibleDesk Pro</h3>
              <div className={styles.tierPriceRow}>
                <span className={styles.tierPrice}>{annualBilling ? '$5' : '$7'}</span>
                <span className={styles.tierPeriod}>/ month {annualBilling ? '($60 billed yearly)' : ''}</span>
              </div>
              <p className={styles.tierDesc}>
                For deep researchers, seminary students, and teachers who want hosted AI compute with zero key configuration.
              </p>
            </div>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Everything in Free Core</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span><strong>250 Hosted 5D AI Answers / Day</strong></span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Real-Time Cloud Notes Sync</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>1-Click Obsidian Vault (.zip) Export</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Printable Passage Study Guides</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Google Calendar Prayer Care Sync</span>
              </div>
            </div>

            <Link href="/pricing" className={styles.tierActionPrimary}>
              <span>Upgrade to Pro</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Tier 3: Ministry & Pastoral */}
          <div className={styles.pricingCard}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadge}>MINISTRY</span>
              <h3 className={styles.tierName}>Pastoral &amp; Ministry</h3>
              <div className={styles.tierPriceRow}>
                <span className={styles.tierPrice}>{annualBilling ? '$15' : '$19'}</span>
                <span className={styles.tierPeriod}>/ month {annualBilling ? '($180 billed yearly)' : ''}</span>
              </div>
              <p className={styles.tierDesc}>
                For pastors, small group leaders, and church care teams discipling congregations.
              </p>
            </div>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Everything in BibleDesk Pro</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span><strong>1,000 Hosted AI Answers / Day</strong></span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Reviewed Pastoral Gmail Draft Export</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Priority Research Assistant Compute</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={14} className={styles.checkIcon} />
                <span>Church Directory &amp; Group Workspaces</span>
              </div>
            </div>

            <Link href="/pricing" className={styles.tierActionSecondary}>
              <span>View Ministry Plans</span>
            </Link>
          </div>
        </div>

        {/* Covenant Guarantee Banner */}
        <div className={styles.covenantBanner}>
          <ShieldCheck size={18} className={styles.covenantIcon} />
          <div className={styles.covenantText}>
            <strong>The BibleDesk Covenant Guarantee:</strong> Scripture reading, concordance searches, and Strong&rsquo;s lexicons will never be paywalled. Self-hosters can run 100% of the platform for free using our open-source Docker and PGlite stack (`NEXT_PUBLIC_SELF_HOSTED=true`).
          </div>
        </div>
      </section>

      {/* ── 7. Scholarly FAQ Accordion ── */}
      <section className={styles.faqSection} aria-label="Frequently Asked Questions">
        <div className={styles.sectionHeader}>
          <span className={styles.headerTag}>DIRECT ANSWERS</span>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <p className={styles.sectionSubtitle}>
            Clear, transparent answers about our data privacy, free-tier guarantees, and evidence grounding.
          </p>
        </div>

        <div className={styles.faqList}>
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={`${styles.faqCard} ${isOpen ? styles.faqCardOpen : ''}`}>
                <button
                  type="button"
                  className={styles.faqQuestionBtn}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.faqQuestionText}>{faq.q}</span>
                  <span className={styles.faqIcon}>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                {isOpen && (
                  <div className={styles.faqAnswer}>
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 8. Architectural Closing Banner ── */}
      <section className={styles.closingSection} aria-label="Begin Study">
        <div className={styles.closingCard}>
          <div className={styles.closingTag}>[ENTER THE SCRIPTorium]</div>
          <h2 className={styles.closingTitle}>
            Step Into Scripture with Precision &amp; Reverence
          </h2>
          <p className={styles.closingSubtitle}>
            Zero paywalls. Zero advertising. Zero corporate surveillance. Open the Study Desk immediately in your browser, or deploy your private container.
          </p>

          <div className={styles.closingActions}>
            <Link href="/bible" className={styles.primaryAction}>
              <BookOpen size={16} />
              <span>Launch Study Desk</span>
              <ArrowRight size={14} className={styles.actionArrow} />
            </Link>

            <Link href="/developers" className={styles.secondaryAction}>
              <Code size={15} />
              <span>Developer SDK &amp; MCP</span>
            </Link>
          </div>

          <div className={styles.closingFootnote}>
            <span>✓ Instant browser access</span>
            <span>&bull;</span>
            <span>✓ Works completely offline</span>
            <span>&bull;</span>
            <span>✓ MIT Open-Source Covenant</span>
          </div>
        </div>
      </section>

    </div>
  );
}
