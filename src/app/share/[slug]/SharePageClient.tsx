'use client';

// BibleDesk — /share/[slug] client component
// Renders the full DimensionPanel for a shared answer.
// Provides a “Ask your own question” CTA back to the homepage.

import Link from 'next/link';
import { useState, useEffect } from 'react';
import DimensionPanel from '@/components/DimensionPanel/DimensionPanel';
import type { BibleAnswer } from '@/types';
import styles from './SharePage.module.css';

interface Props {
  initialAnswer: BibleAnswer | null;
  shareSlug: string;
}

export default function SharePageClient({ initialAnswer, shareSlug }: Props) {
  const [answer, setAnswer] = useState<BibleAnswer | null>(initialAnswer);
  const [checkedCache, setCheckedCache] = useState(false);

  useEffect(() => {
    if (!answer && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('bibledesk_recent_answers');
        if (stored) {
          const cache = JSON.parse(stored);
          if (cache[shareSlug]) {
            setAnswer(cache[shareSlug]);
          }
        }
      } catch (err) {
        console.warn('Could not read cached answer from localStorage:', err);
      }
      setCheckedCache(true);
    } else {
      setCheckedCache(true);
    }
  }, [answer, shareSlug]);

  if (!answer && checkedCache) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.inner}`}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/" className={styles.breadcrumbLink}>← BibleDesk</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Shared study</span>
          </nav>
          <div className={styles.questionWrap} style={{ textAlign: 'center', margin: '4rem 0' }}>
            <h1 className={styles.question} style={{ fontSize: '1.6rem' }}>Study Not Found or Link Expired</h1>
            <p style={{ color: '#8a7e67', marginTop: '1rem' }}>
              This shared answer could not be located on the server. Ask your question directly on BibleDesk to generate a complete 5-dimension study.
            </p>
            <div style={{ marginTop: '2rem' }}>
              <Link href="/" className={styles.ctaBtn}>
                Ask BibleDesk →
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!answer) {
    return (
      <main className={styles.page}>
        <div className={`container ${styles.inner}`} style={{ padding: '6rem 0', textAlign: 'center', color: '#8a7e67' }}>
          Loading shared study…
        </div>
      </main>
    );
  }

  return (
    <>
      <main className={styles.page}>
        <div className={`container ${styles.inner}`}>

          {/* Breadcrumb */}
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/" className={styles.breadcrumbLink}>← BibleDesk</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Shared study</span>
          </nav>

          {/* Question heading */}
          <div className={styles.questionWrap}>
            <span className={styles.questionLabel}>✦ Question</span>
            <h1 className={styles.question}>{answer.question}</h1>
          </div>

          {/* Answer */}
          <DimensionPanel answer={answer} shareSlug={shareSlug} />

          {/* CTA */}
          <div className={styles.cta}>
            <p className={styles.ctaText}>
              Want a deep, sourced answer to your own Bible question?
            </p>
            <Link href="/" className={styles.ctaBtn}>
              Ask BibleDesk →
            </Link>
          </div>

        </div>
      </main>

      <footer className={styles.footer}>
        <div className="container">
          <p>BibleDesk is free. Built with ✦ for churches, pastors, and seekers.</p>
        </div>
      </footer>
    </>
  );
}
