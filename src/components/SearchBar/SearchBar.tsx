'use client';

import { useState, useRef, FormEvent } from 'react';
import { TRANSLATIONS, type TranslationId } from '@/types';
import styles from './SearchBar.module.css';

const EXAMPLE_QUESTIONS = [
  "What does the Bible say about forgiveness?",
  "Who was King David and why is he important?",
  "What is the meaning of John 3:16?",
  "How should Christians handle anxiety and worry?",
  "What does Proverbs say about wisdom?",
  "What happened at Pentecost?",
];

interface SearchBarProps {
  onSubmit: (question: string, translation: TranslationId) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function SearchBar({ onSubmit, isLoading, placeholder }: SearchBarProps) {
  const [question,    setQuestion]    = useState('');
  const [translation, setTranslation] = useState<TranslationId>('web');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX = 500;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || isLoading) return;
    onSubmit(q, translation);
  }

  function useExample(q: string) {
    setQuestion(q);
    textareaRef.current?.focus();
  }

  const remaining = MAX - question.length;
  const isWarn    = remaining < 80;

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleSubmit} className={styles.form} aria-label="Bible study question form">
        <div className={styles.inputRow}>
          <div className={styles.textareaWrapper}>
            <textarea
              ref={textareaRef}
              id="bible-question"
              className={styles.textarea}
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, MAX))}
              placeholder={placeholder || "Ask anything about the Bible… What does God say about forgiveness? Who wrote the Psalms? What is the Great Commission?"}
              rows={3}
              maxLength={MAX}
              aria-label="Your Bible question"
              aria-describedby="question-hint"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e as unknown as FormEvent);
              }}
            />
            <span className={`${styles.charCount} ${isWarn ? styles.warn : ''}`} aria-live="polite">
              {remaining}
            </span>
          </div>
        </div>

        <div className={styles.controls}>
          {/* Translation pill switcher */}
          <div className={styles.translationRow} role="group" aria-label="Bible translation">
            <span className={styles.translationLabel}>Translation</span>
            <div className={styles.translationPills}>
              {TRANSLATIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.translationPill} ${translation === t.id ? styles.translationPillActive : ''}`}
                  onClick={() => setTranslation(t.id)}
                  disabled={isLoading}
                  aria-pressed={translation === t.id}
                  title={t.name}
                >
                  {t.id.toUpperCase()}
                </button>
              ))}
            </div>
            <span className={styles.translationName}>
              {TRANSLATIONS.find((t) => t.id === translation)?.name}
            </span>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || question.trim().length < 5}
            aria-label={isLoading ? 'Generating answer…' : 'Study this question'}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                Studying…
              </>
            ) : (
              <>✦ Study This</>
            )}
          </button>
        </div>
      </form>

      <div className={styles.examples} aria-label="Example questions">
        <p className={styles.examplesLabel} id="question-hint">Try asking:</p>
        <div className={styles.exampleChips} role="list">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              role="listitem"
              className={styles.chip}
              onClick={() => useExample(q)}
              type="button"
              disabled={isLoading}
              aria-label={`Use example: ${q}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
