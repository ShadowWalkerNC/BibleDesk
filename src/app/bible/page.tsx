'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Header from '@/components/Header/Header';
import { BIBLE_BOOKS, getBookChapters, getNextChapter, getPrevChapter } from '@/lib/books';
import { TRANSLATIONS, type TranslationId, type BibleVerse, type BiblePassage } from '@/types';
import styles from './page.module.css';

interface OriginalWordStudy {
  word: string;
  originalWord: string;
  strongsNumber: string;
  pronunciation: string;
  definition: string;
}

interface CrossReference {
  reference: string;
  text: string;
  connectionReason: string;
}

interface AIStudyData {
  reference: string;
  translation: string;
  selectedWordStudy?: OriginalWordStudy | null;
  originalLanguageWords: OriginalWordStudy[];
  commentary: string;
  crossReferences: CrossReference[];
  practicalApplication: string;
}

export default function BibleReaderPage() {
  // Navigation states
  const [selectedBook, setSelectedBook] = useState('John');
  const [selectedChapter, setSelectedChapter] = useState(3);
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationId>('web');
  const [parallelMode, setParallelMode] = useState(false);
  const [translationB, setTranslationB] = useState<TranslationId>('kjv');

  // Content states
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [versesB, setVersesB] = useState<BibleVerse[]>([]);
  const [loadingChapter, setLoadingChapter] = useState(true);
  const [chapterError, setChapterError] = useState<string | null>(null);

  // AI Study states
  const [selectedVerse, setSelectedVerse] = useState<BibleVerse | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'study' | 'compare' | 'references' | 'notes' | 'search'>('search');
  const [studyData, setStudyData] = useState<AIStudyData | null>(null);
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [studyError, setStudyError] = useState<string | null>(null);

  // e-Sword parity states
  const [showInlineStrongs, setShowInlineStrongs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [pendingVerseTarget, setPendingVerseTarget] = useState<number | null>(null);

  // Translation comparison state
  const [comparedVerses, setComparedVerses] = useState<Array<{ translation: string; text: string }>>([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Personal notes state
  const [notes, setNotes] = useState('');

  // Highlights state (localStorage)
  const [highlights, setHighlights] = useState<Record<string, string>>({});

  // Web Speech TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingVerse, setSpeakingVerse] = useState<number | null>(null);

  // UI state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Load verse highlights from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bibledesk_verse_highlights');
      if (saved) setHighlights(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load highlights from localStorage', e);
    }
  }, []);

  const handleSetHighlight = (vKey: string, color: string | null) => {
    setHighlights((prev) => {
      const next = { ...prev };
      if (!color) {
        delete next[vKey];
      } else {
        next[vKey] = color;
      }
      try {
        localStorage.setItem('bibledesk_verse_highlights', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save highlight to localStorage', e);
      }
      return next;
    });
  };

  const handlePlayChapterAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setToast({ message: 'Text-to-Speech is not supported in this browser.', type: 'error' });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingVerse(null);
      return;
    }

    if (!verses.length) return;

    const fullText = verses.map((v) => `${v.verse}. ${v.text}`).join(' ');
    const utterance = new SpeechSynthesisUtterance(`${selectedBook} chapter ${selectedChapter}. ${fullText}`);
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingVerse(null);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingVerse(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlaySingleVerseAudio = (v: BibleVerse) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setToast({ message: 'Text-to-Speech is not supported in this browser.', type: 'error' });
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${v.book_name} ${v.chapter} verse ${v.verse}. ${v.text}`);
    utterance.rate = 0.95;
    setSpeakingVerse(v.verse);

    utterance.onend = () => setSpeakingVerse(null);
    utterance.onerror = () => setSpeakingVerse(null);

    window.speechSynthesis.speak(utterance);
  };

  // 1. Fetch Chapter Verses (support parallel loading)
  useEffect(() => {
    let active = true;
    async function fetchChapter() {
      setLoadingChapter(true);
      setChapterError(null);
      try {
        const urlA = `/api/bible/chapter?book=${encodeURIComponent(selectedBook)}&chapter=${selectedChapter}&translation=${selectedTranslation}`;
        const urlB = `/api/bible/chapter?book=${encodeURIComponent(selectedBook)}&chapter=${selectedChapter}&translation=${translationB}`;

        const promises = [fetch(urlA)];
        if (parallelMode) {
          promises.push(fetch(urlB));
        }

        const responses = await Promise.all(promises);
        const dataA = await responses[0].json();
        const dataB = responses[1] ? await responses[1].json() : null;

        if (!active) return;

        if (!responses[0].ok || !dataA.success) {
          setChapterError(dataA.error || 'Failed to load chapter.');
          setVerses([]);
          setVersesB([]);
        } else {
          setVerses(dataA.passage.verses);
          if (dataB && dataB.success) {
            setVersesB(dataB.passage.verses);
          } else {
            setVersesB([]);
          }

          // Auto select target or first verse
          if (dataA.passage.verses.length > 0) {
            const targetVerse = pendingVerseTarget
              ? dataA.passage.verses.find((x: BibleVerse) => x.verse === pendingVerseTarget) || dataA.passage.verses[0]
              : dataA.passage.verses[0];
            setSelectedVerse(targetVerse);
            setSelectedWord(null);
            setPendingVerseTarget(null); // Reset after select

            // Scroll to the targeted verse if page loaded in dynamic search context
            if (pendingVerseTarget) {
              setTimeout(() => {
                const element = document.getElementById(`verse-${pendingVerseTarget}`);
                if (element && readerScrollRef.current) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 150);
            }
          }
        }
      } catch (err) {
        if (active) {
          setChapterError('Connection error. Could not fetch chapter data.');
        }
      } finally {
        if (active) setLoadingChapter(false);
      }
    }

    fetchChapter();
    return () => {
      active = false;
    };
  }, [selectedBook, selectedChapter, selectedTranslation, translationB, parallelMode]);

  // 2. Fetch AI Study Data when selectedVerse or selectedWord changes
  useEffect(() => {
    if (!selectedVerse) return;
    const verse = selectedVerse;

    let active = true;
    async function fetchStudy() {
      setLoadingStudy(true);
      setStudyError(null);
      try {
        const res = await fetch('/api/bible/study', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
            verseText: verse.text,
            translation: selectedTranslation,
            selectedWord: selectedWord || undefined,
          }),
        });
        const data = await res.json();

        if (!active) return;

        if (!res.ok || !data.success) {
          setStudyError(data.error || 'Failed to generate AI study guide.');
          setStudyData(null);
        } else {
          setStudyData(data.study);
        }
      } catch (err) {
        if (active) {
          setStudyError('Network error. Failed to load AI companion analysis.');
        }
      } finally {
        if (active) setLoadingStudy(false);
      }
    }

    fetchStudy();
    return () => {
      active = false;
    };
  }, [selectedVerse, selectedWord, selectedTranslation]);

  // 3. Fetch Comparison Translations
  useEffect(() => {
    if (!selectedVerse || activeTab !== 'compare') return;
    const verse = selectedVerse;

    let active = true;
    async function fetchComparison() {
      setLoadingCompare(true);
      try {
        const ref = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
        const promises = TRANSLATIONS.map(async (t) => {
          const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=${t.id}`);
          if (!res.ok) return { translation: t.name, text: 'Unavailable' };
          const data = await res.json();
          return {
            translation: t.name,
            text: data.text?.trim() || 'Verse not found in this translation.',
          };
        });

        const results = await Promise.all(promises);
        if (active) {
          setComparedVerses(results);
        }
      } catch (err) {
        if (active) {
          showToast('Failed to load other translations.', 'error');
        }
      } finally {
        if (active) setLoadingCompare(false);
      }
    }

    fetchComparison();
    return () => {
      active = false;
    };
  }, [selectedVerse, activeTab]);

  // 4. Load Personal Notes from LocalStorage
  useEffect(() => {
    if (!selectedVerse) return;
    const key = `biblenote:${selectedVerse.book_name}:${selectedVerse.chapter}:${selectedVerse.verse}`;
    const savedNote = localStorage.getItem(key) || '';
    setNotes(savedNote);
  }, [selectedVerse]);

  // 5. Save Note Helper
  const handleSaveNote = (val: string) => {
    if (!selectedVerse) return;
    setNotes(val);
    const key = `biblenote:${selectedVerse.book_name}:${selectedVerse.chapter}:${selectedVerse.verse}`;
    if (val.trim()) {
      localStorage.setItem(key, val);
    } else {
      localStorage.removeItem(key);
    }
  };

  // Toast helper
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Copy verse helper
  const handleCopyVerse = (v: BibleVerse) => {
    const formatted = `"${v.text.trim()}" — ${v.book_name} ${v.chapter}:${v.verse} (${selectedTranslation.toUpperCase()})`;
    navigator.clipboard.writeText(formatted)
      .then(() => showToast('Verse copied to clipboard!'))
      .catch(() => showToast('Failed to copy text.', 'error'));
  };

  // Chapter navigation handlers
  const handleNext = () => {
    const next = getNextChapter(selectedBook, selectedChapter);
    if (next) {
      startTransition(() => {
        setSelectedBook(next.book);
        setSelectedChapter(next.chapter);
        if (readerScrollRef.current) {
          readerScrollRef.current.scrollTop = 0;
        }
      });
    } else {
      showToast('You are at the end of the Bible.');
    }
  };

  const handlePrev = () => {
    const prev = getPrevChapter(selectedBook, selectedChapter);
    if (prev) {
      startTransition(() => {
        setSelectedBook(prev.book);
        setSelectedChapter(prev.chapter);
        if (readerScrollRef.current) {
          readerScrollRef.current.scrollTop = 0;
        }
      });
    } else {
      showToast('You are at the beginning of the Bible.');
    }
  };

  // Concordance Search Handlers
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/bible/search?query=${encodeURIComponent(searchQuery)}&translation=${selectedTranslation}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results);
        setSearchTotal(data.total);
      } else {
        setSearchError(data.error || 'Search query failed.');
        setSearchResults([]);
        setSearchTotal(0);
      }
    } catch (err) {
      setSearchError('Search request timed out or failed.');
      setSearchResults([]);
      setSearchTotal(0);
    } finally {
      setSearching(false);
    }
  };

  const handleNavigateFromSearch = (res: any) => {
    setPendingVerseTarget(res.verse);
    startTransition(() => {
      setSelectedBook(res.book);
      setSelectedChapter(res.chapter);
      setSelectedWord(null);
      // Auto switch to study tab when navigating to target verse
      setActiveTab('study');
    });
  };

  // Jump to cross reference handler
  const handleJumpToReference = (refStr: string) => {
    // Parse reference string like "Romans 5:8" or "1 John 3:16" or "Matthew 1:1"
    const match = refStr.match(/^((?:\d\s+)?[A-Za-z\s]+?)\s+(\d+):(\d+)/);
    if (match) {
      const bookName = match[1].trim();
      const chapterNum = parseInt(match[2], 10);
      const verseNum = parseInt(match[3], 10);

      // Verify book exists
      const bookExists = BIBLE_BOOKS.some(b => b.name.toLowerCase() === bookName.toLowerCase());
      if (bookExists) {
        startTransition(() => {
          setSelectedBook(bookName);
          setSelectedChapter(chapterNum);
          setActiveTab('study');
          setSelectedWord(null);
          // Temporary listener to highlight the target verse after it loads
          const selectVerseAfterLoad = (e: Event) => {
            document.removeEventListener('bibledesk:chapter-loaded', selectVerseAfterLoad);
          };
          document.addEventListener('bibledesk:chapter-loaded', selectVerseAfterLoad);
        });
      } else {
        showToast(`Could not navigate to "${refStr}"`, 'error');
      }
    }
  };

  // Clean words helper (splits sentence and strips punctuation)
  const renderInteractiveVerseText = (v: BibleVerse) => {
    const words = v.text.trim().split(/\s+/);
    return words.map((w, idx) => {
      // Strip punctuation to find the clean word base for analysis
      const cleanWord = w.replace(/[^\w\s\']/g, '').trim();
      const isSelected = selectedVerse?.verse === v.verse && selectedWord?.toLowerCase() === cleanWord.toLowerCase();

      // e-Sword matching: check if this word matches an entry in our loaded AI concordance dictionary for this verse
      const isSameVerse = selectedVerse?.verse === v.verse;
      const wordMatch = showInlineStrongs && isSameVerse && studyData?.originalLanguageWords?.find(
        (olw) => olw.word.toLowerCase() === cleanWord.toLowerCase()
      );

      return (
        <span key={idx} className={styles.wordWrapper}>
          <span
            className={`${styles.interactiveWord} ${isSelected ? styles.selectedWord : ''}`}
            onClick={(e) => {
              e.stopPropagation(); // Stop selecting the row
              setSelectedVerse(v);
              setSelectedWord(cleanWord);
              setActiveTab('study');
            }}
          >
            {w}
          </span>
          {wordMatch && (
            <sup
              className={`${styles.inlineStrongsBadge} ${isSelected ? styles.activeInlineStrongs : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedVerse(v);
                setSelectedWord(cleanWord);
                setActiveTab('study');
              }}
              title={`${wordMatch.originalWord} - Pronunciation: ${wordMatch.pronunciation} | Click to study`}
            >
              {wordMatch.strongsNumber}
            </sup>
          )}
          {' '}
        </span>
      );
    });
  };

  // Trigger custom event once chapter finishes loading
  useEffect(() => {
    if (!loadingChapter && verses.length > 0) {
      document.dispatchEvent(new CustomEvent('bibledesk:chapter-loaded'));
    }
  }, [loadingChapter, verses]);

  const maxChapters = getBookChapters(selectedBook);

  return (
    <>
      <Header />
      
      {/* Toast Alert */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`} role="alert">
          {toast.message}
        </div>
      )}

      <main className={styles.mainContainer}>
        {/* Navigation Selector Bar */}
        <div className={`${styles.selectorBar} glass-card`}>
          <div className={styles.selectors}>
            <div className={styles.selectGroup}>
              <label htmlFor="book-select" className={styles.selectLabel}>Book</label>
              <select
                id="book-select"
                value={selectedBook}
                onChange={(e) => {
                  setSelectedBook(e.target.value);
                  setSelectedChapter(1);
                }}
                className={styles.select}
              >
                {BIBLE_BOOKS.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.selectGroup}>
              <label htmlFor="chapter-select" className={styles.selectLabel}>Chapter</label>
              <select
                id="chapter-select"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(Number(e.target.value))}
                className={styles.select}
              >
                {Array.from({ length: maxChapters }, (_, i) => i + 1).map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            <div className={styles.selectGroup}>
              <label htmlFor="translation-select" className={styles.selectLabel}>Translation</label>
              <select
                id="translation-select"
                value={selectedTranslation}
                onChange={(e) => setSelectedTranslation(e.target.value as TranslationId)}
                className={styles.select}
              >
                {TRANSLATIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.id.toUpperCase()} - {t.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="parallel-toggle"
                checked={parallelMode}
                onChange={(e) => setParallelMode(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="parallel-toggle" className={styles.checkboxLabel}>Parallel View</label>
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="strongs-toggle"
                checked={showInlineStrongs}
                onChange={(e) => setShowInlineStrongs(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="strongs-toggle" className={styles.checkboxLabel}>Inline Strong&apos;s</label>
            </div>

            {parallelMode && (
              <div className={styles.selectGroup}>
                <label htmlFor="translation-b-select" className={styles.selectLabel}>Translation B</label>
                <select
                  id="translation-b-select"
                  value={translationB}
                  onChange={(e) => setTranslationB(e.target.value as TranslationId)}
                  className={styles.select}
                >
                  {TRANSLATIONS.map((t) => (
                    <option key={t.id} value={t.id}>{t.id.toUpperCase()} - {t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className={styles.navButtons}>
            <button onClick={handlePrev} className={styles.navBtn} aria-label="Previous Chapter">
              ◀ Prev
            </button>
            <button onClick={handleNext} className={styles.navBtn} aria-label="Next Chapter">
              Next ▶
            </button>
          </div>
        </div>

        {/* Reader Layout Split Grid */}
        <div className={styles.splitGrid}>
          
          {/* Left Column: Bible Text Reader */}
          <div className={`${styles.textPanel} glass-card`} ref={readerScrollRef}>
            {loadingChapter ? (
              <div className={styles.loadingWrapper}>
                <div className="skeleton" style={{ height: '30px', width: '200px', marginBottom: '20px' }} />
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '20px', width: '100%', marginBottom: '12px' }} />
                ))}
              </div>
            ) : chapterError ? (
              <div className={styles.errorBox}>
                <p>⚠️ {chapterError}</p>
                <button onClick={() => window.location.reload()} className={styles.retryBtn}>Retry</button>
              </div>
            ) : (
              <div className={styles.versesList}>
                <div className={styles.headerAudioControls}>
                  <h1 className={`${styles.chapterHeader} text-serif`}>
                    {selectedBook} {selectedChapter}
                  </h1>
                  <button
                    onClick={handlePlayChapterAudio}
                    className={`${styles.audioBtn} ${isSpeaking ? styles.audioBtnActive : ''}`}
                    title="Listen to full chapter using Text-to-Speech"
                  >
                    {isSpeaking ? '⏹ Stop Audio' : '🔊 Listen Chapter'}
                  </button>
                </div>
                <div className={styles.versesWrapper}>
                  {parallelMode && (
                    <div className={styles.parallelHeaderRow}>
                      <div className={styles.parallelHeader}>{selectedTranslation.toUpperCase()}</div>
                      <div className={styles.parallelHeader}>{translationB.toUpperCase()}</div>
                    </div>
                  )}
                  {verses.map((v) => {
                    const vKey = `${selectedBook}-${selectedChapter}-${v.verse}`;
                    const hlColor = highlights[vKey];
                    const hlClass = hlColor === 'yellow' ? styles.highlightYellow :
                                    hlColor === 'green'  ? styles.highlightGreen :
                                    hlColor === 'blue'   ? styles.highlightBlue :
                                    hlColor === 'red'    ? styles.highlightRed : '';
                    const isSelected = selectedVerse?.verse === v.verse;
                    const vB = parallelMode ? versesB.find((x) => x.verse === v.verse) : null;
                    return (
                      <div
                        key={v.verse}
                        id={`verse-${v.verse}`}
                        className={`${styles.verseRow} ${isSelected ? styles.activeVerseRow : ''} ${hlClass} ${parallelMode ? styles.parallelVerseRow : ''}`}
                        onClick={() => {
                          setSelectedVerse(v);
                          setSelectedWord(null);
                        }}
                      >
                        <span className={styles.verseNumber}>{v.verse}</span>
                        {parallelMode ? (
                          <div className={styles.parallelColumns}>
                            <div className={`${styles.verseText} text-serif`}>
                              {renderInteractiveVerseText(v)}
                            </div>
                            <div className={`${styles.verseText} text-serif`}>
                              {vB ? renderInteractiveVerseText(vB) : <span className={styles.missingVerse}>—</span>}
                            </div>
                          </div>
                        ) : (
                          <p className={`${styles.verseText} text-serif`}>
                            {renderInteractiveVerseText(v)}
                          </p>
                        )}
                        
                        {/* Hover Quick Actions */}
                        <div className={styles.rowActions}>
                          <div className={styles.colorPicker} onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`${styles.colorDot} ${styles.colorDotYellow}`}
                              title="Highlight Yellow"
                              onClick={() => handleSetHighlight(vKey, 'yellow')}
                            />
                            <span
                              className={`${styles.colorDot} ${styles.colorDotGreen}`}
                              title="Highlight Green"
                              onClick={() => handleSetHighlight(vKey, 'green')}
                            />
                            <span
                              className={`${styles.colorDot} ${styles.colorDotBlue}`}
                              title="Highlight Blue"
                              onClick={() => handleSetHighlight(vKey, 'blue')}
                            />
                            <span
                              className={`${styles.colorDot} ${styles.colorDotRed}`}
                              title="Highlight Red"
                              onClick={() => handleSetHighlight(vKey, 'red')}
                            />
                            {hlColor && (
                              <span
                                className={`${styles.colorDot} ${styles.colorDotClear}`}
                                title="Clear Highlight"
                                onClick={() => handleSetHighlight(vKey, null)}
                              />
                            )}
                          </div>
                          <button
                            title="Listen to verse audio"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySingleVerseAudio(v);
                            }}
                            className={styles.actionBtn}
                          >
                            🔊 Listen
                          </button>
                          <button
                            title="Perform AI Study on this verse"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVerse(v);
                              setSelectedWord(null);
                              setActiveTab('study');
                            }}
                            className={styles.actionBtn}
                          >
                            ✦ Study
                          </button>
                          <button
                            title="Compare translations side-by-side"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVerse(v);
                              setSelectedWord(null);
                              setActiveTab('compare');
                            }}
                            className={styles.actionBtn}
                          >
                            ⚖️ Compare
                          </button>
                          <button
                            title="Copy verse reference"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyVerse(v);
                            }}
                            className={styles.actionBtn}
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Study & Tools Panel */}
          <div className={`${styles.studyPanel} glass-card`}>
            <div className={styles.toolboxWrapper}>
              
              {/* Tabs bar */}
              <div className={styles.tabsHeader} role="tablist">
                <button
                  role="tab"
                  aria-selected={activeTab === 'search'}
                  aria-controls="search-tab"
                  className={`${styles.tabLink} ${activeTab === 'search' ? styles.activeTabLink : ''}`}
                  onClick={() => setActiveTab('search')}
                >
                  Search
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'study'}
                  aria-controls="study-tab"
                  className={`${styles.tabLink} ${activeTab === 'study' ? styles.activeTabLink : ''}`}
                  onClick={() => setActiveTab('study')}
                >
                  AI Study
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'compare'}
                  aria-controls="compare-tab"
                  className={`${styles.tabLink} ${activeTab === 'compare' ? styles.activeTabLink : ''}`}
                  onClick={() => setActiveTab('compare')}
                >
                  Compare
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'references'}
                  aria-controls="references-tab"
                  className={`${styles.tabLink} ${activeTab === 'references' ? styles.activeTabLink : ''}`}
                  onClick={() => setActiveTab('references')}
                >
                  Cross-Refs
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'notes'}
                  aria-controls="notes-tab"
                  className={`${styles.tabLink} ${activeTab === 'notes' ? styles.activeTabLink : ''}`}
                  onClick={() => setActiveTab('notes')}
                >
                  Notes
                </button>
              </div>

              <div className={styles.tabContent}>
                
                {/* TAB 0: Concordance Keyword / Strongs Search (Always Active) */}
                {activeTab === 'search' && (
                  <div id="search-tab" role="tabpanel" className={styles.tabPanel}>
                    <div className={styles.searchContainer}>
                      <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search word, phrase, or Strong's tag (e.g. grace, G2889)..."
                          className={styles.searchInput}
                        />
                        <button type="submit" disabled={searching} className={styles.searchBtn}>
                          {searching ? '...' : 'Search'}
                        </button>
                      </form>

                      {searchError && <p className={styles.searchError}>⚠️ {searchError}</p>}

                      {searching ? (
                        <div className={styles.tabLoading}>
                          <span className={styles.pulseGlow} />
                          <p>Searching the scriptures…</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className={styles.searchResultsList}>
                          <p className={styles.searchCount}>Found {searchTotal} occurrences (showing top {searchResults.length}):</p>
                          {searchResults.map((res, i) => (
                            <div
                              key={i}
                              className={styles.searchCard}
                              onClick={() => handleNavigateFromSearch(res)}
                              title={`Jump to ${res.reference} in the reader`}
                            >
                              <span className={styles.searchRef}>🔗 {res.reference}</span>
                              <p className={`${styles.searchText} text-serif`}>&quot;{res.text}&quot;</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.searchHint}>
                          💡 Type a keyword (e.g. &quot;covenant&quot;, &quot;repent&quot;) or a Strong&apos;s concordance tag (e.g. &quot;G746&quot;, &quot;H430&quot;) to run a full-text search.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Other study tabs require a selected verse */}
                {activeTab !== 'search' && !selectedVerse && (
                  <div className={styles.noSelection}>
                    <p>📖 Select a verse in the reader to view original language study, comparisons, cross-references, and write notes.</p>
                  </div>
                )}

                {activeTab !== 'search' && selectedVerse && (
                  <>
                    {/* Selected Verse Info Bar */}
                    <div className={styles.verseInfoBanner}>
                      <strong>Study Target:</strong> {selectedVerse.book_name} {selectedVerse.chapter}:{selectedVerse.verse}
                      {selectedWord && (
                        <span className={styles.selectedWordBadge}>
                          Word: &quot;{selectedWord}&quot;
                        </span>
                      )}
                    </div>

                    {/* TAB 1: AI Study */}
                    {activeTab === 'study' && (
                    <div id="study-tab" role="tabpanel" className={styles.tabPanel}>
                      {loadingStudy ? (
                        <div className={styles.tabLoading}>
                          <span className={styles.pulseGlow} />
                          <p>AI analyzing original languages & context…</p>
                        </div>
                      ) : studyError ? (
                        <div className={styles.errorBox}>
                          <p>⚠️ {studyError}</p>
                          <button
                            onClick={() => {
                              const v = selectedVerse;
                              setSelectedVerse(null);
                              setTimeout(() => setSelectedVerse(v), 50);
                            }}
                            className={styles.retryBtn}
                          >
                            Retry
                          </button>
                        </div>
                      ) : studyData ? (
                        <div className={styles.studyBody}>
                          
                          {/* Selected Word Concordance study */}
                          {selectedWord && studyData?.selectedWordStudy && (
                            <div className={styles.sectionBox} style={{ borderLeftColor: 'var(--dim-language)' }}>
                              <h3 className={styles.sectionTitle} style={{ color: 'var(--dim-language)' }}>
                                🔤 Original Language: &quot;{selectedWord}&quot;
                              </h3>
                              <div className={styles.lexiconCard}>
                                <div className={styles.lexiconHeader}>
                                  <span className={styles.originalWord}>{studyData.selectedWordStudy.originalWord}</span>
                                  <span className={styles.strongsBadge}>{studyData.selectedWordStudy.strongsNumber}</span>
                                </div>
                                <p className={styles.pronunciation}>Pronunciation: <em>{studyData.selectedWordStudy.pronunciation}</em></p>
                                <p className={styles.definition}>{studyData.selectedWordStudy.definition}</p>
                              </div>
                            </div>
                          )}

                          {/* Verse Key Words */}
                          {!selectedWord && (studyData?.originalLanguageWords?.length ?? 0) > 0 && (
                            <div className={styles.sectionBox} style={{ borderLeftColor: 'var(--dim-language)' }}>
                              <h3 className={styles.sectionTitle} style={{ color: 'var(--dim-language)' }}>
                                🔤 Key Original Words (Strong&apos;s)
                              </h3>
                              <div className={styles.concordanceList}>
                                {studyData?.originalLanguageWords?.map((wordStudy, i) => (
                                  <div key={i} className={styles.concordanceItem}>
                                    <div className={styles.lexiconHeader}>
                                      <strong>{wordStudy.word}</strong> → <span className={styles.originalWord}>{wordStudy.originalWord}</span>
                                      <span className={styles.strongsBadge}>{wordStudy.strongsNumber}</span>
                                    </div>
                                    <p className={styles.definitionText}>{wordStudy.definition}</p>
                                  </div>
                                ))}
                              </div>
                              <p className={styles.hintText}>💡 Click any word in the verse text to run a specific original language lookup.</p>
                            </div>
                          )}

                          {/* Commentary */}
                          <div className={styles.sectionBox} style={{ borderLeftColor: 'var(--dim-theological)' }}>
                            <h3 className={styles.sectionTitle} style={{ color: 'var(--dim-theological)' }}>
                              📖 Theological Commentary
                            </h3>
                            <p className={styles.commentaryText}>{studyData.commentary}</p>
                          </div>

                          {/* Practical Application */}
                          <div className={styles.sectionBox} style={{ borderLeftColor: 'var(--dim-practical)' }}>
                            <h3 className={styles.sectionTitle} style={{ color: 'var(--dim-practical)' }}>
                              🌱 Life Application
                            </h3>
                            <p className={styles.applicationText}>{studyData.practicalApplication}</p>
                          </div>
                        </div>
                      ) : (
                        <p className={styles.emptyState}>No study guide loaded.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Compare translations */}
                  {activeTab === 'compare' && (
                    <div id="compare-tab" role="tabpanel" className={styles.tabPanel}>
                      {loadingCompare ? (
                        <div className={styles.tabLoading}>
                          <span className={styles.pulseGlow} />
                          <p>Fetching translation comparisons…</p>
                        </div>
                      ) : (
                        <div className={styles.comparisonList}>
                          {comparedVerses.map((cv, i) => (
                            <div key={i} className={styles.comparisonItem}>
                              <span className={styles.compareTranslationName}>{cv.translation}</span>
                              <p className={`${styles.compareText} text-serif`}>{cv.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Cross-References */}
                  {activeTab === 'references' && (
                    <div id="references-tab" role="tabpanel" className={styles.tabPanel}>
                      {loadingStudy ? (
                        <div className={styles.tabLoading}>
                          <span className={styles.pulseGlow} />
                          <p>Finding cross-references…</p>
                        </div>
                      ) : (studyData?.crossReferences?.length ?? 0) > 0 ? (
                        <div className={styles.crossReferencesList}>
                          {studyData?.crossReferences?.map((ref, i) => (
                            <div key={i} className={styles.crossReferenceCard}>
                              <div className={styles.crossRefHeader}>
                                <button
                                  className={styles.crossRefLink}
                                  onClick={() => handleJumpToReference(ref.reference)}
                                  title={`Jump to ${ref.reference} in the reader`}
                                >
                                  🔗 {ref.reference}
                                </button>
                              </div>
                              <p className={`${styles.crossRefText} text-serif`}>&quot;{ref.text}&quot;</p>
                              <p className={styles.crossRefReason}><strong>Link:</strong> {ref.connectionReason}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.emptyState}>No cross-references loaded.</p>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Notes */}
                  {activeTab === 'notes' && (
                    <div id="notes-tab" role="tabpanel" className={styles.tabPanel}>
                      <div className={styles.notesContainer}>
                        <label htmlFor="notes-textarea" className={styles.notesLabel}>
                          Personal Study Notes (Saved locally)
                        </label>
                        <textarea
                          id="notes-textarea"
                          value={notes}
                          onChange={(e) => handleSaveNote(e.target.value)}
                          placeholder={`Write study notes, thoughts, or sermon outlines for ${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse} here...`}
                          className={styles.notesTextarea}
                        />
                        <div className={styles.notesFooter}>
                          <span>Saved to Local Storage</span>
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
