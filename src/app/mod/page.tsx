'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import styles from './page.module.css';
import { getBrowserClient } from '@/lib/supabase';

interface FlagItem {
  id: string;
  created_at: string;
  reason: string;
  question_id: string;
  answer: {
    id: string;
    body: string;
    dimension: string;
    source: string;
    status: string;
  };
  votes: {
    accurate: number;
    inaccurate: number;
    total: number;
  };
}

type VoteValue = 'accurate' | 'inaccurate';
type Tab = 'queue' | 'approve' | 'invite';

async function getToken(): Promise<string | null> {
  try {
    const supabase = getBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<{ data: T | null; error: string | null }> {
  const token = await getToken();

  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: json.error ?? `HTTP ${res.status}` };
    }

    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

const DIM_COLORS: Record<string, string> = {
  scripture: 'var(--dim-scripture)',
  historical: 'var(--dim-historical)',
  language: 'var(--dim-language)',
  theological: 'var(--dim-theological)',
  practical: 'var(--dim-practical)',
};

function dimColor(d: string) {
  return DIM_COLORS[d.toLowerCase()] ?? 'var(--text-secondary)';
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function FlagCard({ flag, onVoted }: { flag: FlagItem; onVoted: (id: string) => void }) {
  const [vote, setVote] = useState<VoteValue | ''>('');
  const [correction, setCorrection] = useState('');
  const [refs, setRefs] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleVote(e: FormEvent) {
    e.preventDefault();
    if (!vote) return;

    setSubmitting(true);
    setFeedback(null);

    const { error } = await apiFetch('/api/mod/vote', {
      method: 'POST',
      body: JSON.stringify({
        flagId: flag.id,
        vote,
        correction: correction.trim() || undefined,
        scriptureRefs: refs.split(',').map((r) => r.trim()).filter(Boolean),
      }),
    });

    setSubmitting(false);

    if (error) {
      setFeedback({ ok: false, msg: error });
    } else {
      setFeedback({ ok: true, msg: 'Vote recorded.' });
      setTimeout(() => onVoted(flag.id), 800);
    }
  }

  return (
    <article className={styles.flagCard}>
      <header className={styles.flagCardHeader}>
        <span className={styles.dimBadge} style={{ color: dimColor(flag.answer.dimension) }}>
          {flag.answer.dimension}
        </span>
        <span className={styles.flagReason}>⚠️ {flag.reason}</span>
        <time className={styles.flagTime}>{relativeTime(flag.created_at)}</time>
      </header>

      <div className={styles.answerBody}>
        <p>{flag.answer.body}</p>
        {flag.answer.source && <p className={styles.answerSource}>Source: {flag.answer.source}</p>}
      </div>

      {flag.votes.total > 0 && (
        <div className={styles.voteTally}>
          <span className={styles.voteAccurate}>✔ {flag.votes.accurate} accurate</span>
          <span className={styles.voteInaccurate}>✘ {flag.votes.inaccurate} inaccurate</span>
          <span className={styles.voteTotal}>of {flag.votes.total} vote{flag.votes.total !== 1 ? 's' : ''}</span>
        </div>
      )}

      <form className={styles.voteForm} onSubmit={handleVote}>
        <div className={styles.voteButtons}>
          <button
            type="button"
            className={`${styles.voteBtn} ${styles.voteBtnAccurate} ${vote === 'accurate' ? styles.voteBtnActive : ''}`}
            onClick={() => setVote('accurate')}
          >
            ✔ Accurate
          </button>
          <button
            type="button"
            className={`${styles.voteBtn} ${styles.voteBtnInaccurate} ${vote === 'inaccurate' ? styles.voteBtnActive : ''}`}
            onClick={() => setVote('inaccurate')}
          >
            ✘ Inaccurate
          </button>
        </div>

        {vote === 'inaccurate' && (
          <>
            <textarea
              className={styles.correctionInput}
              placeholder="Correction or note (optional)"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              rows={3}
            />
            <input
              className={styles.refsInput}
              type="text"
              placeholder="Scripture refs (comma-separated, optional)"
              value={refs}
              onChange={(e) => setRefs(e.target.value)}
            />
          </>
        )}

        {feedback && <p className={feedback.ok ? styles.feedbackOk : styles.feedbackErr}>{feedback.msg}</p>}

        <button type="submit" className={styles.submitVoteBtn} disabled={!vote || submitting}>
          {submitting ? 'Submitting…' : 'Submit Vote'}
        </button>
      </form>
    </article>
  );
}

function ApprovePanel() {
  const [flagId, setFlagId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleApprove(e: FormEvent) {
    e.preventDefault();
    if (!flagId.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    const { error } = await apiFetch('/api/mod/approve', {
      method: 'POST',
      body: JSON.stringify({ flagId: flagId.trim() }),
    });

    setSubmitting(false);

    if (error) {
      setFeedback({ ok: false, msg: error });
    } else {
      setFeedback({ ok: true, msg: 'Answer promoted to canonical.' });
      setFlagId('');
    }
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>📜 Force Approve Answer</h2>
      <p className={styles.panelDesc}>
        Bypasses vote threshold and immediately promotes the flagged answer to canonical. Admin only.
      </p>
      <form className={styles.simpleForm} onSubmit={handleApprove}>
        <label className={styles.fieldLabel} htmlFor="approve-flag-id">
          Flag ID
        </label>
        <input
          id="approve-flag-id"
          className={styles.textInput}
          type="text"
          placeholder="e.g. f7a3c1e2-..."
          value={flagId}
          onChange={(e) => setFlagId(e.target.value)}
          required
        />
        {feedback && <p className={feedback.ok ? styles.feedbackOk : styles.feedbackErr}>{feedback.msg}</p>}
        <button type="submit" className={styles.primaryBtn} disabled={!flagId.trim() || submitting}>
          {submitting ? 'Promoting…' : 'Promote to Canonical'}
        </button>
      </form>
    </section>
  );
}

function InvitePanel() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'moderator' | 'admin'>('moderator');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const { error } = await apiFetch('/api/mod/invite', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), name: name.trim(), role }),
    });

    setSubmitting(false);

    if (error) {
      setFeedback({ ok: false, msg: error });
    } else {
      setFeedback({ ok: true, msg: `Invite sent to ${email}.` });
      setEmail('');
      setName('');
      setRole('moderator');
    }
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>📧 Invite Moderator</h2>
      <p className={styles.panelDesc}>
        Sends a Supabase magic-link invite and creates a moderator record. Admin only.
      </p>
      <form className={styles.simpleForm} onSubmit={handleInvite}>
        <label className={styles.fieldLabel} htmlFor="invite-name">
          Full Name
        </label>
        <input
          id="invite-name"
          className={styles.textInput}
          type="text"
          placeholder="Jane Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <label className={styles.fieldLabel} htmlFor="invite-email">
          Email Address
        </label>
        <input
          id="invite-email"
          className={styles.textInput}
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className={styles.fieldLabel} htmlFor="invite-role">
          Role
        </label>
        <select
          id="invite-role"
          className={styles.selectInput}
          value={role}
          onChange={(e) => setRole(e.target.value as 'moderator' | 'admin')}
        >
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        {feedback && <p className={feedback.ok ? styles.feedbackOk : styles.feedbackErr}>{feedback.msg}</p>}
        <button type="submit" className={styles.primaryBtn} disabled={!email.trim() || !name.trim() || submitting}>
          {submitting ? 'Sending…' : 'Send Invite'}
        </button>
      </form>
    </section>
  );
}

