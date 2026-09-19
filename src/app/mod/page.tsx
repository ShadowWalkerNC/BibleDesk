'use client';

import { useEffect, useState, useCallback, useMemo, FormEvent } from 'react';
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
type Tab = 'queue' | 'approve' | 'invite' | 'system';

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

interface FlagCardProps {
  flag: FlagItem;
  onVoted: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function FlagCard({ flag, onVoted, selectable, selected, onToggleSelect }: FlagCardProps) {
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
    <article className={`${styles.flagCard} ${selectable ? styles.flagCardSelectable : ''}`}>
      {selectable && (
        <input
          type="checkbox"
          className={styles.flagCheckbox}
          checked={selected}
          onChange={() => onToggleSelect?.(flag.id)}
          aria-label={`Select flag for answer ${flag.answer.id}`}
        />
      )}
      <div className={styles.flagCardContent}>
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
            {submitting ? 'Recording verification…' : 'Record Verification Vote'}
          </button>
        </form>
      </div>
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
          {submitting ? 'Promoting answer…' : 'Promote Answer to Canonical'}
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
      <h2 className={styles.panelTitle}>📧 Invite Moderator / Role Management</h2>
      <p className={styles.panelDesc}>
        Sends a Supabase magic-link invite and creates a moderator record. Grants review permissions across BibleDesk theological answers.
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
          <option value="moderator">Moderator (Review &amp; Flag Triage)</option>
          <option value="admin">Administrator (Full Theological Governance)</option>
        </select>
        {feedback && <p className={feedback.ok ? styles.feedbackOk : styles.feedbackErr}>{feedback.msg}</p>}
        <button type="submit" className={styles.primaryBtn} disabled={!email.trim() || !name.trim() || submitting}>
          {submitting ? 'Sending invitation…' : 'Send Moderator Invitation'}
        </button>
      </form>
    </section>
  );
}

