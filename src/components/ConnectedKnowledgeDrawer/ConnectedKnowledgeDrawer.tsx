'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  BookOpen,
  Languages,
  Mic,
  HeartHandshake,
  ScrollText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  resolveConnectionsForVerse,
  resolveConnectionsForStrongs,
  resolveConnectionsForSermon,
} from '@/lib/universalIndexer';
import type { ConnectedKnowledge } from '@/types';
import styles from './ConnectedKnowledgeDrawer.module.css';

interface ConnectedKnowledgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'verse' | 'strongs' | 'sermon' | 'prayer';
  entityId: string; // e.g. "John 3:16" or "G2889"
  customSermons?: any[];
  customPrayers?: any[];
}

type TabKey = 'all' | 'scripture' | 'strongs' | 'sermons' | 'prayers' | 'catechisms';

export default function ConnectedKnowledgeDrawer({
  isOpen,
  onClose,
  entityType,
  entityId,
  customSermons,
  customPrayers,
}: ConnectedKnowledgeDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentEntity, setCurrentEntity] = useState({ type: entityType, id: entityId });

  useEffect(() => {
    setCurrentEntity({ type: entityType, id: entityId });
    setSearchQuery('');
  }, [entityType, entityId]);

  const knowledge: ConnectedKnowledge = useMemo(() => {
    const id = searchQuery.trim() || currentEntity.id;
    if (!id) {
      return {
        queryEntity: { type: 'keyword', identifier: '', label: 'Connected Knowledge' },
        verses: [],
        strongs: [],
        prayers: [],
        sermons: [],
        catechisms: [],
      };
    }

    if (id.toUpperCase().startsWith('G') || id.toUpperCase().startsWith('H')) {
      return resolveConnectionsForStrongs(id, { customSermons, customPrayers });
    }

    // Default to resolving by passage
    return resolveConnectionsForVerse(id, { customSermons, customPrayers });
  }, [searchQuery, currentEntity, customSermons, customPrayers]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`${styles.backdrop} ${isOpen ? styles.open : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerBadgeRow}>
              <span className={styles.headerBadge}>
                <Sparkles size={11} style={{ display: 'inline', marginRight: 3 }} />
                Connected Mesh
              </span>
            </div>
            <h2 className={styles.headerTitle}>{knowledge.queryEntity.label}</h2>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search inside drawer */}
        <div className={styles.searchSection}>
          <div className={styles.searchInputWrap}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Look up any verse, Strong's (G26), sermon…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Row */}
        <div className={styles.tabRow}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'strongs' ? styles.active : ''}`}
            onClick={() => setActiveTab('strongs')}
          >
            <Languages size={13} />
            Original
            {knowledge.strongs.length > 0 && (
              <span className={styles.tabBadge}>{knowledge.strongs.length}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'scripture' ? styles.active : ''}`}
            onClick={() => setActiveTab('scripture')}
          >
            <BookOpen size={13} />
            Verses
            {knowledge.verses.length > 0 && (
              <span className={styles.tabBadge}>{knowledge.verses.length}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'sermons' ? styles.active : ''}`}
            onClick={() => setActiveTab('sermons')}
          >
            <Mic size={13} />
            Sermons
            {knowledge.sermons.length > 0 && (
              <span className={styles.tabBadge}>{knowledge.sermons.length}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'prayers' ? styles.active : ''}`}
            onClick={() => setActiveTab('prayers')}
          >
            <HeartHandshake size={13} />
            Prayers
            {knowledge.prayers.length > 0 && (
              <span className={styles.tabBadge}>{knowledge.prayers.length}</span>
            )}
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'catechisms' ? styles.active : ''}`}
            onClick={() => setActiveTab('catechisms')}
          >
            <ScrollText size={13} />
            Creeds
            {knowledge.catechisms.length > 0 && (
              <span className={styles.tabBadge}>{knowledge.catechisms.length}</span>
            )}
          </button>
        </div>

        {/* Drawer Body */}
        <div className={styles.drawerBody}>
          {/* Strong's Original Languages */}
          {(activeTab === 'all' || activeTab === 'strongs') && knowledge.strongs.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                <Languages size={13} /> Original Greek & Hebrew Lemmas
              </div>
              {knowledge.strongs.map((s) => (
                <div key={s.code} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.strongsLemmaRow}>
                      <span className={styles.strongsLemma}>{s.lemma}</span>
                      <span className={styles.strongsTranslit}>({s.transliteration})</span>
                    </div>
                    <span className={styles.headerBadge}>{s.code}</span>
                  </div>
                  <p className={styles.cardBody}>{s.definition}</p>
                  <a
                    className={styles.cardLink}
                    href={`/bible?strongs=${encodeURIComponent(s.code)}`}
                  >
                    Open in Greek/Hebrew Reader <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </section>
          )}

          {/* Connected Sermons */}
          {(activeTab === 'all' || activeTab === 'sermons') && knowledge.sermons.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                <Mic size={13} /> Linked Sermon Outlines
              </div>
              {knowledge.sermons.map((sermon) => (
                <div key={sermon.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{sermon.title}</h3>
                    {sermon.updated_at && (
                      <span className={styles.cardSubtitle}>
                        {new Date(sermon.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {sermon.excerpt && <p className={styles.cardBody}>{sermon.excerpt}</p>}
                  <a className={styles.cardLink} href="/sermons">
                    Open Sermon Workspace <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </section>
          )}

          {/* Connected Prayers */}
          {(activeTab === 'all' || activeTab === 'prayers') && knowledge.prayers.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                <HeartHandshake size={13} /> Active Prayer Petitions & Praises
              </div>
              {knowledge.prayers.map((prayer) => (
                <div key={prayer.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{prayer.title}</h3>
                    {prayer.category && (
                      <span className={styles.headerBadge}>{prayer.category}</span>
                    )}
                  </div>
                  {prayer.text && <p className={styles.cardBody}>{prayer.text}</p>}
                  <a className={styles.cardLink} href="/prayer">
                    View in Prayer Care <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </section>
          )}

          {/* Connected Verses */}
          {(activeTab === 'all' || activeTab === 'scripture') && knowledge.verses.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                <BookOpen size={13} /> Scripture Passages
              </div>
              {knowledge.verses.map((v) => (
                <div key={v.ref} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{v.ref}</h3>
                  </div>
                  <a
                    className={styles.cardLink}
                    href={`/bible?q=${encodeURIComponent(v.ref)}`}
                  >
                    Read Passage in Study Desk <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </section>
          )}

          {/* Historical Catechisms */}
          {(activeTab === 'all' || activeTab === 'catechisms') && knowledge.catechisms.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                <ScrollText size={13} /> Confessions & Catechisms
              </div>
              {knowledge.catechisms.map((c, idx) => (
                <div key={idx} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                      {c.catechism} — Q{c.qNum}
                    </h3>
                    {c.tradition && <span className={styles.headerBadge}>{c.tradition}</span>}
                  </div>
                  <p className={styles.cardBody}>
                    <strong>Q: {c.question}</strong>
                  </p>
                  <p className={styles.cardBody}>A: {c.answer}</p>
                  <a className={styles.cardLink} href="/study-resources?tab=catechism">
                    Explore Catechisms <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </section>
          )}

          {/* Empty fallback */}
          {knowledge.strongs.length === 0 &&
            knowledge.sermons.length === 0 &&
            knowledge.prayers.length === 0 &&
            knowledge.verses.length === 0 &&
            knowledge.catechisms.length === 0 && (
              <div className={styles.emptyState}>
                <BookOpen size={32} />
                <p>No cross-references detected for &ldquo;{searchQuery || currentEntity.id}&rdquo;.</p>
                <span style={{ fontSize: '0.78rem' }}>
                  Try searching a passage like <code>John 3:16</code>, a Strong&apos;s code like <code>G2889</code>, or an outline topic.
                </span>
              </div>
            )}
        </div>
      </aside>
    </>
  );
}
