'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import styles from './history.module.css';

// ─── Types ────────────────────────────────────────────────────────────────

interface HistoryAnswer {
  id: string;
  question: string;
  summary: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  translation_used: string | null;
  status: string;
  created_at: string;
}

const PAGE_SIZE = 20;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function confidenceBadge(level: string | null) {
  switch (level) {
    case 'high':   return { label: 'High',   cls: styles.badgeHigh };
    case 'medium': return { label: 'Medium', cls: styles.badgeMedium };
    case 'low':    return { label: 'Low',    cls: styles.badgeLow };
    default:       return { label: 'N/A',    cls: styles.badgeNeutral };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [answers, setAnswers]       = useState<HistoryAnswer[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [filterConf, setFilterConf] = useState<string>('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(search     ? { search }           : {}),
        ...(filterConf ? { confidence: filterConf } : {}),
      });
      const res = await fetch(`/api/history?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAnswers(data.answers ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterConf]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Header />
      <main id="main-content" className={styles.main}>
        <div className="container">

          {/* Page header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Study History</h1>
              <p className={styles.pageSubtitle}>
                {total > 0 ? `${total.toLocaleString()} saved answer${total !== 1 ? 's' : ''}` : 'Your previous Bible study sessions'}
              </p>
            </div>
            <Link href="/" className={styles.newStudyBtn}>
              ✦ New Study
            </Link>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon} aria-hidden="true">🔍</span>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search questions…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                aria-label="Search history"
              />
              {search && (
                <button className={styles.clearSearch} onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>

            <div className={styles.filters}>
              <label className={styles.filterLabel} htmlFor="conf-filter">Confidence</label>
              <select
                id="conf-filter"
                className={styles.filterSelect}
                value={filterConf}
                onChange={(e) => { setFilterConf(e.target.value); setPage(1); }}
              >
                <option value="">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {loading && (
            <div className={styles.loadingGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className={styles.errorState}>
              <p className={styles.errorMsg}>⚠ {error}</p>
              <button className={styles.retryBtn} onClick={fetchHistory}>Try again</button>
            </div>
          )}

          {!loading && !error && answers.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyEmoji}>📖</div>
              <h2 className={styles.emptyTitle}>
                {search || filterConf ? 'No matches found' : 'No study history yet'}
              </h2>
              <p className={styles.emptyDesc}>
                {search || filterConf
                  ? 'Try adjusting your search or filter.'
                  : 'Ask your first Bible question to get started.'}
              </p>
              {!(search || filterConf) && (
                <Link href="/" className={styles.emptyBtn}>Ask a Question</Link>
              )}
            </div>
          )}

          {!loading && !error && answers.length > 0 && (
            <>
              <ul className={styles.answerGrid} aria-label="Study history">
                {answers.map((a) => {
                  const badge = confidenceBadge(a.confidence);
                  const slug = a.id.slice(0, 8);
                  return (
                    <li key={a.id} className={styles.card}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardDate}>
                          {formatDate(a.created_at)}
                          <span className={styles.cardTime}> · {formatTime(a.created_at)}</span>
                        </span>
                        <span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>
                        {a.translation_used && (
                          <span className={styles.translationTag}>{a.translation_used.toUpperCase()}</span>
                        )}
                      </div>

                      <h2 className={styles.cardQuestion}>{a.question}</h2>

                      {a.summary && (
                        <p className={styles.cardSummary}>{a.summary}</p>
                      )}

                      <div className={styles.cardFooter}>
                        <Link href={`/share/${slug}`} className={styles.viewBtn}>
                          View Answer →
                        </Link>
                        <button
                          className={styles.reaskBtn}
                          onClick={() => {
                            const url = `/?q=${encodeURIComponent(a.question)}`;
                            window.location.href = url;
                          }}
                          title="Ask this question again"
                        >
                          ↺ Re-ask
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="History pagination">
                  <button
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    ← Prev
                  </button>

                  <span className={styles.pageInfo}>
                    Page {page} of {totalPages}
                  </span>

                  <button
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </nav>
              )}
            </>
          )}

        </div>
      </main>
    </>
  );
}
