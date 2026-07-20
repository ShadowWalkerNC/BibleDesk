'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header/Header';
import {
  ALL_CATECHISMS,
  CATEGORIES,
  type Catechism,
  type CatechismQuestion,
} from '@/lib/catechismData';
import styles from './page.module.css';

export default function CatechismPage() {
  const [activeCatechism, setActiveCatechism] = useState<Catechism>(ALL_CATECHISMS[0]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'browse' | 'quiz'>('browse');
  const [quizIndex, setQuizIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  const categories = ['All', ...CATEGORIES(activeCatechism)];

  const filteredQuestions = useMemo<CatechismQuestion[]>(() => {
    return activeCatechism.questions.filter(q => {
      const matchCat = activeCategory === 'All' || q.category === activeCategory;
      const matchSearch = !search.trim() ||
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        q.answer.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCatechism, activeCategory, search]);

  const currentQuizQ = filteredQuestions[quizIndex % Math.max(filteredQuestions.length, 1)];

  function startQuiz() {
    setMode('quiz');
    setQuizIndex(0);
    setRevealed(false);
    setQuizScore({ correct: 0, total: 0 });
  }

  function handleQuizAnswer(correct: boolean) {
    setQuizScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setQuizIndex(i => i + 1);
    setRevealed(false);
  }

  function switchCatechism(cat: Catechism) {
    setActiveCatechism(cat);
    setActiveCategory('All');
    setSearch('');
    setExpandedId(null);
    setMode('browse');
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className="container">

          {/* Page Header */}
          <div className={styles.pageHeader}>
            <h1 className={`${styles.pageTitle} text-serif`}>Catechism</h1>
            <p className={styles.pageSubtitle}>
              Classic Reformed Q&amp;A summaries of Christian doctrine. Study, memorize, and test yourself.
            </p>
          </div>

          {/* Catechism Selector */}
          <div className={styles.catechismSelector}>
            {ALL_CATECHISMS.map(cat => (
              <button
                key={cat.id}
                className={`${styles.catechismBtn} ${activeCatechism.id === cat.id ? styles.catechismBtnActive : ''}`}
                onClick={() => switchCatechism(cat)}
              >
                <span className={styles.catechismBtnName}>{cat.shortName}</span>
                <span className={styles.catechismBtnYear}>{cat.year}</span>
              </button>
            ))}
          </div>

          {/* Catechism Info Card */}
          <div className={`${styles.infoCard} glass-card`}>
            <div className={styles.infoCardInner}>
              <div>
                <h2 className={`${styles.infoTitle} text-serif`}>{activeCatechism.name}</h2>
                <p className={styles.infoMeta}>{activeCatechism.tradition} · {activeCatechism.year}</p>
                <p className={styles.infoDesc}>{activeCatechism.description}</p>
              </div>
              <div className={styles.infoStats}>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{activeCatechism.questions.length}</span>
                  <span className={styles.statLabel}>Questions</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{CATEGORIES(activeCatechism).length}</span>
                  <span className={styles.statLabel}>Categories</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className={styles.modeBar}>
            <div className={styles.modeBtns}>
              <button
                className={`${styles.modeBtn} ${mode === 'browse' ? styles.modeBtnActive : ''}`}
                onClick={() => setMode('browse')}
              >
                Browse
              </button>
              <button
                className={`${styles.modeBtn} ${mode === 'quiz' ? styles.modeBtnActive : ''}`}
                onClick={startQuiz}
              >
                Quiz Mode
              </button>
            </div>

            {mode === 'browse' && (
              <div className={styles.searchRow}>
                <input
                  type="search"
                  placeholder="Search questions and answers…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Search catechism"
                />
                <span className={styles.resultCount}>{filteredQuestions.length} results</span>
              </div>
            )}
          </div>

          {/* Category Filter (browse mode only) */}
          {mode === 'browse' && (
            <div className={styles.categoryBar} role="group" aria-label="Category filter">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`${styles.catBtn} ${activeCategory === cat ? styles.catBtnActive : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Browse Mode */}
          {mode === 'browse' && (
            <div className={styles.questionList}>
              {filteredQuestions.length === 0 ? (
                <div className={styles.empty}>No questions match your search.</div>
              ) : (
                filteredQuestions.map(q => (
                  <div
                    key={q.id}
                    className={`${styles.questionCard} glass-card ${expandedId === q.id ? styles.questionCardExpanded : ''}`}
                  >
                    <button
                      className={styles.questionHeader}
                      onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                      aria-expanded={expandedId === q.id}
                    >
                      <span className={styles.qNum}>Q{q.number}</span>
                      <span className={styles.qText}>{q.question}</span>
                      <span className={styles.qCategory}>{q.category}</span>
                      <span className={styles.chevron} aria-hidden="true">
                        {expandedId === q.id ? '▲' : '▼'}
                      </span>
                    </button>

                    {expandedId === q.id && (
                      <div className={styles.answerBody}>
                        <div className={styles.answerLabel}>Answer</div>
                        <p className={`${styles.answerText} text-serif`}>{q.answer}</p>
                        {q.proofTexts.length > 0 && (
                          <div className={styles.proofTexts}>
                            <span className={styles.proofLabel}>Scripture Proofs</span>
                            {q.proofTexts.map(pt => (
                              <span key={pt} className={styles.proofTag}>{pt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Quiz Mode */}
          {mode === 'quiz' && filteredQuestions.length > 0 && (
            <div className={styles.quizContainer}>
              {quizIndex >= filteredQuestions.length ? (
                <div className={`${styles.quizComplete} glass-card`}>
                  <h2 className={`${styles.quizCompleteTitle} text-serif`}>Quiz Complete</h2>
                  <div className={styles.quizScoreDisplay}>
                    <span className={styles.quizScoreNum}>{quizScore.correct}</span>
                    <span className={styles.quizScoreDen}>/ {quizScore.total}</span>
                  </div>
                  <p className={styles.quizScoreLabel}>
                    {quizScore.correct === quizScore.total
                      ? 'Perfect score — excellent work!'
                      : quizScore.correct >= quizScore.total * 0.7
                      ? 'Great effort — keep practicing!'
                      : 'Keep studying — you\'ll improve with repetition.'}
                  </p>
                  <button className={styles.retryBtn} onClick={startQuiz}>Try Again</button>
                </div>
              ) : (
                <div className={`${styles.quizCard} glass-card`}>
                  <div className={styles.quizProgress}>
                    <div
                      className={styles.quizProgressFill}
                      style={{ width: `${(quizIndex / filteredQuestions.length) * 100}%` }}
                    />
                  </div>
                  <div className={styles.quizMeta}>
                    <span className={styles.quizQNum}>Q{currentQuizQ.number}</span>
                    <span className={styles.quizCounter}>{quizIndex + 1} of {filteredQuestions.length}</span>
                  </div>
                  <h2 className={`${styles.quizQuestion} text-serif`}>{currentQuizQ.question}</h2>

                  {!revealed ? (
                    <button className={styles.revealBtn} onClick={() => setRevealed(true)}>
                      Reveal Answer
                    </button>
                  ) : (
                    <div className={styles.quizAnswer}>
                      <p className={`${styles.quizAnswerText} text-serif`}>{currentQuizQ.answer}</p>
                      {currentQuizQ.proofTexts.length > 0 && (
                        <div className={styles.proofTexts}>
                          {currentQuizQ.proofTexts.map(pt => (
                            <span key={pt} className={styles.proofTag}>{pt}</span>
                          ))}
                        </div>
                      )}
                      <div className={styles.quizActions}>
                        <button className={styles.wrongBtn} onClick={() => handleQuizAnswer(false)}>
                          Did not know
                        </button>
                        <button className={styles.correctBtn} onClick={() => handleQuizAnswer(true)}>
                          Knew it
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
