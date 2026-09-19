'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  BookOpen,
  Landmark,
  Languages,
  Church,
  Heart,
  ExternalLink,
  BookmarkPlus,
  FolderPlus,
  HelpCircle,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/Toast/Toast';
import type { FiveDimensionEvidence, ConfidenceAssessment, SourceCitation } from '@/lib/evidence';
import styles from './ResearchAssistant.module.css';

interface ResearchAssistantProps {
  initialVerseRef?: string;
  onSaveToNotes?: (finding: any) => void;
}

const SUGGESTED_QUERIES = [
  'Historical background and meaning of Logos in John 1:1',
  'Cultural context of the Samaritan woman at Jacob\'s well in John 4',
  'What did Jesus mean by "born again" (anōthen) in John 3:3?',
  'Old Testament sacrificial imagery connected to Hebrews 9',
  'Meaning of "faith" (pistis) and works in James 2 vs Romans 4',
];

const DIMENSION_TABS = [
  { key: 'scripture', label: '1. Scripture', icon: BookOpen },
  { key: 'historical', label: '2. Historical', icon: Landmark },
  { key: 'original_language', label: '3. Original Language', icon: Languages },
  { key: 'theological', label: '4. Theological', icon: Church },
  { key: 'practical', label: '5. Practical', icon: Heart },
] as const;

