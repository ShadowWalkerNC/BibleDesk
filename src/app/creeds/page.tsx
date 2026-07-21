'use client';

import { useState } from 'react';
import Header from '@/components/Header/Header';
import { CREEDS, type Creed } from '@/lib/creedsData';
import styles from './page.module.css';

export default function CreedsPage() {
  const [activeCreed, setActiveCreed] = useState<Creed>(CREEDS[0]);

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className="container">

          {/* Header */}
          <div className={styles.pageHeader}>
            <span className={styles.tag}>✦ Historical Christian Theology</span>
            <h1 className={`${styles.title} text-serif`}>Creeds &amp; Confessions</h1>
            <p className={styles.subtitle}>
              Foundational statements of Christian faith formulated by the early Church to summarize apostolic doctrine.
            </p>
          </div>

          {/* Selector Tabs */}
          <div className={styles.tabRow} role="tablist" aria-label="Select creed">
            {CREEDS.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={activeCreed.id === c.id}
                className={`${styles.tabBtn} ${activeCreed.id === c.id ? styles.activeTabBtn : ''}`}
                onClick={() => setActiveCreed(c)}
              >
                <span className={styles.tabName}>{c.name}</span>
                <span className={styles.tabYear}>{c.year}</span>
              </button>
            ))}
          </div>

          {/* Creed Display Card */}
          <div className={`${styles.card} glass-card`}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={`${styles.creedName} text-serif`}>{activeCreed.name}</h2>
                <div className={styles.creedMeta}>
                  <span>{activeCreed.year}</span> • <span>{activeCreed.origin}</span>
                </div>
              </div>
            </div>

            <p className={styles.creedSummary}>{activeCreed.summary}</p>

            <div className={styles.sectionsList}>
              {activeCreed.sections.map((sec, idx) => (
                <div key={idx} className={styles.sectionItem}>
                  <h3 className={`${styles.sectionTitle} text-serif`}>{sec.title}</h3>
                  <p className={`${styles.sectionText} text-serif`}>{sec.text}</p>
                  {sec.scriptureRefs.length > 0 && (
                    <div className={styles.refsRow}>
                      <span className={styles.refsLabel}>Scripture Foundations</span>
                      {sec.scriptureRefs.map((ref) => (
                        <a
                          key={ref}
                          href={`/bible?book=${encodeURIComponent(ref.split(' ')[0])}`}
                          className={styles.refBadge}
                        >
                          {ref}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
