'use client';

import type { BibleAnswer, DimensionKey } from '@/types';
import { DIMENSION_META } from '@/types';
import { useToast } from '@/components/Toast/Toast';
import { useBookmark } from '@/hooks/useBookmark';
import { useState } from 'react';
import { 
  BookOpen, 
  Landmark, 
  Languages, 
  Church, 
  Heart, 
  Copy, 
  Link as LinkIcon, 
  Bookmark, 
  BookmarkCheck, 
  Share2,
  MessageSquare,
  Radio,
} from 'lucide-react';
import { createWhatsAppShareLink, formatBibleAnswerForWhatsApp } from '@/lib/whatsapp';
import styles from './DimensionPanel.module.css';

interface DimensionPanelProps {
  answer:     BibleAnswer;
  shareSlug?: string;
}

const CONFIDENCE_LABELS = { high: 'High Confidence', medium: 'Moderate Confidence', low: 'Lower Confidence' };
const DIMENSION_COLORS: Record<DimensionKey, string> = {
  scripture:         'var(--dim-scripture)',
  historical:        'var(--dim-historical)',
  original_language: 'var(--dim-language)',
  theological:       'var(--dim-theological)',
  practical:         'var(--dim-practical)',
};

const DIMENSION_ICONS: Record<DimensionKey, any> = {
  scripture:         BookOpen,
  historical:        Landmark,
  original_language: Languages,
  theological:       Church,
  practical:         Heart,
};

