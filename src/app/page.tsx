'use client';

import { useState, useRef } from 'react';
import Header from '@/components/Header/Header';
import SearchBar from '@/components/SearchBar/SearchBar';
import DimensionPanel from '@/components/DimensionPanel/DimensionPanel';
import { LoadingSkeleton, ErrorState } from '@/components/LoadingState/LoadingState';
import type { BibleAnswer, TranslationId, ApiResponse } from '@/types';
import styles from './page.module.css';

export default function HomePage() {
  const [answer, setAnswer] = useState<BibleAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState('');
  const [lastTranslation, setLastTranslation] = useState<TranslationId>('web');
  const answerRef = useRef<HTMLDivElement>(null);

  async function handleAsk(question: string, translation: TranslationId) {
    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setLastQuestion(question);
    setLastTranslation(translation);

    // Scroll toward result area smoothly
    setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, translation }),
      });

      const data: ApiResponse = await res.json();

      if (!data.success) {
        setError(data.error);
        return;
      }

      setAnswer(data.answer);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleRetry() {
    if (lastQuestion) handleAsk(lastQuestion, lastTranslation);
  }

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero */}
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

            <div className={styles.searchWrapper}>
              <SearchBar onSubmit={handleAsk} isLoading={isLoading} />
            </div>
          </div>
        </section>

        {/* Answer area */}
        <div ref={answerRef}>
          {(isLoading || answer || error) && (
            <section className={styles.answerSection} aria-label="Study answer" aria-live="polite">
              <div className="container">
                {isLoading && <LoadingSkeleton />}
                {error && !isLoading && (
                  <ErrorState message={error} onRetry={handleRetry} />
                )}
                {answer && !isLoading && (
                  <DimensionPanel answer={answer} />
                )}
              </div>
            </section>
          )}
        </div>

        {/* Features — shown when no answer */}
        {!answer && !isLoading && !error && (
          <section className={styles.features} aria-label="Features">
            <div className="container">
              <div className={styles.featureGrid}>
                {[
                  { emoji: '📖', label: 'Scripture', desc: 'Direct verse analysis and cross-references in your preferred translation' },
                  { emoji: '🏛️', label: 'Historical Context', desc: 'Cultural, political, and historical background of the time period' },
                  { emoji: '🔤', label: 'Original Language', desc: 'Hebrew and Greek word meanings, nuance, and translation insights' },
                  { emoji: '✝️', label: 'Theological Meaning', desc: 'What scholars and traditions have taught across church history' },
                  { emoji: '🌱', label: 'Practical Application', desc: 'Concrete ways to apply these truths to daily life, family, and faith' },
                  { emoji: '🔗', label: 'Discord Integration', desc: 'Connected to Sigil — prayer requests and sermons go right to your server' },
                ].map((f, i) => (
                  <div key={i} className={styles.featureCard} style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className={styles.featureEmoji} aria-hidden="true">{f.emoji}</div>
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
