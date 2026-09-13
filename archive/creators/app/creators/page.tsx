'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Music,
  Mic,
  PenTool,
  Church,
  Palette,
  HeartHandshake,
  Layers,
} from 'lucide-react';
import CreatorCard from '@/components/CreatorCard/CreatorCard';
import CreatorEditorModal from '@/components/CreatorEditorModal/CreatorEditorModal';
import { getAllCreators } from '@/lib/creatorStore';
import type { CreatorProfile, CreatorCategory } from '@/types/creator';
import styles from './page.module.css';

export default function CreatorsDirectoryPage() {
  const [creators, setCreators] = useState<CreatorProfile[]>(() => getAllCreators());
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<CreatorCategory | 'all'>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const filtered = useMemo(() => {
    return creators.filter((c) => {
      const matchCat = selectedCat === 'all' || c.category === selectedCat;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.display_name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        (c.season_verse?.ref && c.season_verse.ref.toLowerCase().includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [creators, search, selectedCat]);

  return (
    <div className={styles.container}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.badge}>
          <Sparkles size={14} />
          Christian Creator & Ministry Hub
        </div>
        <h1 className={styles.title}>Kingdom Creatives & Ministries</h1>
        <p className={styles.subtitle}>
          Discover worship leaders, biblical podcast hosts, devotional writers, and Christian artists.
          Support their calling directly with 0% platform fees, pray over their petitions, and read their
          Scriptures of the Season.
        </p>

        <div className={styles.ctaRow}>
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => setIsEditorOpen(true)}
          >
            <Plus size={16} />
            Create Your Ministry Page
          </button>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by creator name, @handle, city, or scripture verse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.categoryPills}>
          <button
            type="button"
            className={`${styles.catBtn} ${selectedCat === 'all' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCat('all')}
          >
            <Layers size={14} />
            All Creatives
          </button>
          <button
            type="button"
            className={`${styles.catBtn} ${selectedCat === 'worship' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCat('worship')}
          >
            <Music size={14} />
            Worship Music
          </button>
          <button
            type="button"
            className={`${styles.catBtn} ${selectedCat === 'podcast' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCat('podcast')}
          >
            <Mic size={14} />
            Podcasts & Video
          </button>
          <button
            type="button"
            className={`${styles.catBtn} ${selectedCat === 'writer' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCat('writer')}
          >
            <PenTool size={14} />
            Devotionals & Writers
          </button>
          <button
            type="button"
            className={`${styles.catBtn} ${selectedCat === 'pastor' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCat('pastor')}
          >
            <Church size={14} />
            Pastoral & Teaching
          </button>
          <button
            type="button"
            className={`${styles.catBtn} ${selectedCat === 'artist' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCat('artist')}
          >
            <Palette size={14} />
            Kingdom Art
          </button>
          <button
            type="button"
            className={`${styles.catBtn} ${selectedCat === 'ministry' ? styles.catBtnActive : ''}`}
            onClick={() => setSelectedCat('ministry')}
          >
            <HeartHandshake size={14} />
            Missions & Non-Profits
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {filtered.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.emptyState}>
          <p>No creators found matching "{search}".</p>
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => setIsEditorOpen(true)}
            style={{ marginTop: '0.5rem' }}
          >
            Be the First to Publish This Ministry
          </button>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <CreatorEditorModal
          onClose={() => setIsEditorOpen(false)}
          onSaved={(saved) => {
            setIsEditorOpen(false);
            setCreators(getAllCreators());
          }}
        />
      )}
    </div>
  );
}
