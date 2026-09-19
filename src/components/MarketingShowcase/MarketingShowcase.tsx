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
      {/* ── 1. Hero Section ── */}
      <section className={styles.heroSection} aria-label="BibleDesk Overview">
        {/* Glowing Ambient Mesh */}
        <div className={styles.ambientGlow} aria-hidden="true" />

        <div className={styles.heroInner}>
          {/* Eyebrow / Social Proof Tag */}
          <div className={styles.heroEyebrow}>
            <Sparkles size={14} className={styles.sparkleIcon} />
            <span>Open-Source Scripture Intelligence · 100% Free Core Forever</span>
          </div>

          {/* High-Impact Headline */}
          <h1 className={styles.heroTitle}>
            Where Deep Biblical Scholarship Meets <span>Verifiable Intelligence</span>
          </h1>

          {/* Persuasive Subheadline */}
          <p className={styles.heroSubtitle}>
            Read and search 6 bundled public-domain translations completely offline. Explore Strong’s Greek &amp; Hebrew
            lexicons, evaluate theological claims through our 5-dimension evidence engine, and intercede globally —
            with zero paywalls, zero ads, and zero tracking.
          </p>

          {/* Dual Action CTAs */}
          <div className={styles.heroActions}>
            <Link href="/bible" className={`${styles.primaryCta} button-kinetic`}>
              <BookOpen size={18} />
              <span>Open Study Desk — Free Forever</span>
              <div className={styles.ctaIconCircle}>
                <ArrowRight size={15} className="kinetic-icon" />
              </div>
            </Link>

            <Link href="/research" className={`${styles.secondaryCta} button-kinetic`}>
              <Sparkles size={18} color="var(--gold-400)" />
              <span>Explore 5D Research</span>
            </Link>
          </div>

          {/* Friction-Reduction Reassurances */}
          <div className={styles.microAssurances}>
            <div className={styles.assuranceItem}>
              <CheckCircle2 size={15} color="#0a6b48" />
              <span>No credit card required</span>
            </div>
            <div className={styles.assuranceItem}>
              <CheckCircle2 size={15} color="#0a6b48" />
              <span>Works 100% offline</span>
            </div>
            <div className={styles.assuranceItem}>
              <CheckCircle2 size={15} color="#0a6b48" />
              <span>BYOK unlimited free AI</span>
            </div>
            <div className={styles.assuranceItem}>
              <CheckCircle2 size={15} color="#0a6b48" />
              <span>MIT Open Source</span>
            </div>
          </div>

          {/* ── Interactive Hero Teaser Card ── */}
          <div className={styles.heroTeaserCard}>
            <div className={styles.teaserHeader}>
              <div className={styles.teaserTabs}>
                {DEMO_QUERIES.map(q => (
                  <button
                    key={q.id}
                    type="button"
                    className={`${styles.teaserTabBtn} ${activeDemo.id === q.id ? styles.teaserTabActive : ''}`}
                    onClick={() => {
                      setActiveDemo(q);
                      setActiveDimension('originalLanguage');
                    }}
                  >
                    <span>{q.reference}</span>
                  </button>
                ))}
              </div>

              <div className={styles.confidenceBadge}>
                <ShieldCheck size={14} color="#0a6b48" />
                <span>{activeDemo.confidence}% Confidence · {activeDemo.confidenceTier}</span>
              </div>
            </div>

            <div className={styles.teaserBody}>
              <div className={styles.queryPrompt}>
                <Search size={16} color="var(--gold-400)" />
                <span className={styles.queryText}>{activeDemo.query}</span>
              </div>

              {/* 5-Dimension Pill Bar */}
              <div className={styles.dimensionPills}>
                <button
                  type="button"
                  className={`${styles.dimPill} ${activeDimension === 'scripture' ? styles.dimPillActiveScripture : ''}`}
                  onClick={() => setActiveDimension('scripture')}
                >
                  📖 Scripture
                </button>
                <button
                  type="button"
                  className={`${styles.dimPill} ${activeDimension === 'historical' ? styles.dimPillActiveHistorical : ''}`}
                  onClick={() => setActiveDimension('historical')}
                >
                  🏛️ Historical
                </button>
                <button
                  type="button"
                  className={`${styles.dimPill} ${activeDimension === 'originalLanguage' ? styles.dimPillActiveLang : ''}`}
                  onClick={() => setActiveDimension('originalLanguage')}
                >
                  📜 Greek / Hebrew
                </button>
                <button
                  type="button"
                  className={`${styles.dimPill} ${activeDimension === 'theological' ? styles.dimPillActiveTheological : ''}`}
                  onClick={() => setActiveDimension('theological')}
                >
                  ⚖️ Theological
                </button>
                <button
                  type="button"
                  className={`${styles.dimPill} ${activeDimension === 'practical' ? styles.dimPillActivePractical : ''}`}
                  onClick={() => setActiveDimension('practical')}
                >
                  💡 Life Application
                </button>
              </div>

              {/* Dynamic Dimension Output Content */}
              <div className={styles.dimensionContentBox}>
                <p className={styles.dimensionText}>
                  {activeDemo.dimensions[activeDimension]}
                </p>

                {/* Sources strip */}
                <div className={styles.sourcesRow}>
                  <span className={styles.sourcesLabel}>Verifiable Citations:</span>
                  {activeDemo.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sourceTag}
                    >
                      <span>{src.title}</span>
                      <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Authority & Proof Bar ── */}
      <section className={styles.statsSection} aria-label="System Metrics">
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>6</div>
            <div className={styles.statLabel}>Translations Offline</div>
            <div className={styles.statSub}>KJV, ASV, WEB, BBE, Darby, YLT</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>14,100+</div>
            <div className={styles.statLabel}>Strong’s Lexicon Entries</div>
            <div className={styles.statSub}>8,600+ Hebrew &amp; 5,500+ Greek</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>500,000+</div>
            <div className={styles.statLabel}>TSK Cross-References</div>
            <div className={styles.statSub}>Indexed canonically for deep study</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>5</div>
            <div className={styles.statLabel}>Analytical Dimensions</div>
            <div className={styles.statSub}>Scripture, History, Lang, Theol, Life</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>100%</div>
            <div className={styles.statLabel}>Open-Core MIT License</div>
            <div className={styles.statSub}>Zero tracking &bull; Local-first privacy</div>
          </div>
        </div>
      </section>

      {/* ── 3. Pain vs. Gain: Traditional Software vs BibleDesk ── */}
      <section className={styles.comparisonSection} aria-label="Comparison">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>The Honest Comparison</span>
          <h2 className={styles.sectionTitle}>Why Scholars &amp; Believers Are Switching to BibleDesk</h2>
          <p className={styles.sectionSubtitle}>
            Traditional Bible software built multi-million dollar empires by locking public-domain Scripture behind expensive paywalls. We took a radically different path.
          </p>
        </div>

        <div className={styles.comparisonTableCard}>
          <div className={styles.comparisonGrid}>
            {/* The Old Way */}
            <div className={styles.comparisonColOld}>
              <div className={styles.colHeaderOld}>
                <XCircle size={20} color="#b81d58" />
                <h3>Traditional Bible Software &amp; Generic AI</h3>
              </div>
              <ul className={styles.comparisonList}>
                <li>
                  <XCircle size={16} className={styles.iconRed} />
                  <span><strong>$300&ndash;$1,500 License Paywalls:</strong> Base packages lock basic commentaries and lexicons behind expensive tier upgrades.</span>
                </li>
                <li>
                  <XCircle size={16} className={styles.iconRed} />
                  <span><strong>Hallucinating Black-Box Chatbots:</strong> Commercial AI chatbots fabricate Bible verses, invent church history, and provide zero source verification.</span>
                </li>
                <li>
                  <XCircle size={16} className={styles.iconRed} />
                  <span><strong>Intrusive Surveillance &amp; Ads:</strong> Free online Bible portals monetize your reading habits with banner advertisements and behavioral ad trackers.</span>
                </li>
                <li>
                  <XCircle size={16} className={styles.iconRed} />
                  <span><strong>Proprietary Data Lock-In:</strong> Your highlights, notes, and study guides are trapped in closed formats that cannot be exported to Obsidian or Markdown.</span>
                </li>
                <li>
                  <XCircle size={16} className={styles.iconRed} />
                  <span><strong>Fragile Online-Only Dependency:</strong> If your network drops in church, on a mission trip, or in a rural retreat, your study tools break.</span>
                </li>
              </ul>
            </div>

            {/* The BibleDesk Way */}
            <div className={styles.comparisonColNew}>
              <div className={styles.colHeaderNew}>
                <CheckCircle2 size={20} color="#0a6b48" />
                <h3>The BibleDesk Promise</h3>
              </div>
              <ul className={styles.comparisonList}>
                <li>
                  <CheckCircle2 size={16} className={styles.iconGreen} />
                  <span><strong>100% Free Core Scripture:</strong> Six public-domain translations and Strong’s lexicons are bundled forever with zero paywalls.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} className={styles.iconGreen} />
                  <span><strong>Verifiable 5-Dimension Grounding:</strong> Every theological claim is rigorously evaluated across 5 scholarly dimensions with clickable, traceable source links.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} className={styles.iconGreen} />
                  <span><strong>Local-First &amp; Zero Tracking:</strong> No corporate trackers, no banner ads, and complete data privacy. Your reflections belong to you.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} className={styles.iconGreen} />
                  <span><strong>Universal Markdown &amp; Obsidian Export:</strong> 1-click export of your study notes with `[[wikilinks]]`, printable PDF worksheets, and open REST/MCP APIs.</span>
                </li>
                <li>
                  <CheckCircle2 size={16} className={styles.iconGreen} />
                  <span><strong>True Offline Independence:</strong> Read, search, and cross-reference Scripture anywhere in the world without an internet connection.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. The 5-Dimension Evidence Framework ── */}
      <section className={styles.frameworkSection} aria-label="5-Dimension Evidence Framework">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Uncompromising Rigor</span>
          <h2 className={styles.sectionTitle}>The Five Dimensions of Biblical Truth</h2>
          <p className={styles.sectionSubtitle}>
            To guard against false teaching and AI confabulation, every BibleDesk insight is analyzed through 5 distinct lenses.
          </p>
        </div>

        <div className={styles.dimensionsGrid}>
          <div className={`${styles.dimensionCard} ${styles.dimCardScripture}`}>
            <div className={styles.dimIconBadge}>📖</div>
            <h3>1. Scripture Context</h3>
            <p>Direct textual fidelity, literary genre, preceding and succeeding verses, and canonical harmony across both Testaments.</p>
            <span className={styles.dimWeightTag}>Weight: 30%</span>
          </div>

          <div className={`${styles.dimensionCard} ${styles.dimCardHistorical}`}>
            <div className={styles.dimIconBadge}>🏛️</div>
            <h3>2. Historical Setting</h3>
            <p>Ancient Near Eastern culture, Greco-Roman imperial context, authorial background, archaeological findings, and primary recipients.</p>
            <span className={styles.dimWeightTag}>Weight: 20%</span>
          </div>

          <div className={`${styles.dimensionCard} ${styles.dimCardLang}`}>
            <div className={styles.dimIconBadge}>📜</div>
            <h3>3. Original Language</h3>
            <p>Greek (Koine) &amp; Hebrew lexical roots, grammatical parsing, morphology, and Strong’s concordance without linguistic overreach.</p>
            <span className={styles.dimWeightTag}>Weight: 20%</span>
          </div>

          <div className={`${styles.dimensionCard} ${styles.dimCardTheol}`}>
            <div className={styles.dimIconBadge}>⚖️</div>
            <h3>4. Theological Coherence</h3>
            <p>Systematic biblical orthodoxy, historic ecumenical creeds (Nicene, Apostles&rsquo;), and historic confessions (Westminster, Heidelberg, 1689).</p>
            <span className={styles.dimWeightTag}>Weight: 15%</span>
          </div>

          <div className={`${styles.dimensionCard} ${styles.dimCardPractical}`}>
            <div className={styles.dimIconBadge}>💡</div>
            <h3>5. Practical Application</h3>
            <p>Heart-level sanctification, pastoral care, ethical discipleship, and spiritual renewal for your contemporary daily walk.</p>
            <span className={styles.dimWeightTag}>Weight: 15%</span>
          </div>
        </div>

        {/* Formula Box */}
        <div className={styles.formulaBox}>
          <div className={styles.formulaTitle}>Transparent Multi-Factor Confidence Scoring</div>
          <div className={styles.formulaMath}>
            Confidence Score = 0.30(Scripture) + 0.20(Language) + 0.20(History) + 0.15(Theology) + 0.15(Citations)
          </div>
          <div className={styles.formulaDesc}>
            High Confidence (&ge; 75%) requires grounded evidence across all five dimensions. No fabricated citations are ever accepted.
          </div>
        </div>
      </section>

      {/* ── 5. Superpowers Bento Grid ── */}
      <section className={styles.bentoSection} aria-label="Product Features">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Complete Study Suite</span>
          <h2 className={styles.sectionTitle}>Everything You Need for Lifelong Study</h2>
          <p className={styles.sectionSubtitle}>
            A unified suite designed for personal discipleship, seminary research, pastoral preaching, and church intercession.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          {/* Card 1: Focus Reader */}
          <div className={`${styles.bentoCard} ${styles.bentoLarge}`}>
            <div className={styles.bentoContent}>
              <div className={styles.bentoIcon}><BookOpen size={20} /></div>
              <h3>3-Column Study Desk &amp; Parallel Compare</h3>
              <p>
                A distraction-free reading sanctuary with customizable typography, instant parallel translation comparison (e.g. WEB alongside KJV), and Quick Jump (Ctrl+K) navigation.
              </p>
              <div className={styles.pillList}>
                <span>Parallel Translation</span>
                <span>6 Offline Modules</span>
                <span>Custom Line-Height</span>
                <span>Quick Jump (Ctrl+K)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Research Workbench */}
          <div className={`${styles.bentoCard} ${styles.bentoWide}`}>
            <div className={styles.bentoContent}>
              <div className={styles.bentoIcon}><Sparkles size={20} /></div>
              <h3>Claude 3.5 Sonnet Scholarly Research</h3>
              <p>
                Equipped with live academic web search tools to unearth historical context, theological treatises, and linguistic commentaries with verifiable clickable citations.
              </p>
              <div className={styles.pillList}>
                <span>Web Grounding</span>
                <span>Real URL Citations</span>
                <span>Save to Notes</span>
              </div>
            </div>
          </div>

          {/* Card 3: World PrayerAtlas */}
          <div className={styles.bentoCard}>
            <div className={styles.bentoContent}>
              <div className={styles.bentoIcon}><Globe size={20} /></div>
              <h3>Interactive 2D World PrayerAtlas</h3>
              <p>
                Intercede for global beacons across restricted regions, church plants, and medical needs with consent-gated public submissions.
              </p>
            </div>
          </div>

          {/* Card 4: Catechisms Lab */}
          <div className={styles.bentoCard}>
            <div className={styles.bentoContent}>
              <div className={styles.bentoIcon}><Scroll size={20} /></div>
              <h3>Multi-Tradition Catechism Lab</h3>
              <p>
                Study and memorize Westminster, Heidelberg, Luther’s Small, 1689 London Baptist, and 39 Articles with interactive recall quizzes.
              </p>
            </div>
          </div>

          {/* Card 5: Knowledge Vault */}
          <div className={styles.bentoCard}>
            <div className={styles.bentoContent}>
              <div className={styles.bentoIcon}><Layers size={20} /></div>
              <h3>Obsidian &amp; PDF Vault Export</h3>
              <p>
                Own your knowledge forever. Export your notes and scripture references as an Obsidian markdown vault (.zip) or print clean PDF study worksheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Kingdom Stewardship Pricing ── */}
      <section className={styles.pricingSection} aria-label="Transparent Pricing">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Transparent Stewardship</span>
          <h2 className={styles.sectionTitle}>Simple, Kingdom-First Pricing</h2>
          <p className={styles.sectionSubtitle}>
            The Word of God is never for sale. Core Scripture is free forever. Paid tiers sponsor hosted server AI compute and multi-device cloud synchronization.
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
            <h3 className={styles.tierName}>Community / Open Core</h3>
            <div className={styles.tierPriceRow}>
              <span className={styles.tierPrice}>$0</span>
              <span className={styles.tierPeriod}>Free Forever</span>
            </div>
            <p className={styles.tierDesc}>
              Complete, unhindered Scripture study and prayer tools for every believer on earth.
            </p>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>6 Bundled Offline Translations</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Strong’s Greek &amp; Hebrew Lexicons</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>500,000+ TSK Cross-References</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Local Notes &amp; Highlights</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>5 Free Hosted AI Answers / Day</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span><strong>Unlimited AI with BYOK (Free Gemini)</strong></span>
              </div>
            </div>

            <Link href="/bible" className={styles.secondaryCta} style={{ width: '100%', justifyContent: 'center' }}>
              <span>Start Studying Free</span>
            </Link>
          </div>

          {/* Tier 2: BibleDesk Pro */}
          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.pricingFeaturedBadge}>Most Popular</div>
            <h3 className={styles.tierName}>BibleDesk Pro</h3>
            <div className={styles.tierPriceRow}>
              <span className={styles.tierPrice}>{annualBilling ? '$5' : '$7'}</span>
              <span className={styles.tierPeriod}>/ month {annualBilling ? '($60 billed yearly)' : ''}</span>
            </div>
            <p className={styles.tierDesc}>
              For deep researchers, students, and teachers who want hosted AI with zero API setup and seamless cloud sync.
            </p>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Everything in Free Core</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span><strong>250 Hosted 5D AI Answers / Day</strong></span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Real-Time Cloud Notes &amp; Highlights Sync</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>1-Click Obsidian Vault (.zip) Export</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Formatted Printable PDF Study Guides</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Google Calendar Prayer Care Sync</span>
              </div>
            </div>

            <Link href="/pricing" className={styles.primaryCta} style={{ width: '100%', justifyContent: 'center' }}>
              <span>Upgrade to Pro</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Tier 3: Ministry & Church Leader */}
          <div className={styles.pricingCard}>
            <h3 className={styles.tierName}>Ministry &amp; Pastoral</h3>
            <div className={styles.tierPriceRow}>
              <span className={styles.tierPrice}>{annualBilling ? '$15' : '$19'}</span>
              <span className={styles.tierPeriod}>/ month {annualBilling ? '($180 billed yearly)' : ''}</span>
            </div>
            <p className={styles.tierDesc}>
              For pastors, small group leaders, and church ministry teams discipling congregations.
            </p>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Everything in BibleDesk Pro</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span><strong>1,000 Hosted AI Answers / Day</strong></span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Reviewed Pastoral Gmail Draft Export</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Priority Research Assistant Compute</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#0a6b48" />
                <span>Church Directory &amp; Group Workspaces</span>
              </div>
            </div>

            <Link href="/pricing" className={styles.secondaryCta} style={{ width: '100%', justifyContent: 'center' }}>
              <span>View Ministry Plans</span>
            </Link>
          </div>
        </div>

        {/* Covenant Guarantee Banner */}
        <div className={styles.covenantBanner}>
          <ShieldCheck size={20} color="var(--gold-400)" />
          <div>
            <strong>The BibleDesk Covenant Guarantee:</strong> Scripture reading, concordance searches, and Strong&rsquo;s lexicons will never be paywalled. Self-hosters can run 100% of the platform for free using our open-source Docker and PGlite stack.
          </div>
        </div>
      </section>

      {/* ── 7. Objection-Busting FAQ Accordion ── */}
      <section className={styles.faqSection} aria-label="Frequently Asked Questions">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Got Questions?</span>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need to know about our data privacy, free-tier guarantees, and AI grounding.
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
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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

      {/* ── 8. High-Converting Bottom CTA Banner ── */}
      <section className={styles.finalCtaSection} aria-label="Get Started">
        <div className={styles.finalCtaCard}>
          <div className={styles.finalCtaEyebrow}>
            <Sparkles size={14} />
            <span>Ready for a Deeper Study Experience?</span>
          </div>

          <h2 className={styles.finalCtaTitle}>
            Step Into God’s Word with Complete Clarity
          </h2>

          <p className={styles.finalCtaSubtitle}>
            No subscriptions required to read. No tracking. No advertisements. Open the Study Desk right now in your browser, or install the standalone PWA on your desktop and phone.
          </p>

          <div className={styles.finalCtaActions}>
            <Link href="/bible" className={`${styles.finalPrimaryBtn} button-kinetic`}>
              <BookOpen size={18} />
              <span>Launch BibleDesk Study Desk</span>
              <div className={styles.ctaIconCircle}>
                <ArrowRight size={15} className="kinetic-icon" />
              </div>
            </Link>

            <Link href="/developers" className={styles.finalSecondaryBtn}>
              <Code size={16} />
              <span>Developer SDK &amp; MCP</span>
            </Link>
          </div>

          <div className={styles.finalCtaFootnote}>
            <span>✓ Instant access in browser</span>
            <span>&bull;</span>
            <span>✓ Zero installation required</span>
            <span>&bull;</span>
            <span>✓ 100% Free Core Open Source</span>
          </div>
        </div>
      </section>
    </div>
  );
}
