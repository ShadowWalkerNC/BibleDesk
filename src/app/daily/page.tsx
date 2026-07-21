'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header/Header';
import type { DailyVerse } from '@/app/api/daily/route';
import styles from './page.module.css';

export default function DailyVersePage() {
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(1);

  async function fetchDaily(url = '/api/daily') {
    setLoading(true);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setDailyVerse(data.dailyVerse);
        if (data.currentIndex !== undefined) setCurrentIndex(data.currentIndex);
        if (data.totalCount !== undefined) setTotalCount(data.totalCount);
      }
    } catch (err) {
      console.error('Failed to fetch daily verse:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDaily();
  }, []);

  function handleCopy() {
    if (!dailyVerse) return;
    const text = `"${dailyVerse.text}" — ${dailyVerse.reference} (${dailyVerse.translation})\n\nReflection: ${dailyVerse.reflection}\n\nVia BibleDesk Daily Verse`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleNext() {
    const nextIdx = (currentIndex + 1) % totalCount;
    fetchDaily(`/api/daily?index=${nextIdx}`);
  }

  function handleRandom() {
    fetchDaily('/api/daily?random=true');
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className="container">
          <div className={styles.pageHeader}>
            <span className={styles.todayBadge}>✦ Daily Devotional</span>
            <h1 className={`${styles.title} text-serif`}>Daily Scripture &amp; Reflection</h1>
            <p className={styles.subtitle}>
              Start your day grounded in God’s Word with curated scripture, commentary, and prayer.
            </p>
            <div className={styles.navBar}>
              <button onClick={handleNext} className={styles.navBtn}>
                ⏭ Next Devotional
              </button>
              <button onClick={handleRandom} className={styles.navBtn}>
                🎲 Shuffle Random
              </button>
            </div>
          </div>

          {loading ? (
            <div className={`${styles.card} glass-card`}>
              <div className="skeleton" style={{ height: '28px', width: '150px', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: '80px', width: '100%', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: '20px', width: '200px' }} />
            </div>
          ) : dailyVerse ? (
            <div className={`${styles.card} glass-card`}>
              <div className={styles.cardHeader}>
                <span className={styles.date}>{dailyVerse.date}</span>
                <span className={styles.themeTag}>{dailyVerse.theme}</span>
              </div>

              <blockquote className={`${styles.verseText} text-serif`}>
                &ldquo;{dailyVerse.text}&rdquo;
              </blockquote>

              <div className={styles.reference}>
                — {dailyVerse.reference} <span className={styles.transTag}>({dailyVerse.translation})</span>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>✦ Morning Reflection</h3>
                <p className={styles.sectionBody}>{dailyVerse.reflection}</p>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>🙏 Daily Prayer</h3>
                <p className={`${styles.sectionBody} text-serif`}>&ldquo;{dailyVerse.prayer}&rdquo;</p>
              </div>

              <div className={styles.cardFooter}>
                <button onClick={handleCopy} className={styles.copyBtn}>
                  {copied ? '✓ Copied to Clipboard' : '📋 Share Daily Verse'}
                </button>
                <a
                  href={`/bible?book=${encodeURIComponent(dailyVerse.reference.split(' ')[0])}`}
                  className={styles.readMoreLink}
                >
                  📖 Open in Bible Reader →
                </a>
              </div>
            </div>
          ) : (
            <div className={styles.error}>Could not load daily verse.</div>
          )}
        </div>
      </main>
    </>
  );
}