export default function DimensionPanel({ answer, shareSlug }: DimensionPanelProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<DimensionKey>('scripture');
  const { bookmarked, loading: bookmarkLoading, toggle: toggleBookmark } = useBookmark(
    answer,
    shareSlug ?? null
  );

  const activeDim   = answer.dimensions[activeTab];
  const activeMeta  = DIMENSION_META.find((m) => m.key === activeTab)!;
  const accentColor = DIMENSION_COLORS[activeTab];
  const ActiveIcon  = DIMENSION_ICONS[activeTab];

  const shareUrl = shareSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareSlug}`
    : typeof window !== 'undefined' ? window.location.href : '';

  function handleCopyText() {
    const text = [
      `BibleDesk Answer: ${answer.question}`,
      '',
      answer.summary,
      '',
      ...DIMENSION_META.map((m) => {
        const dim = answer.dimensions[m.key];
        return `[${m.label}] ${dim.title}\n${dim.content}\n\nCitations: ${dim.citations.join(', ')}`;
      }),
      '',
      shareUrl ? shareUrl : '',
    ].filter(Boolean).join('\n\n');

    navigator.clipboard.writeText(text)
      .then(() => toast('Answer copied to clipboard'))
      .catch(() => toast('Could not copy — please copy manually', 'error'));
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast('Link copied to clipboard'))
      .catch(() => toast('Could not copy link', 'error'));
  }

  async function handleBookmark() {
    if (!shareSlug) {
      toast('Answer must be saved before bookmarking', 'error');
      return;
    }
    await toggleBookmark();
    toast(bookmarked ? 'Bookmark removed' : 'Bookmarked!');
  }

  function handleShareWhatsApp() {
    const formatted = formatBibleAnswerForWhatsApp(answer, shareUrl);
    const link = createWhatsAppShareLink(formatted);
    window.open(link, '_blank');
  }

  async function handleShareDiscord() {
    const webhookUrl = typeof window !== 'undefined' ? localStorage.getItem('bibledesk_discord_webhook') : null;
    if (!webhookUrl) {
      // Copy formatted Discord text
      const discordText = `**📖 BibleDesk Study:** "${answer.question}"\n\n> ${answer.summary}\n\n🔗 ${shareUrl}`;
      navigator.clipboard.writeText(discordText)
        .then(() => toast('Discord text copied! Configure Discord Webhook in Integrations to auto-post.'))
        .catch(() => toast('Could not copy Discord text', 'error'));
      return;
    }

    try {
      const res = await fetch('/api/discord/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, type: 'answer', answer }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast('Answer dispatched to Discord channel!');
      } else {
        toast(data.error || 'Failed to send to Discord', 'error');
      }
    } catch {
      toast('Network error sending to Discord', 'error');
    }
  }

  return (
    <div className={styles.container} role="region" aria-label="Bible study answer">
      {/* Summary */}
      <div className={styles.summary} aria-label="Answer summary">
        <div className={styles.summaryLabel}>Overview</div>
        <p className={styles.summaryText}>{answer.summary}</p>
        <div className={styles.summaryMeta}>
          <span className={`${styles.confidenceBadge} ${styles[`confidence${answer.confidence.charAt(0).toUpperCase() + answer.confidence.slice(1)}` as keyof typeof styles]}`}>
            {CONFIDENCE_LABELS[answer.confidence]}
          </span>
          <span className={styles.translationTag}>
            {answer.translation_used.toUpperCase()} translation
          </span>
          {shareSlug && (
            <a
              href={`/share/${shareSlug}`}
              className={styles.permalinkBadge}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Permanent link to this answer"
            >
              <LinkIcon size={12} style={{ marginRight: '4px' }} /> Permalink
            </a>
          )}
        </div>
      </div>

      {/* Dimension tabs (VisionOS Segmented Control) */}
      <div className={styles.tabBarContainer}>
        <div className={styles.tabBar} role="tablist" aria-label="Study dimensions">
          {DIMENSION_META.map((meta) => {
            const TabIcon = DIMENSION_ICONS[meta.key];
            const isTabActive = activeTab === meta.key;
            return (
              <button
                key={meta.key}
                role="tab"
                id={`tab-${meta.key}`}
                aria-selected={isTabActive}
                aria-controls={`panel-${meta.key}`}
                className={`${styles.tab} ${isTabActive ? styles.activeTab : ''}`}
                data-dim={meta.key}
                onClick={() => setActiveTab(meta.key)}
              >
                <TabIcon size={16} className={styles.tabIcon} />
                <span>{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active dimension panel */}
      <div
        key={activeTab}
        className={styles.panel}
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <div className={styles.panelHeader}>
          <div className={styles.dimIconWrap} style={{ background: `${accentColor}15`, color: accentColor }}>
            <ActiveIcon size={20} />
          </div>
          <div>
            <h2 className={styles.panelTitle} style={{ color: accentColor }}>
              {activeDim.title || activeMeta.label}
            </h2>
            <p className={styles.panelSubtitle}>
              {activeMeta.description}
            </p>
          </div>
        </div>

        {activeDim.key_points?.length > 0 && (
          <div className={styles.keyPoints} aria-label="Key points">
            {activeDim.key_points.map((point, i) => (
              <div key={i} className={styles.keyPoint}>
                <span className={styles.keyPointDot} style={{ backgroundColor: accentColor }} aria-hidden="true" />
                {point}
              </div>
            ))}
          </div>
        )}

        <p className={styles.panelContent}>{activeDim.content}</p>

        {activeDim.citations?.length > 0 && (
          <div className={styles.citations}>
            <div className={styles.citationsLabel}>Scripture References</div>
            {activeDim.citations.map((cite, i) => (
              <span key={i} className={styles.citation} title={cite}>{cite}</span>
            ))}
          </div>
        )}
      </div>

      {answer.disclaimer && (
        <div className={styles.disclaimer} role="note">
          <strong>Note: </strong>{answer.disclaimer}
        </div>
      )}

      {/* Share bar */}
      <div className={styles.shareBar} aria-label="Share options">
        <span className={styles.shareLabel}>Study Tools & Sharing</span>
        <div className={styles.shareActions}>
          {/* Bookmark toggle */}
          <button
            className={`${styles.shareBtn} ${bookmarked ? styles.shareBtnBookmarked : ''}`}
            onClick={handleBookmark}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this answer'}
            aria-pressed={bookmarked}
            disabled={bookmarkLoading}
            type="button"
          >
            {bookmarked ? <BookmarkCheck size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> : <Bookmark size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}
            {bookmarked ? 'Saved' : 'Save'}
          </button>

          <button
            className={styles.shareBtn}
            onClick={handleCopyText}
            aria-label="Copy full answer to clipboard"
            type="button"
          >
            <Copy size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Copy
          </button>

          {shareSlug && (
            <button
              className={`${styles.shareBtn} ${styles.shareBtnLink}`}
              onClick={handleCopyLink}
              aria-label="Copy shareable link"
              type="button"
            >
              <LinkIcon size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Copy link
            </button>
          )}

          {/* WhatsApp share */}
          <button
            className={styles.shareBtn}
            onClick={handleShareWhatsApp}
            aria-label="Share to WhatsApp"
            title="Forward to WhatsApp chat or study group"
            type="button"
          >
            <MessageSquare size={14} style={{ marginRight: '4px', verticalAlign: 'middle', color: '#25D366' }} />
            WhatsApp
          </button>

          {/* Discord share */}
          <button
            className={styles.shareBtn}
            onClick={handleShareDiscord}
            aria-label="Post to Discord channel"
            title="Post to connected Discord channel or copy Discord formatting"
            type="button"
          >
            <Radio size={14} style={{ marginRight: '4px', verticalAlign: 'middle', color: '#5865F2' }} />
            Discord
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              className={styles.shareBtn}
              onClick={() =>
                navigator.share({
                  title: `BibleDesk: ${answer.question}`,
                  text:  answer.summary,
                  url:   shareUrl,
                }).catch(() => {})
              }
              aria-label="Share via system share sheet"
              type="button"
            >
              <Share2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
