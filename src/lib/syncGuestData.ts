// BibleDesk — Guest Data Auto-Merge Engine
// Migrates locally created guest bookmarks and verse highlights
// into the newly authenticated account via the server API.
// (Guest sermon notes are no longer migrated — sermons were archived by A03.)
//
// Auth tokens are now JWT-based, stored in localStorage as 'bibledesk_token'.
//
// DATA-SAFETY CONTRACT (task B10):
// localStorage is cleared ONLY for records whose server insert returned verified
// success. A record is never bulk-cleared after a mere attempt. Failed inserts are
// persisted in a retry queue in localStorage and re-attempted on the next sync
// run. No login can destroy prayer data.

export interface SyncSummary {
  bookmarksCount: number;
  highlightsCount: number;
  notesCount: number;
}

const RETRY_QUEUE_KEY = 'bibledesk_sync_retry_queue_v1';

type SyncableKind = 'bookmark' | 'highlight' | 'note';

interface RetryItem {
  kind: SyncableKind;
  payload: Record<string, any>;
  attempts: number;
  lastError: string | null;
  queuedAt: string;
}

function loadRetryQueue(): RetryItem[] {
  try {
    const raw = localStorage.getItem(RETRY_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RetryItem[]) : [];
  } catch {
    return [];
  }
}

function saveRetryQueue(queue: RetryItem[]): void {
  try {
    localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[syncGuestDataToAccount] Could not persist retry queue:', e);
  }
}

interface MigrateResult {
  ok: boolean;
  serverId?: string;
  error?: string;
}

const KIND_ORDER: Record<SyncableKind, number> = {
  bookmark: 0,
  highlight: 1,
  note: 2,
};

interface BookmarkResponse {
  bookmark?: { id?: string };
  guest?: boolean;
  error?: string;
}

