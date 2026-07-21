'use client';

import { useState } from 'react';
import Header from '@/components/Header/Header';
import { MEMORY_VERSES, type MemoryVerse } from '@/lib/memoryData';
import styles from './page.module.css';

export default function VerseMemoryPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [practiceMode, setPracticeMode] = useState<'flashcard' | 'hide' | 'firstLetter'>('flashcard');
  const [revealed, setRevealed] = useState(false);
  const [hidePercent, setHidePercent] = useState<25 | 50 | 75 | 100>(50);

  const currentVerse: MemoryVerse = MEMORY_VERSES[currentIndex];

  function handleNext() {
    setCurrentIndex((i) => (i + 1) % MEMORY_VERSES.length);
    setRevealed(false);
  }

  function handlePrev() {
    setCurrentIndex((i) => (i - 1 + MEMORY_VERSES.length) % MEMORY_VERSES.length);
    setRevealed(false);
  }

  // Format text for Word Hide Mode
  function formatHideText(text: string) {
    const words = text.split(' ');
    const step = Math.round(100 / hidePercent);
    return words
      .map((w, idx) => (idx % step === 0 ? '___' : w))
      .join(' ');
  }

  // Format text for First Letter Mode
  function formatFirstLetterText(text: string) {
    const words = text.split(' ');
    return words
      .map((w) => {
        const clean = w.replace(/[^a-zA-Z]/g, '');
        const firstLetter = clean.charAt(0).toUpperCase();
        return firstLetter ? `${firstLetter}${w.slice(clean.length + 1)}` : w;
      })
      .join(' ');
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className="container">

          {/* Header */}
          <div className={styles.pageHeader}>
            <span className={styles.tag}>✦ Scripture Memorization</span>
            <h1 className={`${styles.title} text-serif`}>Verse Memory &amp; Flashcards</h1>
            <p className={styles.subtitle}>
              Hide it in your heart. Practice top memory verses with interactive flashcards, word-hiding, and first-letter prompts.
            </p>
          </div>

          {/* Practice Mode Selector */}
          <div className={styles.modeRow}>
            <button
              className={`${styles.modeBtn} ${practiceMode === 'flashcard' ? styles.activeModeBtn : ''}`}
              onClick={() => { setPracticeMode('flashcard'); setRevealed(false); }}
            >
              🃏 Flashcards
            </button>
            <button
              className={`${styles.modeBtn} ${practiceMode === 'hide' ? styles.activeModeBtn : ''}`}
              onClick={() => { setPracticeMode('hide'); setRevealed(false); }}
            >
              🙈 Hide Words
            </button>
            <button
              className={`${styles.modeBtn} ${practiceMode === 'firstLetter' ? styles.activeModeBtn : ''}`}
              onClick={() => { setPracticeMode('firstLetter'); setRevealed(false); }}
            >
              🔤 First Letter Prompt
            </button>
          </div>

          {/* Main Card */}
          <div className={styles.cardContainer}>
            <div className={`${styles.memoryCard} glass-card`}>
              <div className={styles.cardHeader}>
                <span className={styles.categoryBadge}>{currentVerse.category}</span>
                <span className={styles.verseCounter}>
                  Verse {currentIndex + 1} of {MEMORY_VERSES.length}
                </span>
              </div>

              <h2 className={`${styles.reference} text-serif`}>{currentVerse.reference}</h2>

              {/* Mode 1: Flashcard */}
              {practiceMode === 'flashcard' && (
                <div className={styles.verseBox}>
                  {revealed ? (
                    <p className={`${styles.verseText} text-serif`}>&ldquo;{currentVerse.text}&rdquo;</p>
                  ) : (
                    <div className={styles.hiddenPrompt}>
                      <span>Recite this verse from memory, then click to reveal.</span>
                    </div>
                  )}
                  <button className={styles.revealBtn} onClick={() => setRevealed(!revealed)}>
                    {revealed ? '🙈 Hide Verse' : '👁 Reveal Verse'}
                  </button>
                </div>
              )}

              {/* Mode 2: Hide Words */}
              {practiceMode === 'hide' && (
                <div className={styles.verseBox}>
                  <div className={styles.pctRow}>
                    <span className={styles.pctLabel}>Hide Amount:</span>
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        className={`${styles.pctBtn} ${hidePercent === pct ? styles.activePctBtn : ''}`}
                        onClick={() => setHidePercent(pct as any)}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <p className={`${styles.verseText} text-serif`}>
                    &ldquo;{revealed ? currentVerse.text : formatHideText(currentVerse.text)}&rdquo;
                  </p>

                  <button className={styles.revealBtn} onClick={() => setRevealed(!revealed)}>
                    {revealed ? '🙈 Apply Hide Mask' : '👁 Reveal Full Verse'}
                  </button>
                </div>
              )}

              {/* Mode 3: First Letter */}
              {practiceMode === 'firstLetter' && (
                <div className={styles.verseBox}>
                  <p className={`${styles.firstLetterText} text-serif`}>
                    {revealed ? `"${currentVerse.text}"` : formatFirstLetterText(currentVerse.text)}
                  </p>
                  <button className={styles.revealBtn} onClick={() => setRevealed(!revealed)}>
                    {revealed ? '🔤 Show First Letters Only' : '👁 Reveal Full Verse'}
                  </button>
                </div>
              )}

              {/* Navigation Footer */}
              <div className={styles.cardFooter}>
                <button onClick={handlePrev} className={styles.navBtn}>
                  ◀ Previous
                </button>
                <button onClick={handleNext} className={styles.navBtn}>
                  Next Verse ▶
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
