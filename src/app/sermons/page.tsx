'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header/Header';
import { getBrowserClient } from '@/lib/supabase';
import { BIBLE_BOOKS, getBookChapters } from '@/lib/books';
import { TRANSLATIONS, type TranslationId, type BibleVerse } from '@/types';
import styles from './page.module.css';

interface SermonOutline {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function SermonWorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Outline states
  const [outlines, setOutlines] = useState<SermonOutline[]>([]);
  const [selectedOutlineId, setSelectedOutlineId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Bible sidebar states
  const [sidebarBook, setSidebarBook] = useState('John');
  const [sidebarChapter, setSidebarChapter] = useState(3);
  const [sidebarTranslation, setSidebarTranslation] = useState<TranslationId>('web');
  const [sidebarVerses, setSidebarVerses] = useState<BibleVerse[]>([]);
  const [loadingBible, setLoadingBible] = useState(false);

  // UI feedback & view mode states
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function renderMarkdownPreview(markdown: string) {
    const lines = markdown.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className={styles.mdH1}>{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className={styles.mdH2}>{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className={styles.mdH3}>{line.slice(4)}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className={styles.mdLi}>{line.slice(2)}</li>;
      }
      if (line.startsWith('> ')) {
        return <blockquote key={idx} className={styles.mdQuote}>{line.slice(2)}</blockquote>;
      }
      if (!line.trim()) {
        return <div key={idx} style={{ height: '0.4rem' }} />;
      }
      return <p key={idx} className={styles.mdP}>{line}</p>;
    });
  }

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function fetchSidebarVerses() {
    setLoadingBible(true);
    try {
      const res = await fetch(`/api/bible/chapter?book=${encodeURIComponent(sidebarBook)}&chapter=${sidebarChapter}&translation=${sidebarTranslation}`);
      const data = await res.json();
      if (data.success) {
        setSidebarVerses(data.passage.verses);
      }
    } catch (err) {
      console.error('Failed to load sidebar scripture:', err);
    } finally {
      setLoadingBible(false);
    }
  }

