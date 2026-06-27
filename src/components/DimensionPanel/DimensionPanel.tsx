'use client';

import { useState } from 'react';
import type { BibleAnswer, DimensionKey } from '@/types';
import { DIMENSION_META } from '@/types';
import styles from './DimensionPanel.module.css';

interface DimensionPanelProps {
  answer: BibleAnswer;
}

const CONFIDENCE_LABELS = { high: 'High Confidence', medium: 'Moderate Confidence', low: 'Lower Confidence' };
const DIMENSION_COLORS: Record<DimensionKey, string> = {
  scripture:         'var(--dim-scripture)',
  historical:        'var(--dim-historical)',
  original_language: 'var(--dim-language)',
  theological:       'var(--dim-theological)',
  practical:         'var(--dim-practical)',
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function DimensionPanel({ answer }: DimensionPanelProps) {
  const [activeTab, setActiveTab] = useState<DimensionKey>('scripture');
  const [copied, setCopied] = useState(false);

  const activeDim = answer.dimensions[activeTab];
  const activeMeta = DIMENSION_META.find((m) => m.key === activeTab)!;
  const accentColor = DIMENSION_COLORS[activeTab];

  function handleCopy() {
    const text = [
      `BibleDesk Answer: ${answer.question}`,
      '',
      answer.summary,
      '',
      ...DIMENSION_META.map((m) => {
        const dim = answer.dimensions[m.key];
        return `${m.emoji} ${dim.title}\n${dim.content}\n\nCitations: ${dim.citations.join(', ')}`;
      }),
    ].join('\n\n');

    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={styles.container} role="region" aria-label="Bible study answer">
      {/* Summary */}
      <div className={styles.summary} aria-label="Answer summary">
        <div className={styles.summaryLabel}>✦ Overview</div>
        <p className={styles.summaryText}>{answer.summary}</p>
        <div className={styles.summaryMeta}>
          <span className={`${styles.confidenceBadge} ${styles[`confidence${answer.confidence.charAt(0).toUpperCase() + answer.confidence.slice(1)}` as keyof typeof styles]}`}>
            {CONFIDENCE_LABELS[answer.confidence]}
          </span>
          <span className={styles.translationTag}>
            {answer.translation_used.toUpperCase()} translation
          </span>
        </div>
      </div>

      {/* Dimension tabs */}
      <div
        className={styles.tabBar}
        role="tablist"
        aria-label="Study dimensions"
      >
        {DIMENSION_META.map((meta) => (
          <button
            key={meta.key}
            role="tab"
            id={`tab-${meta.key}`}
            aria-selected={activeTab === meta.key}
            aria-controls={`panel-${meta.key}`}
            className={`${styles.tab} ${activeTab === meta.key ? styles.activeTab : ''}`}
            data-dim={meta.key}
            onClick={() => setActiveTab(meta.key)}
          >
            <span className={styles.tabEmoji} aria-hidden="true">{meta.emoji}</span>
            {meta.label}
          </button>
        ))}
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
          <span className={styles.panelEmoji} aria-hidden="true">{activeMeta.emoji}</span>
          <h2 className={styles.panelTitle} style={{ color: accentColor }}>
            {activeDim.title}
          </h2>
        </div>

        {/* Key points */}
        {activeDim.key_points?.length > 0 && (
          <div className={styles.keyPoints} aria-label="Key points">
            {activeDim.key_points.map((point, i) => (
              <div key={i} className={styles.keyPoint}>
                <span
                  className={styles.keyPointDot}
                  style={{ backgroundColor: accentColor }}
                  aria-hidden="true"
                />
                {point}
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <p className={styles.panelContent}>{activeDim.content}</p>

        {/* Citations */}
        {activeDim.citations?.length > 0 && (
          <div className={styles.citations}>
            <div className={styles.citationsLabel}>Scripture References</div>
            {activeDim.citations.map((cite, i) => (
              <span key={i} className={styles.citation} title={cite}>
                {cite}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      {answer.disclaimer && (
        <div className={styles.disclaimer} role="note">
          <strong>Note: </strong>{answer.disclaimer}
        </div>
      )}

      {/* Share bar */}
      <div className={styles.shareBar} aria-label="Share options">
        <span className={styles.shareLabel}>Share this study</span>
        <div className={styles.shareActions}>
          <button
            className={styles.shareBtn}
            onClick={handleCopy}
            aria-label="Copy full answer to clipboard"
            type="button"
          >
            {copied ? '✓ Copied!' : '⎘ Copy'}
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              className={styles.shareBtn}
              onClick={() =>
                navigator.share({
                  title: `BibleDesk: ${answer.question}`,
                  text: answer.summary,
                  url: window.location.href,
                }).catch(() => {})
              }
              aria-label="Share via system share sheet"
              type="button"
            >
              ↗ Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
