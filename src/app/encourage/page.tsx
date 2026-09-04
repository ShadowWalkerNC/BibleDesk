'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  Share2,
  Heart,
  Copy,
  Check,
  Volume2,
  ArrowRight,
  Bookmark,
  Shield,
  Church,
} from 'lucide-react';
import {
  ENCOURAGEMENT_CATEGORIES,
  ENCOURAGEMENT_PROMISES,
  EncouragementCategory,
  EncouragementItem,
} from '@/lib/encouragementData';
import styles from './page.module.css';

export default function EncouragementPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Filtered items
  const filteredItems = useMemo(() => {
    return ENCOURAGEMENT_PROMISES.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.theme.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q) ||
        item.scriptureText.toLowerCase().includes(q) ||
        item.meditation.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Featured spotlight is the first item or a dedicated one
  const spotlightItem: EncouragementItem = filteredItems[0] || ENCOURAGEMENT_PROMISES[0];

  const handleCopy = (item: EncouragementItem) => {
    const textToCopy = `✦ ${item.theme.toUpperCase()} ✦\n"${item.scriptureText}" — ${item.reference} (${item.translation})\n\n${item.meditation}\n\n🙏 Prayer: "${item.prayerStarter}"\n\n— Shared via BibleDesk (bibledesk.org/encourage)`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSpeak = (item: EncouragementItem) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(
      `${item.theme}. From ${item.reference}: ${item.scriptureText}. Reflection: ${item.meditation}. Prayer: ${item.prayerStarter}`
    );
    utter.rate = 0.92;
    utter.pitch = 1.0;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const handleTurnIntoPrayer = (item: EncouragementItem) => {
    // Navigate to /prayer prefilling the prayer starter
    const params = new URLSearchParams({
      action: 'new',
      title: `Prayer for ${item.theme}`,
      text: item.prayerStarter,
      category: item.category === 'calling-creativity' ? 'Custom' : 'Healing',
    });
    router.push(`/prayer?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.badge}>
          <Sparkles size={14} />
          <span>Words of Encouragement &amp; Spiritual Fortitude</span>
        </div>
        <h1 className={styles.title}>Biblical Promises &amp; Calling</h1>
        <p className={styles.subtitle}>
          Scripture-anchored meditations, artistic worship inspiration, and pastoral comfort crafted to
          strengthen believers, worship songwriters, missionaries, and church leaders.
        </p>

        {/* Search */}
        <div className={styles.searchBarWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search promises (e.g. anxiety, creative calling, healing, peace)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {/* Category Scroller */}
      <div className={styles.categoryScroller} role="tablist">
        <button
          type="button"
          className={`${styles.chip} ${selectedCategory === 'all' ? styles.chipActive : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <span>✦ All Promises</span>
          <span>({ENCOURAGEMENT_PROMISES.length})</span>
        </button>

        {ENCOURAGEMENT_CATEGORIES.map(cat => {
          const count = ENCOURAGEMENT_PROMISES.filter(p => p.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              className={`${styles.chip} ${selectedCategory === cat.id ? styles.chipActive : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Spotlight Card */}
      {spotlightItem && (
        <section className={styles.spotlightCard} aria-label="Spotlight Promise">
          <div className={styles.spotlightHeader}>
            <span className={styles.spotlightTheme}>{spotlightItem.theme}</span>
            <span
              className={styles.spotlightCategoryBadge}
              style={{
                background: 'rgba(181, 132, 20, 0.12)',
                color: '#92670e',
                border: '1px solid rgba(181, 132, 20, 0.3)',
              }}
            >
              {spotlightItem.categoryLabel}
            </span>
          </div>

          <div className={styles.scriptureQuoteBox}>
            <p className={styles.scriptureText}>"{spotlightItem.scriptureText}"</p>
            <div className={styles.scriptureRef}>
              <span>{spotlightItem.reference}</span>
              <span>({spotlightItem.translation})</span>
            </div>
          </div>

          <p className={styles.meditationText}>{spotlightItem.meditation}</p>

          <div className={styles.prayerStarterBox}>
            <div className={styles.prayerStarterLabel}>
              <Heart size={14} />
              <span>Prayer Meditation Starter</span>
            </div>
            <p className={styles.prayerStarterText}>"{spotlightItem.prayerStarter}"</p>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.primaryActionBtn}`}
              onClick={() => handleTurnIntoPrayer(spotlightItem)}
            >
              <Heart size={16} />
              <span>Turn into Personal Prayer / Escalate</span>
            </button>

            <button
              type="button"
              className={`${styles.actionBtn} ${styles.secondaryActionBtn}`}
              onClick={() => handleCopy(spotlightItem)}
            >
              {copiedId === spotlightItem.id ? <Check size={16} color="#059669" /> : <Copy size={16} />}
              <span>{copiedId === spotlightItem.id ? 'Copied to Clipboard!' : 'Copy Devotional Text'}</span>
            </button>

            <button
              type="button"
              className={`${styles.actionBtn} ${styles.secondaryActionBtn}`}
              onClick={() => handleSpeak(spotlightItem)}
              title="Listen to spoken devotional"
            >
              <Volume2 size={16} color={isSpeaking ? '#b58414' : 'currentColor'} />
              <span>{isSpeaking ? 'Pause Audio' : 'Listen Aloud'}</span>
            </button>
          </div>
        </section>
      )}

      {/* Grid of Other Promises */}
      <div className={styles.grid}>
        {filteredItems.map(item => (
          <article key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTheme}>{item.theme}</h3>
              <span
                style={{
                  fontSize: '0.74rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  background: 'rgba(181, 132, 20, 0.08)',
                  color: '#846014',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.categoryLabel}
              </span>
            </div>

            <div className={styles.cardQuote}>
              "{item.scriptureText.length > 150 ? item.scriptureText.slice(0, 147) + '...' : item.scriptureText}"
            </div>
            <div className={styles.cardRef}>{item.reference}</div>

            <p className={styles.cardMeditation}>{item.meditation}</p>

            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.cardBtn}
                onClick={() => handleTurnIntoPrayer(item)}
                title="Turn into Prayer"
              >
                <Heart size={14} />
                <span>Pray</span>
              </button>

              <button
                type="button"
                className={styles.cardBtn}
                onClick={() => handleCopy(item)}
                title="Copy text"
              >
                {copiedId === item.id ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                <span>{copiedId === item.id ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
