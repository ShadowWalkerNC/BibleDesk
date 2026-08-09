'use client';

import Link from 'next/link';
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

const STUDY_TOOLS = [
  { label: 'Bible Reader',     desc: 'Chapter reading, compare mode, notes & highlights', href: '/bible' },
  { label: 'Reading Plans',    desc: '30- and 90-day schedules with progress tracking',   href: '/plans' },
  { label: 'Daily Verse',      desc: 'A daily passage with reflection prompts',           href: '/daily' },
  { label: 'Verse Memory',     desc: 'Flashcards and word-masking drills',                href: '/memory' },
  { label: 'Catechism',        desc: 'Westminster & Heidelberg Q&A with quiz mode',      href: '/catechism' },
  { label: 'Historic Creeds',  desc: 'Apostles’, Nicene, Chalcedonian & Athanasian',     href: '/creeds' },
];

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

        {/* ── Hero: Bible-first ─────────────────────────────── */}
        <section className={styles.hero} aria-label="BibleDesk hero">
          <div className={`container ${styles.heroInner}`}>

            <p className={styles.brandMark} aria-label="BibleDesk">
              Bible<span>Desk</span>
            </p>

            <h1 className={styles.heroTitle}>
              Read Scripture.{' '}
              <span className="text-gradient">Study deeply.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              A Bible-first study desk — read, search, and take notes.
              AI helps when you want it, without replacing the text.
            </p>

            <div className={styles.heroCtas}>
              <Link href="/bible" className={styles.ctaPrimary}>
                Open Bible Reader
              </Link>
              <a href="#assistant" className={styles.ctaSecondary}>
                Ask the assistant
              </a>
            </div>

            <p className={styles.heroDivider}>
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo; — Psalm 119:105
            </p>

          </div>
        </section>

        {/* ── Study tools ───────────────────────────────────── */}
        {!answer && !isLoading && !error && (
          <section className={styles.teaser} aria-label="Study tools">
            <div className="container">
              <p className={styles.teaserLabel}>Study tools</p>
              <div className={styles.teaserGrid}>
                {STUDY_TOOLS.map(({ label, desc, href }) => (
                  <Link key={label} href={href} className={styles.teaserCard}>
                    <p className={styles.teaserCardLabel}>{label}</p>
                    <p className={styles.teaserCardDesc}>{desc}</p>
                    <span className={styles.teaserPill}>Open</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Assistant ─────────────────────────────────────── */}
        <section id="assistant" className={styles.assistant} aria-label="AI study assistant">
          <div className={`container ${styles.assistantInner}`}>
            <p className={styles.teaserLabel}>Optional assistant</p>
            <h2 className={styles.assistantTitle}>
              Five dimensions when you have a question
            </h2>
            <p className={styles.assistantSubtitle}>
              Scripture, history, original language, theology, and practical application —
              grounded in cited verses. Rate-limited. Not a replacement for reading.
            </p>

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

      </main>

      <footer className={styles.footer}>
        <div className="container">
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <Link href="/bible">Bible</Link>
            <Link href="/plans">Plans</Link>
            <a href="https://github.com/ShadowWalkerNC/BibleDesk" target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
          <p>Built for serious Bible study · Public-domain texts via bible-api.com (local modules coming)</p>
          <p className={styles.footerSub}>BibleDesk is not affiliated with any denomination or publisher.</p>
        </div>
      </footer>
    </>
  );
}
