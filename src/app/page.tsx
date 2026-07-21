'use client';

import { useRef, useEffect, useState } from 'react';
import Header from '@/components/Header/Header';
import SearchBar from '@/components/SearchBar/SearchBar';
import DimensionPanel from '@/components/DimensionPanel/DimensionPanel';
import StreamingProgress from '@/components/StreamingProgress/StreamingProgress';
import RateLimitBar from '@/components/RateLimitBar/RateLimitBar';
import { ErrorState } from '@/components/LoadingState/LoadingState';
import { useStreamingAsk } from '@/hooks/useStreamingAsk';
import styles from './page.module.css';

const PLACEHOLDERS = [
  'What did Jesus mean by "born again"?',
  'Explain the armor of God in Ephesians 6',
  'Who wrote the book of Hebrews?',
  'What is the significance of the number 40 in the Bible?',
  'What does "selah" mean in the Psalms?',
  'Why did God harden Pharaoh\'s heart?',
  'What is the Sermon on the Mount about?',
  'Explain the Trinity in Scripture',
];

const TEASER_ITEMS = [
  { label: 'Bible Reader',         desc: 'Chapter reading, Strong’s concordance, color highlights & audio', href: '/bible' },
  { label: 'Daily Devotional',     desc: 'Curated daily verse, reflection, prayer & shuffle controls',       href: '/daily' },
  { label: 'Reading Plans',        desc: 'Interactive 30 & 90-day reading schedules with progress tracking', href: '/plans' },
  { label: 'Catechism',            desc: 'Westminster & Heidelberg Q&A with interactive Quiz Mode',          href: '/catechism' },
  { label: 'Historic Creeds',      desc: 'Apostles’, Nicene, Chalcedonian & Athanasian confessions',         href: '/creeds' },
  { label: 'Verse Memory',         desc: 'Flashcards, word-masking & first-letter memory prompts',            href: '/memory' },
  { label: 'Prayer Board',         desc: 'Global prayer requests plotted on an interactive 3D globe',         href: '/prayer' },
  { label: 'Sermon Prep',          desc: 'Outline editor with live Markdown preview & print export',          href: '/sermons' },
];

const FEATURE_BADGES: Record<string, { label: string; color: string }> = {
  'Scripture':             { label: 'STUDY',    color: 'var(--dim-scripture)' },
  'Historical Context':    { label: 'CHURCH',   color: 'var(--dim-historical)' },
  'Original Language':     { label: 'LANGUAGE', color: 'var(--dim-language)' },
  'Theology':              { label: 'DOCTRINE', color: 'var(--dim-theological)' },
  'Practical Application': { label: 'LIFE',     color: 'var(--dim-practical)' },
};

export default function HomePage() {
  const { status, stages, answer, shareSlug, error, rateLimit, ask, retry } = useStreamingAsk();
  const answerRef = useRef<HTMLDivElement>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  function handleAsk(question: string, translation: import('@/types').TranslationId, isNonAI = false) {
    ask(question, translation, isNonAI);
    setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  const isLoading  = status === 'loading';
  const hasContent = isLoading || answer !== null || error !== null;

  return (
    <>
      <Header />
      <main id="main-content">

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className={styles.hero} aria-label="BibleDesk hero">
          <div className={`container ${styles.heroInner}`}>

            <div className={styles.heroTag}>✦ AI-Powered Bible Study</div>

            <h1 className={styles.heroTitle}>
              Every Question.{' '}
              <span className="text-gradient">Five Dimensions</span>{' '}
              of Truth.
            </h1>

            <p className={styles.heroSubtitle}>
              Ask any Bible question and receive a deep, sourced answer covering
              scripture, historical context, original languages, theology, and
              practical application — all free.
            </p>

            <div className={styles.heroDivider} aria-hidden="true">
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo; — Psalm 119:105
            </div>

            <div className={styles.searchWrapper}>
              <SearchBar
                onSubmit={handleAsk}
                isLoading={isLoading}
                placeholder={PLACEHOLDERS[placeholderIdx]}
              />
              {rateLimit && (
                <div className={styles.rateLimitWrapper}>
                  <RateLimitBar rateLimit={rateLimit} />
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── Answer area ───────────────────────────────────── */}
        <div ref={answerRef}>
          {hasContent && (
            <section className={styles.answerSection} aria-label="Study answer" aria-live="polite">
              <div className="container">
                {isLoading && <StreamingProgress completedStages={stages} />}
                {error && !isLoading && (
                  <ErrorState message={error} onRetry={retry} />
                )}
                {answer && status === 'done' && (
                  <DimensionPanel answer={answer} shareSlug={shareSlug ?? undefined} />
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── Features + Teaser — shown when no answer ──────── */}
        {!answer && !isLoading && !error && (
          <>
            <section className={styles.features} aria-label="Features">
              <div className="container">
                <p className={styles.featuresLabel}>What you get with every answer</p>
                <div className={styles.featureGrid}>
                  {[
                    { label: 'Scripture',               desc: 'Direct verse analysis and cross-references in your preferred translation' },
                    { label: 'Historical Context',     desc: 'Cultural, political, and historical background of the time period' },
                    { label: 'Original Language',       desc: 'Hebrew and Greek word meanings, nuance, and translational choices' },
                    { label: 'Theology',                desc: 'Doctrinal implications, denominational perspectives, and creeds' },
                    { label: 'Practical Application',   desc: 'How this truth applies to daily life, decisions, and discipleship' },
                  ].map(({ label, desc }, i) => {
                    const badge = FEATURE_BADGES[label];
                    return (
                      <div
                        key={label}
                        className={styles.featureCard}
                        style={{ animationDelay: `${i * 0.06}s` }}
                      >
                        {badge && (
                          <span
                            className={styles.featureBadge}
                            style={{ color: badge.color, borderColor: badge.color }}
                          >
                            {badge.label}
                          </span>
                        )}
                        <p className={styles.featureLabel}>{label}</p>
                        <p className={styles.featureDesc}>{desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className={styles.teaser} aria-label="Explore BibleDesk features">
              <div className="container">
                <p className={styles.teaserLabel}>Explore BibleDesk</p>
                <div className={styles.teaserGrid}>
                  {TEASER_ITEMS.map(({ label, desc, href }) => (
                    <a key={label} href={href} className={styles.teaserCard}>
                      <p className={styles.teaserCardLabel}>{label}</p>
                      <p className={styles.teaserCardDesc}>{desc}</p>
                      <span className={styles.teaserPill}>Open</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className="container">
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <a href="/about">About</a>
            <a href="https://github.com/ShadowWalkerNC/BibleDesk" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://scripture.api.bible" target="_blank" rel="noopener noreferrer">Bible API</a>
          </nav>
          <p>Built with care for serious Bible study · Powered by <a href="https://scripture.api.bible" target="_blank" rel="noopener noreferrer">API.Bible</a></p>
          <p className={styles.footerSub}>BibleDesk is not affiliated with any denomination or publisher.</p>
        </div>
      </footer>
    </>
  );
}
