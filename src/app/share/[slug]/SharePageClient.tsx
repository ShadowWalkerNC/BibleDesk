'use client';

// BibleDesk — /share/[slug] client component
// Renders the full DimensionPanel for a shared answer.
// Provides a “Ask your own question” CTA back to the homepage.

import Link from 'next/link';
import Header from '@/components/Header/Header';
import DimensionPanel from '@/components/DimensionPanel/DimensionPanel';
import type { BibleAnswer } from '@/types';
import styles from './SharePage.module.css';

interface Props {
  answer:    BibleAnswer;
  shareSlug: string;
}

export default function SharePageClient({ answer, shareSlug }: Props) {
  return (
    <>
      <Header />
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