export async function syncGuestDataToAccount(): Promise<SyncSummary> {
  const summary: SyncSummary = {
    bookmarksCount: 0,
    highlightsCount: 0,
    notesCount: 0,
  };

  if (typeof window === 'undefined') return summary;

  try {
    // Read JWT from localStorage (set by the login flow)
    const token = localStorage.getItem('bibledesk_token');
    if (!token) return summary;

    // Decode JWT payload to get userId (no verification — server verifies)
    let userId: string;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return summary;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      userId = payload.sub || payload.id;
      if (!userId) return summary;
    } catch {
      return summary;
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    async function postJson(
      path: string,
      body: Record<string, any>
    ): Promise<{ statusOk: boolean; status: number; data: any }> {
      const res = await fetch(path, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch { /* non-JSON body */ }
      return { statusOk: res.ok, status: res.status, data };
    }

    async function migrateBookmark(b: Record<string, any>): Promise<MigrateResult> {
      const { statusOk, status, data } = await postJson('/api/bookmarks', {
        answerId: b.answerId || b.answer_id,
        shareSlug: b.shareSlug || b.share_slug || 'shared',
        question: b.question,
        summary: b.summary,
        translation: b.translation,
        confidence: b.confidence,
      });
      const body = data as BookmarkResponse | null;
      if (statusOk && body?.bookmark?.id) return { ok: true, serverId: body.bookmark.id };
      return {
        ok: false,
        error: body?.guest ? 'server responded as guest (not persisted)' : (body?.error ?? `HTTP ${status}`),
      };
    }

    async function migrateHighlight(h: { ref: string; color: string }): Promise<MigrateResult> {
      const { statusOk, status } = await postJson('/api/highlights', {
        reference: h.ref,
        color: h.color,
      });
      return statusOk ? { ok: true } : { ok: false, error: `HTTP ${status}` };
    }

    async function migrateNote(n: { ref: string; content: string }): Promise<MigrateResult> {
      const { statusOk, status } = await postJson('/api/notes', {
        reference: n.ref,
        content: n.content,
      });
      return statusOk ? { ok: true } : { ok: false, error: `HTTP ${status}` };
    }

    async function attemptMigration(kind: SyncableKind, payload: Record<string, any>): Promise<MigrateResult> {
      try {
        switch (kind) {
          case 'bookmark':
            return await migrateBookmark(payload);
          case 'highlight': {
            if (typeof payload.ref !== 'string' || typeof payload.color !== 'string') {
              return { ok: false, error: 'malformed highlight payload' };
            }
            return await migrateHighlight({ ref: payload.ref, color: payload.color });
          }
          case 'note': {
            if (typeof payload.ref !== 'string' || typeof payload.content !== 'string') {
              return { ok: false, error: 'malformed note payload' };
            }
            return await migrateNote({ ref: payload.ref, content: payload.content });
          }
          default:
            return { ok: false, error: `unknown sync kind: ${kind}` };
        }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }

    const stillQueued: RetryItem[] = [];
    const newFailures: RetryItem[] = [];
    const queueFailure = (kind: SyncableKind, payload: Record<string, any>, error: string | null, attempts = 0) => {
      console.warn(`[syncGuestDataToAccount] Migration failed; queued for retry (${kind}):`, error);
      newFailures.push({ kind, payload, attempts, lastError: error, queuedAt: new Date().toISOString() });
    };

    // 0. Drain the retry queue from previous runs
    const pendingRetry = loadRetryQueue();
    for (const item of [...pendingRetry].sort((a, b) => (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99))) {
      const result = await attemptMigration(item.kind, item.payload);
      if (!result.ok) {
        stillQueued.push({
          ...item,
          attempts: item.attempts + 1,
          lastError: result.error ?? item.lastError,
        });
      }
    }

    // 1. Sync Guest Bookmarks
    let consumeBookmarksKey = false;
    const rawBookmarks = localStorage.getItem('bibledesk_bookmarks_guest');
    if (rawBookmarks) {
      try {
        const bookmarks: unknown = JSON.parse(rawBookmarks);
        if (Array.isArray(bookmarks) && bookmarks.length > 0) {
          for (const b of bookmarks) {
            const record: Record<string, any> = (b ?? {}) as Record<string, any>;
            const result = await attemptMigration('bookmark', record);
            if (result.ok) {
              summary.bookmarksCount++;
            } else {
              queueFailure('bookmark', { ...record }, result.error ?? null);
            }
          }
        }
        consumeBookmarksKey = true;
      } catch (e) {
        console.warn('Failed to sync guest bookmarks:', e);
      }
    }

    // 2. Prayer circle stays local
    // Contacts, commitments, and follow-ups remain in prayerCareLocal.ts only.

    // 3. Sync Guest Verse Highlights
    let consumeHighlightsKey = false;
    const rawHighlights = localStorage.getItem('bibledesk_verse_highlights');
    if (rawHighlights) {
      try {
        const parsed: unknown = JSON.parse(rawHighlights);
        if (parsed && typeof parsed === 'object') {
          for (const [ref, color] of Object.entries(parsed)) {
            if (typeof color === 'string') {
              const result = await attemptMigration('highlight', { ref, color });
              if (result.ok) {
                summary.highlightsCount++;
              } else {
                queueFailure('highlight', { ref, color }, result.error ?? null);
              }
            }
          }
        }
        consumeHighlightsKey = true;
      } catch (e) {
        console.warn('Failed to sync guest highlights:', e);
      }
    }

    // 4. Sync Guest Verse Notes
    if (typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('biblenote:')) {
            const content = localStorage.getItem(key);
            if (content && content.trim()) {
              const parts = key.split(':');
              if (parts.length >= 4) {
                const ref = `${parts[1]} ${parts[2]}:${parts[3]}`;
                const result = await attemptMigration('note', { ref, content: content.trim() });
                if (result.ok) {
                  summary.notesCount++;
                } else {
                  queueFailure('note', { ref, content: content.trim() }, result.error ?? null);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to sync guest verse notes:', e);
      }
    }

    // Finalize
    const finalQueue = [...stillQueued, ...newFailures];
    saveRetryQueue(finalQueue);

    if (consumeBookmarksKey) localStorage.removeItem('bibledesk_bookmarks_guest');
    if (consumeHighlightsKey) localStorage.removeItem('bibledesk_verse_highlights');
  } catch (err) {
    console.error('[syncGuestDataToAccount] Unexpected error:', err);
  }

  return summary;
}