export default function ModDashboard() {
  const [tab, setTab] = useState<Tab>('queue');
  const [queue, setQueue] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setQueueError(null);

    const { data, error } = await apiFetch<{ success: boolean; queue: FlagItem[] }>('/api/mod/queue');

    setLoading(false);

    if (error) {
      if (error.toLowerCase().includes('unauthorized') || error.includes('401')) {
        setAuthed(false);
      } else {
        setQueueError(error);
        setAuthed(true);
      }
    } else {
      setAuthed(true);
      setQueue(data?.queue ?? []);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  function removeFlag(id: string) {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  }

  if (authed === false) {
    return (
      <main className={styles.accessDenied}>
        <div className={styles.accessDeniedCard}>
          <span className={styles.accessDeniedIcon}>🔒</span>
          <h1>Access Denied</h1>
          <p>You must be an active moderator to view this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.dashboard}>
      <header className={styles.topBar}>
        <span className={styles.topBarLogo}>BibleDesk</span>
        <h1 className={styles.topBarTitle}>Moderation Dashboard</h1>
        <button className={styles.refreshBtn} onClick={loadQueue} disabled={loading} aria-label="Refresh queue">
          {loading ? '⧗' : '⟳'}
        </button>
      </header>

      <nav className={styles.tabs} role="tablist">
        {(['queue', 'approve', 'invite'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'queue' && `📊 Queue (${queue.length})`}
            {t === 'approve' && '📜 Approve'}
            {t === 'invite' && '📧 Invite'}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {tab === 'queue' && (
          <>
            {loading && (
              <div className={styles.loadingState}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${styles.skeletonCard} skeleton`} />
                ))}
              </div>
            )}

            {!loading && queueError && (
              <div className={styles.errorState}>
                <p>{queueError}</p>
                <button className={styles.primaryBtn} onClick={loadQueue}>
                  Retry
                </button>
              </div>
            )}

            {!loading && !queueError && queue.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✅</span>
                <p>No pending flags. The queue is clear.</p>
              </div>
            )}

            {!loading && !queueError && queue.length > 0 && (
              <div className={`${styles.flagList} animate-stagger`}>
                {queue.map((flag) => (
                  <FlagCard key={flag.id} flag={flag} onVoted={removeFlag} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'approve' && <ApprovePanel />}
        {tab === 'invite' && <InvitePanel />}
      </div>
    </main>
  );
}
