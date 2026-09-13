// BibleDesk — Guest Data Auto-Merge Engine
// Migrates locally created guest bookmarks and verse highlights
// into the newly authenticated Supabase account under strict RLS.
// (Guest sermon notes are no longer migrated — sermons were archived by A03;
// any stale `bibledesk_sermons_guest` entries are left untouched in localStorage.)
//
// Prayer circle data (contacts, commitments, check-ins, follow-ups) stays
// LOCAL-ONLY: the server-side /api/prayer/circle route was deleted, so there is
// no endpoint to migrate them to. This migration never touches the prayer
// circle store.
//
// DATA-SAFETY CONTRACT (task B10):
// localStorage is cleared ONLY for records whose server insert returned verified
// success. A record is never bulk-cleared after a mere attempt. Failed inserts are
// persisted in a retry queue in localStorage and re-attempted on the next sync
// run (e.g. next login). No login can destroy prayer data.

import { getBrowserClient } from '@/lib/supabase';

export interface SyncSummary {
  bookmarksCount: number;
  highlightsCount: number;
}

// ── Persistent retry queue ────────────────────────────────────────────────────
// Holds records whose server insert failed, so they survive and retry on the
// next sync run instead of being dropped into the void.
const RETRY_QUEUE_KEY = 'bibledesk_sync_retry_queue_v1';

type SyncableKind = 'bookmark' | 'highlight';

interface RetryItem {
  kind: SyncableKind;
  /** The original local record, so the insert can be rebuilt on retry. */
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
    // If the queue itself cannot persist, say so loudly: those records would
    // otherwise be lost when their source keys are consumed below.
    console.error('[syncGuestDataToAccount] Could not persist retry queue:', e);
  }
}

interface MigrateResult {
  ok: boolean;
  /** Server-side ID of the created record, when the endpoint returns one. */
  serverId?: string;
  error?: string;
}

// Drain order is bookmark → highlight (order only matters for the
// retry queue, which no longer has dependencies between kinds).
const KIND_ORDER: Record<SyncableKind, number> = {
  bookmark: 0,
  highlight: 1,
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
  };

  if (typeof window === 'undefined') return summary;

  try {
    const supabase = getBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !session.access_token) return summary;

    const userId = session.user.id;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };

    // ── Verified per-record migration helpers ───────────────────────────────
    // Each returns ok:true ONLY when the server confirms the record was
    // created (returned row ID). Offline/guest acknowledgements
    // ({ success:true, acknowledged:true } with no row) are NOT success.

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
      } catch {
        /* non-JSON body */
      }
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
      const { error } = await supabase.from('verse_highlights').insert({
        user_id: userId,
        reference: h.ref,
        color: h.color,
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    }

    // ── Dispatcher: per-record attempt ──────────────────────────────────────────
    // Never throws: transport/parse failures become { ok:false }.

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

    // ── 0. Drain the retry queue from previous runs ────────────────────────────
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
      // ok:true → drop from the queue: verified on the server.
    }

    // ── 1. Sync Guest Bookmarks ──────────────────────────────────────────────
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
        // Source key is fully consumed: successes are verified on the server,
        // failures live in the retry queue. Never delete unaccounted data.
        consumeBookmarksKey = true;
      } catch (e) {
        console.warn('Failed to sync guest bookmarks:', e);
      }
    }

    // ── 2. Prayer circle stays local ──────────────────────────────────────────
    // Contacts, commitments, check-ins, and follow-ups are stored on this
    // device only (src/lib/prayerCareLocal.ts). The server-side /api/prayer/circle
    // route was deleted, so there is no endpoint to migrate them to — this
    // migration deliberately does not touch the prayer circle store.
    // ── 3. Sync Guest Verse Highlights ───────────────────────────────────────
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

    // ── Finalize ─────────────────────────────────────────────────────────────
    // Persist failures BEFORE consuming source keys, so a crash between the two
    // can never drop a record.
    const finalQueue = [...stillQueued, ...newFailures];

    saveRetryQueue(finalQueue);

    if (consumeBookmarksKey) localStorage.removeItem('bibledesk_bookmarks_guest');
    if (consumeHighlightsKey) localStorage.removeItem('bibledesk_verse_highlights');
  } catch (err) {
    console.error('[syncGuestDataToAccount] Unexpected error:', err);
  }

  return summary;
}
