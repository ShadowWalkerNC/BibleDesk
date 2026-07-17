'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header/Header';
import { getBrowserClient } from '@/lib/supabase';
import styles from './page.module.css';

interface PrayerRequest {
  id: string;
  user_id: string | null;
  display_name: string;
  request: string;
  likes_count: number;
  created_at: string;
}

export default function PrayerBoardPage() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [newRequest, setNewRequest] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Track which requests the user clicked "Prayed" for in this session to prevent spamming
  const [prayedSession, setPrayedSession] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // 1. Fetch user session to set default display name
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || '';
        setDisplayName(name);
      }
    });

    // 2. Fetch prayer requests
    fetchPrayers();
  }, []);

  async function fetchPrayers() {
    setLoading(true);
    try {
      const res = await fetch('/api/prayer');
      const data = await res.json();
      if (data.success) {
        setPrayers(data.prayers);
      }
    } catch (err) {
      console.error('Failed to fetch prayers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newRequest.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: newRequest,
          display_name: displayName || 'Anonymous Guest',
          anonymous,
          user_id: userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit request');

      setMessage({ text: 'Prayer request submitted successfully!', type: 'success' });
      setNewRequest('');
      
      // Prepend the new request locally so it displays instantly
      setPrayers([data.prayer, ...prayers]);
      
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to submit prayer request.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePray(id: string) {
    if (prayedSession[id]) return; // Limit to one click per session
    
    // Optimistic UI update
    setPrayers(prayers.map(p => p.id === id ? { ...p, likes_count: p.likes_count + 1 } : p));
    setPrayedSession({ ...prayedSession, [id]: true });

    try {
      await fetch('/api/prayer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error('Failed to register prayer increment:', err);
    }
  }

  // Format date helper (e.g. "Jul 17, 2026")
  function formatDate(dStr: string) {
    return new Date(dStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <>
      <Header />
      <main className={styles.mainContainer}>
        <div className={styles.grid}>
          {/* Left panel: Submission form */}
          <div className={styles.leftCol}>
            <div className={`${styles.formCard} glass-card`}>
              <h2 className={`${styles.formTitle} text-serif`}>Share a Prayer Request</h2>
              <p className={styles.formSubtitle}>
                Submit your request to our church community. You can post anonymously or share your name.
              </p>

              {message && (
                <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="display-name" className={styles.label}>Your Name</label>
                  <input
                    id="display-name"
                    type="text"
                    disabled={anonymous || submitting}
                    value={anonymous ? 'Anonymous' : displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Sarah Jenkins / Brother Thomas"
                    className={styles.input}
                  />
                </div>

                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="anon-toggle"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <label htmlFor="anon-toggle" className={styles.checkboxLabel}>Submit Anonymously</label>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="prayer-text" className={styles.label}>Your Request</label>
                  <textarea
                    id="prayer-text"
                    required
                    rows={5}
                    value={newRequest}
                    onChange={(e) => setNewRequest(e.target.value)}
                    placeholder="What can our community pray for? For healing, peace, guidance, family..."
                    className={styles.textarea}
                  />
                </div>

                <button type="submit" disabled={submitting || !newRequest.trim()} className={styles.submitBtn}>
                  {submitting ? 'Submitting...' : '🙏 Post Request'}
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Prayer Board feed */}
          <div className={styles.rightCol}>
            <div className={styles.boardHeader}>
              <h1 className={`${styles.title} text-serif`}>🙏 Church Prayer Board</h1>
              <p className={styles.subtitle}>
                "Bear one another's burdens, and so fulfill the law of Christ." — Galatians 6:2
              </p>
            </div>

            {loading ? (
              <div className={styles.loadingWrapper}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '140px', width: '100%', marginBottom: '1.25rem', borderRadius: '8px' }} />
                ))}
              </div>
            ) : prayers.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No prayer requests shared yet. Be the first to share one!</p>
              </div>
            ) : (
              <div className={styles.feed}>
                {prayers.map((p) => {
                  const hasPrayed = prayedSession[p.id];
                  return (
                    <div key={p.id} className={`${styles.prayerCard} glass-card`}>
                      <div className={styles.cardHeader}>
                        <span className={styles.author}>{p.display_name}</span>
                        <span className={styles.date}>{formatDate(p.created_at)}</span>
                      </div>
                      <p className={styles.requestText}>{p.request}</p>
                      
                      <div className={styles.cardFooter}>
                        <button
                          onClick={() => handlePray(p.id)}
                          className={`${styles.prayBtn} ${hasPrayed ? styles.prayBtnActive : ''}`}
                          title="Pray for this request"
                        >
                          <span className={styles.prayEmoji}>{hasPrayed ? '❤️' : '🙏'}</span>
                          {p.likes_count > 0 ? (
                            <span>{p.likes_count} {p.likes_count === 1 ? 'person' : 'people'} prayed for this</span>
                          ) : (
                            <span>Click to pray for this</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
