// BibleDesk — Guest Data Auto-Merge Engine
// Migrates locally created guest bookmarks, prayer commitments, sermon notes,
// and verse highlights into the newly authenticated Supabase account under strict RLS.

import { getBrowserClient } from '@/lib/supabase';
import { loadPrayerCareStore, DEFAULT_CONTACTS, DEFAULT_COMMITMENTS } from '@/lib/prayerCareLocal';

export interface SyncSummary {
  bookmarksCount: number;
  prayerContactsCount: number;
  prayerCommitmentsCount: number;
  sermonsCount: number;
  highlightsCount: number;
}

export async function syncGuestDataToAccount(): Promise<SyncSummary> {
  const summary: SyncSummary = {
    bookmarksCount: 0,
    prayerContactsCount: 0,
    prayerCommitmentsCount: 0,
    sermonsCount: 0,
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

    // ── 1. Sync Guest Bookmarks ──────────────────────────────────────────────
    const rawBookmarks = localStorage.getItem('bibledesk_bookmarks_guest');
    if (rawBookmarks) {
      try {
        const bookmarks = JSON.parse(rawBookmarks);
        if (Array.isArray(bookmarks) && bookmarks.length > 0) {
          for (const b of bookmarks) {
            await fetch('/api/bookmarks', {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                answerId: b.answerId || b.answer_id,
                shareSlug: b.shareSlug || b.share_slug || 'shared',
                question: b.question,
                summary: b.summary,
                translation: b.translation,
                confidence: b.confidence,
              }),
            });
            summary.bookmarksCount++;
          }
          localStorage.removeItem('bibledesk_bookmarks_guest');
        }
      } catch (e) {
        console.warn('Failed to sync guest bookmarks:', e);
      }
    }

    // ── 2. Sync Guest Prayer Circle (Contacts & Commitments) ─────────────────
    const store = loadPrayerCareStore();
    // Only sync if user created custom contacts beyond default seeds
    const customContacts = store.contacts.filter(
      c => !DEFAULT_CONTACTS.some(d => d.id === c.id && d.display_name === c.display_name)
    );
    const customCommitments = store.commitments.filter(
      c => !DEFAULT_COMMITMENTS.some(d => d.id === c.id && d.title === c.title)
    );

    if (customContacts.length > 0 || customCommitments.length > 0) {
      const contactIdMap: Record<string, string> = {};

      // Migrate contacts
      for (const contact of customContacts) {
        try {
          const res = await fetch('/api/prayer/circle', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              action: 'create_contact',
              display_name: contact.display_name,
              category: contact.category,
              email: contact.email,
              phone: contact.phone,
              is_sensitive: contact.is_sensitive,
            }),
          });
          const data = await res.json();
          if (data.success && data.contact?.id) {
            contactIdMap[contact.id] = data.contact.id;
            summary.prayerContactsCount++;
          }
        } catch (e) {
          console.warn('Failed to sync prayer contact:', e);
        }
      }

      // Migrate commitments
      for (const c of customCommitments) {
        try {
          const mappedContactId = c.contact_id ? (contactIdMap[c.contact_id] || null) : null;
          await fetch('/api/prayer/circle', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              action: 'create_commitment',
              contact_id: mappedContactId,
              title: c.title,
              private_details: c.private_details,
              recurrence_rule: c.recurrence_rule,
              timezone: c.timezone,
            }),
          });
          summary.prayerCommitmentsCount++;
        } catch (e) {
          console.warn('Failed to sync prayer commitment:', e);
        }
      }

      // Clear local store so it now pulls from Supabase
      localStorage.removeItem('bibledesk_prayer_circle_v1');
    }

    // ── 3. Sync Guest Sermon Outlines ────────────────────────────────────────
    const rawSermons = localStorage.getItem('bibledesk_sermons_guest');
    if (rawSermons) {
      try {
        const sermons = JSON.parse(rawSermons);
        if (Array.isArray(sermons) && sermons.length > 0) {
          for (const s of sermons) {
            await supabase.from('sermon_notes').insert({
              user_id: userId,
              title: s.title || 'Untitled Sermon',
              content: s.content || '',
            });
            summary.sermonsCount++;
          }
          localStorage.removeItem('bibledesk_sermons_guest');
        }
      } catch (e) {
        console.warn('Failed to sync guest sermons:', e);
      }
    }

    // ── 4. Sync Guest Verse Highlights ───────────────────────────────────────
    const rawHighlights = localStorage.getItem('bibledesk_verse_highlights');
    if (rawHighlights) {
      try {
        const highlights = JSON.parse(rawHighlights);
        if (typeof highlights === 'object' && highlights !== null) {
          for (const [ref, color] of Object.entries(highlights)) {
            if (typeof color === 'string') {
              await supabase.from('verse_highlights').insert({
                user_id: userId,
                reference: ref,
                color,
              });
              summary.highlightsCount++;
            }
          }
          localStorage.removeItem('bibledesk_verse_highlights');
        }
      } catch (e) {
        console.warn('Failed to sync guest highlights:', e);
      }
    }
  } catch (err) {
    console.error('[syncGuestDataToAccount] Unexpected error:', err);
  }

  return summary;
}
