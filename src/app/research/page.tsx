'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Sparkles, Bookmark, Folder, ArrowRight } from 'lucide-react';
import ResearchAssistant from '@/components/ResearchAssistant/ResearchAssistant';
import styles from './page.module.css';

interface StudyNote {
  id: string;
  title: string;
  verseRef?: string;
  content: string;
}

interface StudyCollection {
  id: string;
  name: string;
  itemCount: number;
  description?: string;
}

function ResearchContent() {
  const [recentNotes, setRecentNotes] = useState<StudyNote[]>([]);
  const [collections, setCollections] = useState<StudyCollection[]>([]);

  useEffect(() => {
    fetch('/api/notes')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.notes)) {
          setRecentNotes(data.notes.slice(0, 5));
        }
      })
      .catch(() => {});

    fetch('/api/collections')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.collections)) {
          setCollections(data.collections);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Sparkles size={16} />
          <span>Scholarly Theological Workbench</span>
        </div>
        <h1 className={styles.title}>
          Biblical Research Assistant
        </h1>
        <p className={styles.subtitle}>
          Investigate scriptures across five hermeneutical dimensions: Biblical textual foundation, historical horizon, Greek/Hebrew lexicons, systematic theology, and practical application.
        </p>
      </header>

      {/* Main Research Assistant Component */}
      <ResearchAssistant />

      {/* Saved Notes & Collections Row */}
      <div className={styles.cardsGrid}>
        {/* Recent Notes */}
        <div className={styles.sideCard}>
          <div className={styles.cardHeader}>
            <Bookmark size={18} />
            <h3>Recent Study Notes</h3>
          </div>

          {recentNotes.length === 0 ? (
            <div className={styles.emptyCardState}>
              <p className={styles.emptyText}>
                No study notes saved yet. Highlighting verses in the reader or saving scholarly findings will catalog your notes here.
              </p>
              <Link href="/bible" className={styles.emptyActionLink}>
                <span>Open Study Desk</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className={styles.itemsList}>
              {recentNotes.map((n) => (
                <div key={n.id} className={styles.noteItem}>
                  <div className={styles.itemTop}>
                    <strong className={styles.itemTitle}>{n.title}</strong>
                    {n.verseRef && <span className={styles.itemRef}>{n.verseRef}</span>}
                  </div>
                  <p className={styles.itemDesc}>
                    {n.content.slice(0, 120)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collections */}
        <div className={styles.sideCard}>
          <div className={styles.cardHeader}>
            <Folder size={18} />
            <h3>Thematic Collections</h3>
          </div>

          {collections.length === 0 ? (
            <div className={styles.emptyCardState}>
              <p className={styles.emptyText}>
                No thematic collections created yet. You can group related studies or load the starter workspace.
              </p>
              <Link href="/system" className={styles.emptyActionLink}>
                <span>Load Starter Workspace</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className={styles.itemsList}>
              {collections.map((c) => (
                <div key={c.id} className={styles.noteItem}>
                  <div className={styles.itemTop}>
                    <strong className={styles.itemTitle}>{c.name}</strong>
                    <span className={styles.itemBadge}>
                      {c.itemCount} items
                    </span>
                  </div>
                  {c.description && (
                    <p className={styles.itemDesc}>
                      {c.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Loading Research Workbench…</div>}>
      <ResearchContent />
    </Suspense>
  );
}
