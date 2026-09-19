'use client';

import { useRef, useState } from 'react';
import { Printer, X, FileText } from 'lucide-react';
import styles from './StudyGuideModal.module.css';

interface StudyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: string;
  chapter: number;
  translation: string;
  verses: Array<{ verse: number; text: string }>;
  notes?: string;
  crossRefs?: Array<{ to: string }>;
  strongsData?: Array<{ code: string; lemma: string; definition: string }>;
}

export default function StudyGuideModal({
  isOpen,
  onClose,
  book,
  chapter,
  translation,
  verses,
  notes = '',
  crossRefs = [],
  strongsData = [],
}: StudyGuideModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeCrossRefs, setIncludeCrossRefs] = useState(true);
  const [includeStrongs, setIncludeStrongs] = useState(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header (Hidden when printing) */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleBox}>
            <FileText size={20} className={styles.titleIcon} />
            <div>
              <h2 className={styles.modalTitle}>Printable Passage Study Worksheet</h2>
              <p className={styles.modalSubtitle}>
                {book} {chapter} · {translation.toUpperCase()} Translation
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button onClick={handlePrint} className={styles.printBtn} title="Print or Save as PDF">
              <Printer size={16} />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Options Bar (Hidden when printing) */}
        <div className={styles.optionsBar}>
          <span className={styles.optionsLabel}>Include in Worksheet:</span>
          <label className={styles.optionCheck}>
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
            />
            <span>Personal Notes</span>
          </label>
          <label className={styles.optionCheck}>
            <input
              type="checkbox"
              checked={includeCrossRefs}
              onChange={(e) => setIncludeCrossRefs(e.target.checked)}
            />
            <span>Cross-References</span>
          </label>
          <label className={styles.optionCheck}>
            <input
              type="checkbox"
              checked={includeStrongs}
              onChange={(e) => setIncludeStrongs(e.target.checked)}
            />
            <span>Lexicon Insights</span>
          </label>
        </div>

        {/* Printable Worksheet Body */}
        <div className={styles.worksheetContent} ref={printAreaRef}>
          <header className={styles.sheetHeader}>
            <div className={styles.sheetMetaRow}>
              <span className={styles.sheetBrand}>BibleDesk Study Worksheet</span>
              <span className={styles.sheetDate}>{new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
            </div>
            <h1 className={`${styles.sheetPassageTitle} text-serif`}>
              {book} {chapter}
            </h1>
            <div className={styles.sheetBadge}>{translation.toUpperCase()} Public Domain Translation</div>
          </header>

          {/* Scripture Passage */}
          <section className={styles.sheetSection}>
            <h3 className={styles.sectionHeading}>Scripture Text</h3>
            <div className={styles.scriptureBody}>
              {verses.map((v) => (
                <span key={v.verse} className={styles.verseSpan}>
                  <sup className={styles.verseNumber}>{v.verse}</sup>
                  {v.text}{' '}
                </span>
              ))}
            </div>
          </section>

          {/* Cross References (Optional) */}
          {includeCrossRefs && crossRefs.length > 0 && (
            <section className={styles.sheetSection}>
              <h3 className={styles.sectionHeading}>Treasury of Scripture Knowledge (TSK) Cross-References</h3>
              <div className={styles.crossRefGrid}>
                {crossRefs.slice(0, 16).map((cr, idx) => (
                  <span key={idx} className={styles.crossRefPill}>
                    {cr.to}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Lexicon Insights (Optional) */}
          {includeStrongs && strongsData.length > 0 && (
            <section className={styles.sheetSection}>
              <h3 className={styles.sectionHeading}>Key Original-Language Lexicon Notes</h3>
              <div className={styles.lexiconList}>
                {strongsData.slice(0, 6).map((item, idx) => (
                  <div key={idx} className={styles.lexiconItem}>
                    <strong>{item.code} ({item.lemma})</strong>: {item.definition}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Personal Reflection Notes (Optional) */}
          {includeNotes && (
            <section className={styles.sheetSection}>
              <h3 className={styles.sectionHeading}>Personal Reflection &amp; Study Notes</h3>
              {notes ? (
                <div className={styles.notesText}>{notes}</div>
              ) : (
                <div className={styles.blankNotesLines}>
                  <div className={styles.blankLine} />
                  <div className={styles.blankLine} />
                  <div className={styles.blankLine} />
                  <div className={styles.blankLine} />
                </div>
              )}
            </section>
          )}

          {/* Footer */}
          <footer className={styles.sheetFooter}>
            <span>BibleDesk — Open Core &amp; Local-First Study Foundation</span>
            <span>Printed from bibledesk.app</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