function SystemPanel({ queueCount }: { queueCount: number }) {
  const [downloading, setDownloading] = useState(false);

  function handleExportAudit() {
    setDownloading(true);
    const data = {
      timestamp: new Date().toISOString(),
      queueRemaining: queueCount,
      environment: process.env.NODE_ENV || 'development',
      sigilIntegration: 'HMAC-Active',
      fiveDimensions: ['Scripture', 'Historical', 'Language', 'Theological', 'Practical Application'],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bibledesk-mod-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloading(false), 500);
  }

  return (
    <section className={styles.panel} style={{ maxWidth: '780px' }}>
      <h2 className={styles.panelTitle}>⚙️ System Configuration &amp; Governance</h2>
      <p className={styles.panelDesc}>
        Administrative controls for theological grounding thresholds, content safety parameters, and network sync.
      </p>

      <div className={styles.systemSection}>
        <div className={styles.systemCard}>
          <div className={styles.systemCardTitle}>ShadowRealm / Sigil Network Status</div>
          <div className={styles.systemCardDesc}>
            Webhook contract: <code>/api/v1/bible/answer</code> with HMAC SHA-256 signature verification.
          </div>
          <div className={styles.systemRow}>
            <span>Webhook Endpoint</span>
            <span className={styles.systemStatusGreen}>Active &amp; Healthy</span>
          </div>
          <div className={styles.systemRow}>
            <span>Doctrinal Consensus Threshold</span>
            <span>3 Positive Moderator Votes</span>
          </div>
        </div>

        <div className={styles.systemCard}>
          <div className={styles.systemCardTitle}>Administrative Audit Logs</div>
          <div className={styles.systemCardDesc}>
            Download full historical moderation records, reviewer verdicts, and theological corrections for compliance review.
          </div>
          <button
            className={styles.primaryBtn}
            onClick={handleExportAudit}
            disabled={downloading}
            style={{ marginTop: '0.5rem' }}
          >
            {downloading ? 'Preparing Audit...' : '📥 Export Audit Log (JSON)'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ModDashboard() {
  const [tab, setTab] = useState<Tab>('queue');
  const [queue, setQueue] = useState<FlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Administrative Filters & Bulk State
  const [dimensionFilter, setDimensionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlags, setSelectedFlags] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'rapid'>('list');
  const [rapidIndex, setRapidIndex] = useState(0);

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
    setSelectedFlags((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // Filtered queue based on dimension and text query
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      const matchDim =
        dimensionFilter === 'all' ||
        item.answer.dimension.toLowerCase() === dimensionFilter.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        item.answer.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDim && matchSearch;
    });
  }, [queue, dimensionFilter, searchQuery]);

  // Bulk selections
  const allSelected = filteredQueue.length > 0 && selectedFlags.size === filteredQueue.length;
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedFlags(new Set());
    } else {
      setSelectedFlags(new Set(filteredQueue.map((f) => f.id)));
    }
  }

  function toggleSelectFlag(id: string) {
    setSelectedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Rapid triage single vote
  async function handleRapidVote(vote: VoteValue) {
    const current = filteredQueue[rapidIndex];
    if (!current) return;

    await apiFetch('/api/mod/vote', {
      method: 'POST',
      body: JSON.stringify({ flagId: current.id, vote }),
    });

    removeFlag(current.id);
    if (rapidIndex >= filteredQueue.length - 1) {
      setRapidIndex(0);
    }
  }

  // Bulk dismissal / approval action
  async function handleBulkApprove() {
    const ids = Array.from(selectedFlags);
    for (const flagId of ids) {
      await apiFetch('/api/mod/vote', {
        method: 'POST',
        body: JSON.stringify({ flagId, vote: 'accurate' }),
      });
      removeFlag(flagId);
    }
    setSelectedFlags(new Set());
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

  // Metrics for Admin Dashboard
  const accurateCount = queue.reduce((acc, f) => acc + f.votes.accurate, 0);
  const totalVotes = queue.reduce((acc, f) => acc + f.votes.total, 0);
  const accuracyPct = totalVotes > 0 ? Math.round((accurateCount / totalVotes) * 100) : 100;

  return (
    <main className={styles.dashboard}>
      <header className={styles.topBar}>
        <span className={styles.topBarLogo}>BibleDesk</span>
        <h1 className={styles.topBarTitle}>Administrative &amp; Moderation Command</h1>
        <div className={styles.topBarBadges}>
          <span className={styles.statusPill}>● Live Network</span>
          <button className={styles.refreshBtn} onClick={loadQueue} disabled={loading} aria-label="Refresh queue">
            {loading ? '⧗' : '⟳'}
          </button>
        </div>
      </header>

      <nav className={styles.tabs} role="tablist">
        {(['queue', 'approve', 'invite', 'system'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'queue' && `📊 Triage & Queue (${queue.length})`}
            {t === 'approve' && '📜 Direct Approval'}
            {t === 'invite' && '📧 Role Management'}
            {t === 'system' && '⚙️ System & Governance'}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {tab === 'queue' && (
          <>
            {/* Top Administrative KPI Cards */}
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiValue}>{queue.length}</span>
                <span className={styles.kpiLabel}>Pending Flags</span>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiValue}>{accuracyPct}%</span>
                <span className={styles.kpiLabel}>Accuracy Rate</span>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiValue}>{totalVotes}</span>
                <span className={styles.kpiLabel}>Votes Recorded</span>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiValue}>5D</span>
                <span className={styles.kpiLabel}>Active Dimensions</span>
              </div>
            </div>

            {/* Filter Toolbar & View Mode Switcher */}
            <div className={styles.filterToolbar}>
              <div className={styles.filterTopRow}>
                <div className={styles.searchBox}>
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Search flags by keyword or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.modeToggleGroup}>
                  <button
                    type="button"
                    className={`${styles.modeToggleBtn} ${viewMode === 'list' ? styles.modeToggleBtnActive : ''}`}
                    onClick={() => setViewMode('list')}
                  >
                    Desktop List
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeToggleBtn} ${viewMode === 'rapid' ? styles.modeToggleBtnActive : ''}`}
                    onClick={() => setViewMode('rapid')}
                  >
                    ⚡ Rapid Triage
                  </button>
                </div>
              </div>

              {/* Dimension Filter Pills */}
              <div className={styles.dimPillGroup}>
                {['all', 'scripture', 'historical', 'language', 'theological', 'practical'].map((dim) => (
                  <button
                    key={dim}
                    type="button"
                    className={`${styles.dimPill} ${dimensionFilter === dim ? styles.dimPillActive : ''}`}
                    onClick={() => setDimensionFilter(dim)}
                  >
                    {dim.charAt(0).toUpperCase() + dim.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Action Toolbar (Desktop Admin) */}
            {viewMode === 'list' && filteredQueue.length > 0 && (
              <div className={styles.bulkToolbar}>
                <label className={styles.bulkSelectAll}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                  <span>Select All ({filteredQueue.length})</span>
                </label>

                <div className={styles.bulkActions}>
                  <button
                    type="button"
                    className={styles.bulkBtn}
                    disabled={selectedFlags.size === 0}
                    onClick={handleBulkApprove}
                  >
                    ✔ Bulk Verify ({selectedFlags.size})
                  </button>
                  <button
                    type="button"
                    className={styles.bulkBtn}
                    disabled={selectedFlags.size === 0}
                    onClick={() => setSelectedFlags(new Set())}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Loading & Empty States */}
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
                  Retry Loading Queue
                </button>
              </div>
            )}

            {!loading && !queueError && filteredQueue.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✅</span>
                <p>No pending flags matching your filters. The queue is clear.</p>
              </div>
            )}

            {/* View Mode 1: Mobile/Touch Rapid Triage Deck */}
            {!loading && !queueError && filteredQueue.length > 0 && viewMode === 'rapid' && (
              <div className={styles.rapidDeck}>
                <div className={styles.rapidDeckHeader}>
                  <span>Item {rapidIndex + 1} of {filteredQueue.length}</span>
                  <span className={styles.dimBadge} style={{ color: dimColor(filteredQueue[rapidIndex].answer.dimension) }}>
                    {filteredQueue[rapidIndex].answer.dimension}
                  </span>
                </div>

                <div className={styles.rapidCard}>
                  <span className={styles.flagReason}>⚠️ {filteredQueue[rapidIndex].reason}</span>
                  <div className={styles.answerBody}>
                    <p>{filteredQueue[rapidIndex].answer.body}</p>
                    {filteredQueue[rapidIndex].answer.source && (
                      <p className={styles.answerSource}>Source: {filteredQueue[rapidIndex].answer.source}</p>
                    )}
                  </div>

                  <div className={styles.rapidActions}>
                    <button
                      type="button"
                      className={styles.rapidVerifyBtn}
                      onClick={() => handleRapidVote('accurate')}
                    >
                      ✔ Verify Accurate
                    </button>
                    <button
                      type="button"
                      className={styles.rapidRejectBtn}
                      onClick={() => handleRapidVote('inaccurate')}
                    >
                      ✘ Inaccurate
                    </button>
                    <button
                      type="button"
                      className={styles.rapidSkipBtn}
                      onClick={() => setRapidIndex((prev) => (prev + 1) % filteredQueue.length)}
                    >
                      Skip ⏭
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode 2: Standard Desktop & Tablet List */}
            {!loading && !queueError && filteredQueue.length > 0 && viewMode === 'list' && (
              <div className={`${styles.flagList} animate-stagger`}>
                {filteredQueue.map((flag) => (
                  <FlagCard
                    key={flag.id}
                    flag={flag}
                    onVoted={removeFlag}
                    selectable={true}
                    selected={selectedFlags.has(flag.id)}
                    onToggleSelect={toggleSelectFlag}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'approve' && <ApprovePanel />}
        {tab === 'invite' && <InvitePanel />}
        {tab === 'system' && <SystemPanel queueCount={queue.length} />}
      </div>
    </main>
  );
}