  async function fetchOutlines(userId: string) {
    try {
      const res = await fetch(`/api/sermons?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.outlines.length > 0) {
        setOutlines(data.outlines);
        
        // Auto-select first outline if none selected
        const first = data.outlines[0];
        setSelectedOutlineId(first.id);
        setTitle(first.title);
        setContent(first.content);
      }
    } catch (err) {
      console.error('Failed to load outlines:', err);
    }
  }

  // 1. Session check
  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
      if (session?.user) {
        fetchOutlines(session.user.id);
      }
    });
  }, []);

  // 2. Fetch sidebar Bible text
  useEffect(() => {
    fetchSidebarVerses();
  }, [sidebarBook, sidebarChapter, sidebarTranslation]);


  // 3. Save outline
  async function handleSave(publishToDiscord = false) {
    if (!session?.user?.id) return;
    if (!title.trim() || !content.trim()) {
      showToast('Title and content are required.', 'error');
      return;
    }

    if (publishToDiscord) setPublishing(true);
    else setSaving(true);

    try {
      const res = await fetch('/api/sermons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOutlineId,
          user_id: session.user.id,
          title: title.trim(),
          content: content.trim(),
          publishToDiscord,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save outlines');

      showToast(publishToDiscord ? 'Published outline to Discord!' : 'Outline saved successfully!');

      // Refresh outlines list
      const updatedOutlines = selectedOutlineId
        ? outlines.map(o => o.id === selectedOutlineId ? data.outline : o)
        : [data.outline, ...outlines];
      
      setOutlines(updatedOutlines);
      setSelectedOutlineId(data.outline.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to save outlines.', 'error');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  // 4. Create new outline locally
  function handleNewOutline() {
    setSelectedOutlineId(null);
    setTitle('Untitled Sermon Outline');
    setContent('# Introduction\n\n- Hook: \n- Key Text: \n\n# Body Points\n\n## Point 1: \n- Scripture: \n- Illustration: \n\n# Conclusion\n\n- Call to action: ');
    showToast('Created new outline workspace!');
  }

  // 5. Delete outline
  async function handleDelete() {
    if (!selectedOutlineId || !session?.user?.id) return;
    if (!confirm('Are you sure you want to delete this sermon outline?')) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/sermons?id=${selectedOutlineId}&userId=${session.user.id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete outline');

      showToast('Outline deleted.');
      
      const filtered = outlines.filter(o => o.id !== selectedOutlineId);
      setOutlines(filtered);

      if (filtered.length > 0) {
        setSelectedOutlineId(filtered[0].id);
        setTitle(filtered[0].title);
        setContent(filtered[0].content);
      } else {
        setSelectedOutlineId(null);
        setTitle('');
        setContent('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete outlines.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  // Switch workspace target
  function handleSelectOutline(id: string) {
    const o = outlines.find(x => x.id === id);
    if (o) {
      setSelectedOutlineId(o.id);
      setTitle(o.title);
      setContent(o.content);
    }
  }

  // 6. e-Sword Helper: Insert Scripture directly into outline content at cursor location
  function handleInsertScripture(verse: BibleVerse) {
    const quote = `\n> "${verse.text.trim()}" — ${verse.book_name} ${verse.chapter}:${verse.verse} (${sidebarTranslation.toUpperCase()})\n`;
    
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback: append to the end of outlines
      setContent(content + quote);
      showToast('Verse inserted.');
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentText = textarea.value;

    // Insert at selection/cursor index
    const updatedText = currentText.substring(0, startPos) + quote + currentText.substring(endPos);
    setContent(updatedText);

    // Refocus and place cursor after inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + quote.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);

    showToast('Verse inserted at cursor!');
  }

  const sidebarMaxChapters = getBookChapters(sidebarBook);

  if (checkingSession) {
    return (
      <>
        <Header />
        <div className={styles.loadingScreen}>
          <div className="skeleton" style={{ height: '30px', width: '200px', marginBottom: '20px' }} />
          <div className="skeleton" style={{ height: '300px', width: '100%' }} />
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Header />
        <main className={styles.authGate}>
          <div className={`${styles.authGateCard} glass-card`}>
            <h2 className="text-serif">Sermon Workspace Prep</h2>
            <p>
              Please sign in to access your study outlines, sermon workspace, and sync scriptures directly into your journals.
            </p>
            <button onClick={() => router.push('/login')} className={styles.loginBtn}>
              Sign In to Workspace
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`} role="alert">
          {toast.message}
        </div>
      )}

      <main className={styles.mainContainer}>
        <div className={styles.splitGrid}>
          
          {/* Left panel: Editor workspace */}
          <div className={`${styles.editorCol} glass-card`}>
            
