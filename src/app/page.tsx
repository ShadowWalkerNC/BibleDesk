'use client';

import { useRef } from 'react';
import Header from '@/components/Header/Header';
import SearchBar from '@/components/SearchBar/SearchBar';
import DimensionPanel from '@/components/DimensionPanel/DimensionPanel';
import StreamingProgress from '@/components/StreamingProgress/StreamingProgress';
import RateLimitBar from '@/components/RateLimitBar/RateLimitBar';
import { ErrorState } from '@/components/LoadingState/LoadingState';
import { useStreamingAsk } from '@/hooks/useStreamingAsk';
import styles from './page.module.css';

export default function HomePage() {
  const { status, stages, answer, shareSlug, error, rateLimit, ask, retry } = useStreamingAsk();
  const answerRef = useRef<HTMLDivElement>(null);

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

        {/* ── Features — shown when no answer ───────────────── */}
        {!answer && !isLoading && !error && (
          <section className={styles.features} aria-label="Features">
            <div className="container">
              <p className={styles.featuresLabel}>What you get with every answer</p>
              <div className={styles.featureGrid}>
                {[
                  { emoji: '📖', label: 'Scripture',             desc: 'Direct verse analysis and cross-references in your preferred translation' },
                  { emoji: '🏛️', label: 'Historical Context',   desc: 'Cultural, political, and historical background of the time period' },
                  { emoji: '🔤', label: 'Original Language',     desc: 'Hebrew and Greek word meanings, nuance, and translation insights' },
                  { emoji: '✝️', label: 'Theological Meaning',   desc: 'What scholars and traditions have taught across church history' },
                  { emoji: '🌱', label: 'Practical Application', desc: 'Concrete ways to apply these truths to daily life, family, and faith' },
                  { emoji: '🔗', label: 'Discord Integration',   desc: 'Connected to Sigil — prayer requests and sermons go right to your server' },
                ].map((f, i) => (
                  <div key={i} className={styles.featureCard} style={{ animationDelay: `${i * 0.07}s` }}>
                    <span className={styles.featureEmoji} aria-hidden="true">{f.emoji}</span>
                    <h3 className={styles.featureLabel}>{f.label}</h3>
                    <p className={styles.featureDesc}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      <footer className={styles.footer}>
        <div className="container">
          <p>
            BibleDesk is free. Built with ✦ for churches, pastors, and seekers.{' '}
            <a href="https://github.com/ShadowWalkerNC/BibleDesk" target="_blank" rel="noopener noreferrer">
              Open source on GitHub
            </a>
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