export default function ResearchAssistant({ initialVerseRef, onSaveToNotes }: ResearchAssistantProps) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [verseRef, setVerseRef] = useState(initialVerseRef || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialVerseRef) {
      setVerseRef(initialVerseRef);
    }
  }, [initialVerseRef]);

  const [activeTab, setActiveTab] = useState<keyof FiveDimensionEvidence>('scripture');
  const [showDerivation, setShowDerivation] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [savedCollection, setSavedCollection] = useState(false);

  // Result state
  const [finding, setFinding] = useState<{
    id: string;
    query: string;
    verseRef?: string;
    summary: string;
    dimensions: FiveDimensionEvidence;
    confidence: 'high' | 'medium' | 'low';
    confidenceScore: number;
    confidenceDerivation: ConfidenceAssessment;
    sources: SourceCitation[];
  } | null>(null);

  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    setSavedNote(false);
    setSavedCollection(false);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          verseRef: verseRef.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Research failed to complete');
      }

      setFinding(data.finding);
      setActiveTab('scripture');
    } catch (err: any) {
      console.error('Research error:', err);
      setError(err.message || 'An error occurred during research');
      toast('Research query failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveNote() {
    if (!finding) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verseRef: finding.verseRef || 'Research',
          title: `Research: ${finding.query.slice(0, 50)}...`,
          content: `${finding.summary}\n\nKey Finding (${finding.confidence.toUpperCase()} Confidence):\n${finding.dimensions[activeTab].content}`,
          tags: ['research', 'scholarly', finding.confidence],
        }),
      });

      if (res.ok) {
        setSavedNote(true);
        toast('Saved to Personal Study Notes!');
        if (onSaveToNotes) onSaveToNotes(finding);
      }
    } catch {
      toast('Could not save note', 'error');
    }
  }

  async function handleAddToCollection() {
    if (!finding) return;
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          collectionId: 'coll_christology_01', // default collection
          itemType: 'research',
          itemRef: finding.id,
          notes: finding.summary,
        }),
      });

      if (res.ok) {
        setSavedCollection(true);
        toast('Added to Study Collection!');
      }
    } catch {
      toast('Could not add to collection', 'error');
    }
  }

  return (
    <div className={styles.container} role="region" aria-label="Research Assistant">
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <Sparkles size={22} className={styles.titleIcon} />
          <div>
            <h2 className={styles.title}>Theological Research Assistant</h2>
            <div className={styles.subtitle}>
              Evidence-based scholarship scored across 5 hermeneutical dimensions with verified sources.
            </div>
          </div>
        </div>
      </div>

      <form
        className={styles.searchForm}
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <div className={styles.inputGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder="Ask a scholarly or theological question (e.g. Logos background, historical context)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className={styles.searchBtn} disabled={isLoading || !query.trim()}>
            <Search size={16} />
            <span>{isLoading ? 'Synthesizing evidence…' : 'Investigate Question'}</span>
          </button>
        </div>

        <div className={styles.chipsRow}>
          <span className={styles.chipsLabel}>Suggested:</span>
          {SUGGESTED_QUERIES.map((sq, i) => (
            <button
              key={i}
              type="button"
              className={styles.chip}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              disabled={isLoading}
            >
              {sq}
            </button>
          ))}
        </div>
      </form>

      {isLoading && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary, #574d3b)', fontWeight: 600 }}>
            Gathering literature &amp; computing 5-dimension confidence rating…
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSearch()}
            style={{ padding: '4px 10px', background: '#ffffff', border: '1px solid #f87171', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, color: '#991b1b', cursor: 'pointer' }}
          >
            Retry Investigation
          </button>
        </div>
      )}

      {finding && (
        <div className={styles.resultCard}>
          <div className={styles.resultMetaRow}>
            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary, #1e1913)' }}>
                {finding.query}
              </strong>
              {finding.verseRef && (
                <div style={{ fontSize: '0.84rem', color: 'var(--gold-700, #966c0e)', fontWeight: 600 }}>
                  Passage Anchor: {finding.verseRef}
                </div>
              )}
            </div>

            <button
              type="button"
              className={`${styles.confidenceBadge} ${
                styles[`confidence${finding.confidence.charAt(0).toUpperCase() + finding.confidence.slice(1)}` as keyof typeof styles]
              }`}
              onClick={() => setShowDerivation(!showDerivation)}
              title="Click to view confidence rating derivation"
            >
              <span>{finding.confidenceDerivation?.label || `${finding.confidence.toUpperCase()} Confidence`}</span>
              <HelpCircle size={14} />
            </button>
          </div>

          {/* Derivation Popover */}
          {showDerivation && finding.confidenceDerivation && (
            <div className={styles.derivationPopover}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary, #1e1913)' }}>
                  How this {finding.confidenceDerivation.label} was derived:
                </strong>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gold-700, #966c0e)' }}>
                  Composite Score: {Math.round(finding.confidenceDerivation.score * 100)}%
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #574d3b)', margin: '0.5rem 0' }}>
                {finding.confidenceDerivation.rationale}
              </p>

              <div className={styles.factorsList}>
                <div className={styles.factorItem}>
                  <span>Scripture Grounding (30% weight)</span>
                  <div className={styles.factorBar}>
                    <div
                      className={styles.factorFill}
                      style={{ width: `${(finding.confidenceDerivation.factorScores.scriptureGrounding || 0) * 100}%` }}
                    />
                  </div>
                </div>
                <div className={styles.factorItem}>
                  <span>Lexical &amp; Original Language (20% weight)</span>
                  <div className={styles.factorBar}>
                    <div
                      className={styles.factorFill}
                      style={{ width: `${(finding.confidenceDerivation.factorScores.lexicalBacking || 0) * 100}%` }}
                    />
                  </div>
                </div>
                <div className={styles.factorItem}>
                  <span>Historical &amp; Cultural Horizon (20% weight)</span>
                  <div className={styles.factorBar}>
                    <div
                      className={styles.factorFill}
                      style={{ width: `${(finding.confidenceDerivation.factorScores.historicalContext || 0) * 100}%` }}
                    />
                  </div>
                </div>
                <div className={styles.factorItem}>
                  <span>Theological Coherence (15% weight)</span>
                  <div className={styles.factorBar}>
                    <div
                      className={styles.factorFill}
                      style={{ width: `${(finding.confidenceDerivation.factorScores.theologicalCoherence || 0) * 100}%` }}
                    />
                  </div>
                </div>
                <div className={styles.factorItem}>
                  <span>Source Traceability (15% weight)</span>
                  <div className={styles.factorBar}>
                    <div
                      className={styles.factorFill}
                      style={{ width: `${(finding.confidenceDerivation.factorScores.sourceTraceability || 0) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.summaryBox}>
            <strong>Executive Synthesis:</strong> {finding.summary}
          </div>

          {/* 5-Dimension Tabs */}
          <div className={styles.dimensionTabs} role="tablist">
            {DIMENSION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.dimTab} ${isActive ? styles.dimTabActive : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Dimension Content */}
          {finding.dimensions[activeTab] && (
            <div className={styles.dimContent}>
              <div className={styles.dimTitle}>{finding.dimensions[activeTab].title}</div>
              <div className={styles.dimBody}>{finding.dimensions[activeTab].content}</div>

              {finding.dimensions[activeTab].key_points?.length > 0 && (
                <ul className={styles.keyPoints}>
                  {finding.dimensions[activeTab].key_points.map((kp, i) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              )}

              {finding.dimensions[activeTab].citations?.length > 0 && (
                <div className={styles.citationsRow}>
                  <span>Citations:</span>
                  {finding.dimensions[activeTab].citations.map((c, i) => (
                    <span key={i} className={styles.citationTag}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Traceable Sources */}
          {finding.sources?.length > 0 && (
            <div className={styles.sourcesSection}>
              <div className={styles.sourcesTitle}>Verified &amp; Traceable Literature Sources</div>
              <div className={styles.sourcesList}>
                {finding.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceItem}
                  >
                    <ExternalLink size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--gold-600, #b58414)' }} />
                    <div>
                      <div className={styles.sourceItemTitle}>{s.title}</div>
                      {s.snippet && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #6b6355)', marginTop: '0.2rem' }}>{s.snippet}</div>}
                      <div className={styles.sourceItemUrl}>{s.url}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleSaveNote}
              disabled={savedNote}
            >
              {savedNote ? <Check size={14} color="#0b7a54" /> : <BookmarkPlus size={14} />}
              <span>{savedNote ? 'Saved in Notes' : 'Save to Study Notes'}</span>
            </button>

            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleAddToCollection}
              disabled={savedCollection}
            >
              {savedCollection ? <Check size={14} color="#0b7a54" /> : <FolderPlus size={14} />}
              <span>{savedCollection ? 'Added to Collection' : 'Add to Collection'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