            {/* Outline Selector bar */}
            <div className={styles.editorNav}>
              <div className={styles.outlineSelectGroup}>
                <label htmlFor="outline-select" className={styles.selectLabel}>Workspace Drafts</label>
                <select
                  id="outline-select"
                  value={selectedOutlineId || ''}
                  onChange={(e) => handleSelectOutline(e.target.value)}
                  className={styles.select}
                  disabled={outlines.length === 0}
                >
                  {outlines.length === 0 ? (
                    <option value="">No outlines found</option>
                  ) : (
                    outlines.map(o => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))
                  )}
                </select>
              </div>

              <div className={styles.navActions}>
                <button onClick={handleNewOutline} className={styles.secondaryBtn}>
                  New Outline
                </button>
                {selectedOutlineId && (
                  <button onClick={handleDelete} disabled={deleting} className={styles.deleteBtn}>
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Title */}
            <div className={styles.titleGroup}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sermon Title / Outline Subject..."
                className={styles.titleInput}
              />
            </div>

            {/* Markdown Text Editor & Live Preview */}
            <div className={styles.textareaWrapper}>
              {(viewMode === 'edit' || viewMode === 'split') && (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Compose your sermon outline or study journal here... Use # headers for points. Click the sidebar to insert scriptures directly."
                  className={styles.editorTextarea}
                />
              )}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={styles.markdownPreview}>
                  {content ? (
                    renderMarkdownPreview(content)
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Markdown preview will appear here...</span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className={styles.editorFooter}>
              <div className={styles.viewModeToggle}>
                <button
                  type="button"
                  className={`${styles.viewModeBtn} ${viewMode === 'edit' ? styles.viewModeBtnActive : ''}`}
                  onClick={() => setViewMode('edit')}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`${styles.viewModeBtn} ${viewMode === 'split' ? styles.viewModeBtnActive : ''}`}
                  onClick={() => setViewMode('split')}
                >
                  Split View
                </button>
                <button
                  type="button"
                  className={`${styles.viewModeBtn} ${viewMode === 'preview' ? styles.viewModeBtnActive : ''}`}
                  onClick={() => setViewMode('preview')}
                >
                  Preview
                </button>
              </div>
              <div className={styles.footerBtns}>
                <button onClick={() => handleSave(false)} disabled={saving} className={styles.saveBtn}>
                  {saving ? 'Saving...' : 'Save Outline'}
                </button>
                <button onClick={() => handleSave(true)} disabled={publishing} className={styles.publishBtn}>
                  {publishing ? 'Publishing...' : 'Publish to Discord'}
                </button>
              </div>
            </div>

          </div>

          {/* Right panel: e-Sword Scripture Sidebar */}
          <div className={`${styles.bibleCol} glass-card`}>
            <div className={styles.sidebarHeader}>
              <h2 className={`${styles.sidebarTitle} text-serif`}>e-Sword Scripture Sidebar</h2>
              
              {/* Dropdowns */}
              <div className={styles.sidebarSelectors}>
                <select
                  value={sidebarBook}
                  onChange={(e) => {
                    setSidebarBook(e.target.value);
                    setSidebarChapter(1);
                  }}
                  className={styles.selectSmall}
                >
                  {BIBLE_BOOKS.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>

                <select
                  value={sidebarChapter}
                  onChange={(e) => setSidebarChapter(Number(e.target.value))}
                  className={styles.selectSmall}
                >
                  {Array.from({ length: sidebarMaxChapters }, (_, i) => i + 1).map(ch => (
                    <option key={ch} value={ch}>{ch}</option>
                  ))}
                </select>

                <select
                  value={sidebarTranslation}
                  onChange={(e) => setSidebarTranslation(e.target.value as TranslationId)}
                  className={styles.selectSmall}
                >
                  {TRANSLATIONS.map(t => (
                    <option key={t.id} value={t.id}>{t.id.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable list of verses */}
            <div className={styles.sidebarFeed}>
              {loadingBible ? (
                <div className={styles.sidebarLoading}>
                  <div className="skeleton" style={{ height: '20px', width: '100%', marginBottom: '10px' }} />
                  <div className="skeleton" style={{ height: '20px', width: '100%', marginBottom: '10px' }} />
                  <div className="skeleton" style={{ height: '20px', width: '100%', marginBottom: '10px' }} />
                </div>
              ) : (
                <div className={styles.versesContainer}>
                  {sidebarVerses.map(v => (
                    <div key={v.verse} className={styles.verseRow}>
                      <div className={styles.verseHeader}>
                        <span className={styles.verseNumber}>{v.verse}</span>
                        <button
                          onClick={() => handleInsertScripture(v)}
                          className={styles.insertBtn}
                          title="Insert this verse into the current cursor position in your outline"
                        >
                          ➕ Insert
                        </button>
                      </div>
                      <p className={`${styles.verseText} text-serif`}>{v.text.trim()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
