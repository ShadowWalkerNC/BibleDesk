'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BIBLE_BOOKS, getBookChapters, parseReference } from '@/lib/books';
import styles from './QuickJumpModal.module.css';

interface QuickJumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (book: string, chapter: number, verse?: number) => void;
}

export default function QuickJumpModal({ isOpen, onClose, onSelect }: QuickJumpModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [filterTestament, setFilterTestament] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedBook(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or custom event
          document.dispatchEvent(new CustomEvent('bibledesk:open-quick-jump'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredBooks = BIBLE_BOOKS.filter((b) => {
    if (filterTestament !== 'ALL' && b.testament !== filterTestament) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return b.name.toLowerCase().includes(q);
  });

  const handleBookClick = (bookName: string) => {
    setSelectedBook(bookName);
  };

  const handleChapterClick = (bookName: string, chapterNum: number) => {
    if (onSelect) {
      onSelect(bookName, chapterNum);
    } else {
      router.push(`/bible?book=${encodeURIComponent(bookName)}&chapter=${chapterNum}`);
    }
    onClose();
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    // Check if query is a direct reference like "Rom 8", "John 3:16", "Gen 1"
    const parsed = parseReference(clean);
    if (parsed) {
      const match = BIBLE_BOOKS.find(
        (b) => b.name.toLowerCase() === parsed.book.toLowerCase() || b.name.toLowerCase().startsWith(parsed.book.toLowerCase())
      );
      if (match) {
        const ch = Math.min(Math.max(1, parsed.chapter), match.chapters);
        if (onSelect) {
          onSelect(match.name, ch, parsed.startVerse);
        } else {
          router.push(`/bible?book=${encodeURIComponent(match.name)}&chapter=${ch}${parsed.startVerse ? `&verse=${parsed.startVerse}` : ''}`);
        }
        onClose();
        return;
      }
    }

    // If first filtered book exists
    if (filteredBooks.length > 0) {
      setSelectedBook(filteredBooks[0].name);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-label="Quick Jump to Scripture">
      <div className={`${styles.modal} glass-card`} onClick={(e) => e.stopPropagation()}>
        {/* Header Search Input */}
        <div className={styles.modalHeader}>
          <div className={styles.searchBar}>
            <span className={styles.searchIcon}>📖</span>
            <form onSubmit={handleDirectSubmit} className={styles.form}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selectedBook) setSelectedBook(null);
                }}
                placeholder="Type book or passage (e.g. John 3:16, Rom 8, Psalms)..."
                className={styles.input}
              />
            </form>
            <span className={styles.escBadge} onClick={onClose}>ESC</span>
          </div>

          {/* Testament Filters */}
          <div className={styles.filterRow}>
            <button
              className={`${styles.filterBtn} ${filterTestament === 'ALL' ? styles.filterActive : ''}`}
              onClick={() => setFilterTestament('ALL')}
            >
              All 66 Books
            </button>
            <button
              className={`${styles.filterBtn} ${filterTestament === 'OT' ? styles.filterActive : ''}`}
              onClick={() => setFilterTestament('OT')}
            >
              Old Testament (39)
            </button>
            <button
              className={`${styles.filterBtn} ${filterTestament === 'NT' ? styles.filterActive : ''}`}
              onClick={() => setFilterTestament('NT')}
            >
              New Testament (27)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {selectedBook ? (
            <div className={styles.chaptersView}>
              <div className={styles.chapterHeader}>
                <button onClick={() => setSelectedBook(null)} className={styles.backBtn}>
                  ← All Books
                </button>
                <h3 className={styles.selectedBookTitle}>{selectedBook}</h3>
                <span className={styles.chaptersCount}>
                  {getBookChapters(selectedBook)} Chapters
                </span>
              </div>
              <div className={styles.chaptersGrid}>
                {Array.from({ length: getBookChapters(selectedBook) }, (_, i) => i + 1).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => handleChapterClick(selectedBook, ch)}
                    className={styles.chapterCell}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.booksGrid}>
              {filteredBooks.length > 0 ? (
                filteredBooks.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => handleBookClick(b.name)}
                    className={styles.bookCard}
                  >
                    <div className={styles.bookName}>{b.name}</div>
                    <div className={styles.bookMeta}>
                      <span>{b.testament}</span>
                      <span>{b.chapters} chs</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className={styles.noResults}>
                  <p>No books match &quot;{query}&quot;</p>
                  <span>Press Enter to perform a direct passage search.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className={styles.modalFooter}>
          <div className={styles.hint}>
            <kbd>Ctrl</kbd> + <kbd>K</kbd> to open anywhere · <kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>↵</kbd> to select
          </div>
        </div>
      </div>
    </div>
  );
}
