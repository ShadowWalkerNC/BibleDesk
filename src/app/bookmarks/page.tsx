'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header/Header';
import styles from './bookmarks.module.css';

// ─── Types ────────────────────────────────────────────────────────────────

interface BookmarkRow {
  id: string;
  answer_id: string;
  share_slug: string;
  question: string;
  summary: string | null;
  translation: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  note: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [removing, setRemoving]   = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(PAGE_SIZE),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/bookmarks?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookmarks(data.bookmarks ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  async function removeBookmark(answerId: string) {
    setRemoving(answerId);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerId }),
      });
      if (res.ok) {
        setBookmarks((prev) => prev.filter((b) => b.answer_id !== answerId));
        setTotal((t) => Math.max(0, t - 1));
      }
    } finally {
      setRemoving(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Header />
      <main id="main-content" className={styles.main}>
        <div className="container">

          {/* Page header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>★ Bookmarks</h1>
              <p className={styles.pageSubtitle}>
                {total > 0 ? `${total.toLocaleString()} saved answer${total !== 1 ? 's' : ''}` : 'Your saved Bible study answers'}
              </p>
            </div>
            <Link href="/" className={styles.newStudyBtn}>
              ✦ New Study
            </Link>
          </div>

          {/* Search */}
          <div className={styles.controls}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon} aria-hidden="true">🔍</span>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search bookmarks…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                aria-label="Search bookmarks"
              />
              {search && (
                <button className={styles.clearSearch} onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search">
                  ✕
                </button>
              )}
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
              <button className={styles.retryBtn} onClick={fetchBookmarks}>Try again</button>
            </div>
          )}

          {!loading && !error && bookmarks.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyEmoji}>☆</div>
              <h2 className={styles.emptyTitle}>
                {search ? 'No matches found' : 'No bookmarks yet'}
              </h2>
              <p className={styles.emptyDesc}>
                {search
                  ? 'Try a different search.'
                  : 'Save answers from any study using the ☆ Save button.'}
              </p>
              {!search && (
                <Link href="/" className={styles.emptyBtn}>Ask a Question</Link>
              )}
            </div>
          )}

          {!loading && !error && bookmarks.length > 0 && (
            <>
              <ul className={styles.grid} aria-label="Bookmarked answers">
                {bookmarks.map((b) => {
                  const badge = confidenceBadge(b.confidence);
                  return (
                    <li key={b.id} className={styles.card}>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardDate}>{formatDate(b.created_at)}</span>
                        <span className={`${styles.badge} ${badge.cls}`}>{badge.label}</span>
                        {b.translation && (
                          <span className={styles.translationTag}>{b.translation.toUpperCase()}</span>
                        )}
                      </div>

                      <h2 className={styles.cardQuestion}>{b.question}</h2>

                      {b.summary && (
                        <p className={styles.cardSummary}>{b.summary}</p>
                      )}

                      <div className={styles.cardFooter}>
                        <Link href={`/share/${b.share_slug}`} className={styles.viewBtn}>
                          View Answer →
                        </Link>
                        <button
                          className={styles.reaskBtn}
                          onClick={() => { window.location.href = `/?q=${encodeURIComponent(b.question)}`; }}
                          title="Ask this question again"
                        >
                          ↺ Re-ask
                        </button>
                        <button
                          className={styles.removeBtn}
                          onClick={() => removeBookmark(b.answer_id)}
                          disabled={removing === b.answer_id}
                          aria-label="Remove bookmark"
                          title="Remove bookmark"
                        >
                          {removing === b.answer_id ? '…' : '★'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Bookmarks pagination">
                  <button
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Prev
                  </button>
                  <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                  <button
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
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
