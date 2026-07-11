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

const PLACEHOLDER_PROMPTS = [
  'What did Jesus mean by "born again"?',
  'Explain the armor of God in Ephesians 6',
  'Who wrote the book of Hebrews?',
  'What is the significance of the number 7 in Revelation?',
  'How should Christians understand the Sabbath today?',
  'What does it mean to be made in the image of God?',
  'Explain the parable of the prodigal son',
  'What happened at Pentecost?',
];

const STUDY_DESTINATIONS = [
  {
    icon: '📖',
    title: 'Read a Chapter',
    desc: 'Browse any book and chapter in your preferred translation',
    badge: 'READING',
    href: '#',
  },
  {
    icon: '⚖️',
    title: 'Compare Translations',
    desc: 'See KJV, NIV, ESV, and more side by side for any passage',
    badge: 'STUDY',
    href: '#',
  },
  {
    icon: '🔤',
    title: 'Word Study',
    desc: "Dig into original Hebrew and Greek with Strong's concordance",
    badge: 'LANGUAGE',
    href: '#',
  },
  {
    icon: '🌅',
    title: 'Daily Verse',
    desc: 'A curated verse each morning with context and reflection',
    badge: 'DEVOTIONAL',
    href: '#',
  },
];

export default function HomePage() {
  const { status, stages, answer, shareSlug, error, rateLimit, ask, retry } = useStreamingAsk();
  const answerRef = useRef<HTMLDivElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIndex(i => (i + 1) % PLACEHOLDER_PROMPTS.length);
        setPlaceholderVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  function handleAsk(question: string, translation: import('@/types').TranslationId) {
    ask(question, translation);
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
              <div
                className={styles.placeholderHint}
                aria-hidden="true"
                data-visible={placeholderVisible}
              >
                {PLACEHOLDER_PROMPTS[placeholderIndex]}
              </div>
              <SearchBar onSubmit={handleAsk} isLoading={isLoading} />
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

        {/* ── Features + Destinations — shown when no answer ── */}
        {!answer && !isLoading && !error && (
          <>
            <section className={styles.features} aria-label="Features">
              <div className="container">
                <p className={styles.featuresLabel}>What you get with every answer</p>
                <div className={styles.featureGrid}>
                  {[
                    { emoji: '📖', label: 'Scripture',             badge: 'STUDY',    desc: 'Direct verse analysis and cross-references in your preferred translation' },
                    { emoji: '🏛️', label: 'Historical Context',   badge: 'HISTORY',  desc: 'Cultural, political, and historical background of the time period' },
                    { emoji: '🔤', label: 'Original Language',     badge: 'LANGUAGE', desc: 'Hebrew and Greek word meanings, nuance, and translation insights' },
                    { emoji: '✝️', label: 'Theological Meaning',   badge: 'THEOLOGY', desc: 'What scholars and traditions have taught across church history' },
                    { emoji: '🌱', label: 'Practical Application', badge: 'LIFE',     desc: 'Concrete ways to apply these truths to daily life, family, and faith' },
                    { emoji: '🔗', label: 'Discord Integration',   badge: 'CHURCH',   desc: 'Connected to Sigil — prayer requests and sermons go right to your server' },
                  ].map((f, i) => (
                    <div key={i} className={styles.featureCard} style={{ animationDelay: `${i * 0.07}s` }}>
                      <span className={styles.featureBadge}>{f.badge}</span>
                      <span className={styles.featureEmoji} aria-hidden="true">{f.emoji}</span>
                      <h3 className={styles.featureLabel}>{f.label}</h3>
                      <p className={styles.featureDesc}>{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.destinations} aria-label="Study tools">
              <div className="container">
                <p className={styles.featuresLabel}>Open a Bible</p>
                <div className={styles.destinationGrid}>
                  {STUDY_DESTINATIONS.map((d, i) => (
                    <a
                      key={i}
                      href={d.href}
                      className={styles.destinationCard}
                      style={{ animationDelay: `${i * 0.08}s` }}
                      aria-label={d.title}
                    >
                      <div className={styles.destIconWrap}>
                        <span className={styles.destIcon} aria-hidden="true">{d.icon}</span>
                      </div>
                      <div className={styles.destBody}>
                        <span className={styles.destBadge}>{d.badge}</span>
                        <h3 className={styles.destTitle}>{d.title}</h3>
                        <p className={styles.destDesc}>{d.desc}</p>
                      </div>
                      <span className={styles.destArrow} aria-hidden="true">→</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

      </main>

      <footer className={styles.footer}>
        <div className="container">
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <a href="#">About</a>
            <span aria-hidden="true">·</span>
            <a href="https://github.com/ShadowWalkerNC/BibleDesk" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span aria-hidden="true">·</span>
            <a href="#">Discord</a>
            <span aria-hidden="true">·</span>
            <a href="https://bible-api.com" target="_blank" rel="noopener noreferrer">Bible API</a>
          </nav>
          <p>
            BibleDesk is free. Built with ✦ for churches, pastors, and seekers.
          </p>
          <p className={styles.footerSub}>
            Scripture via{' '}
            <a href="https://bible-api.com" target="_blank" rel="noopener noreferrer">bible-api.com</a>
            {' '}· AI by Anthropic Claude · Powered by Supabase
          </p>
        </div>
      </footer>
    </>
  );
}
