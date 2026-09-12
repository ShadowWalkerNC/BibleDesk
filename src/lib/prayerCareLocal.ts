// BibleDesk — Local-First Prayer Care Engine
// Handles offline-ready persistence, recurrence calculation, checkins, and care drafts.
//
// C05 (2026-09-12) — OWNER DECISION (b): the prayer circle is LOCAL-ONLY for
// the MVP. This module is the single committed data model for the circle tab:
// contacts, commitments, check-ins, and follow-ups live in localStorage and are
// never synced to a server. The old server write-through route
// (src/app/api/prayer/circle/route.ts) was deleted along with the v5 circle
// tables. Server-backed circle sharing is parked as a Phase-D epic (needs
// auth + RLS + moderation). Prayer content is sensitive; local-first is the
// project's identity.

import { 
  PrayerContact, 
  PrayerCommitment, 
  PrayerCheckin, 
  PrayerFollowup, 
  PrayerCareStore,
  RecurrenceRule,
  CheckinOutcome,
  PrayerCategory,
  FollowupChannel
} from '@/types/prayerCare';

const STORAGE_KEY = 'bibledesk_prayer_circle_v1';

export const FOLLOWUP_TEMPLATES = [
  {
    id: 'prayed_for_you',
    title: 'Warm & Simple',
    text: 'I prayed for you today. How are you doing?'
  },
  {
    id: 'on_my_heart',
    title: 'Specific Care',
    text: 'You were on my heart today. Is there anything specific I can keep praying about?'
  },
  {
    id: 'gentle_checkin',
    title: 'No-Pressure Follow-up',
    text: 'Checking in after your prayer request. No pressure to reply, just wanted you to know I\'m standing with you.'
  }
];

export const DEFAULT_CONTACTS: PrayerContact[] = [
  {
    id: 'default-contact-1',
    display_name: 'Sarah (Family)',
    category: 'Family',
    is_sensitive: false,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'default-contact-2',
    display_name: 'Pastor David & Leadership',
    category: 'Church',
    is_sensitive: false,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const DEFAULT_COMMITMENTS: PrayerCommitment[] = [
  {
    id: 'default-commit-1',
    contact_id: 'default-contact-1',
    title: 'Health, peace, and spiritual strength',
    private_details: 'Recovering from surgery, praying for restorative rest and God\'s peace.',
    recurrence_rule: 'daily',
    timezone: 'UTC',
    next_due_at: new Date().toISOString(),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'default-commit-2',
    contact_id: 'default-contact-2',
    title: 'Wisdom for sermon series and community outreach',
    private_details: 'Guiding the church body through current season.',
    recurrence_rule: 'weekly',
    timezone: 'UTC',
    next_due_at: new Date(Date.now() - 3600000).toISOString(), // Due now
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// ── Timezone-aware recurrence math ─────────────────────────────────────────
// All recurrence arithmetic runs on the commitment's stored `timezone` wall
// clock, so "daily" always means "same local time tomorrow" even across DST
// boundaries. Plain Date arithmetic would drift by an hour at transitions.

export function getTimezoneOffsetMinutes(at: Date, timezone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    });
    const parts: Record<string, string> = {};
    for (const p of dtf.formatToParts(at)) parts[p.type] = p.value;
    const asUTC = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    return Math.round((asUTC - at.getTime()) / 60000);
  } catch {
    return 0; // unknown/invalid timezone → treat as UTC
  }
}

export function calculateNextDue(
  rule: RecurrenceRule,
  fromDate: Date = new Date(),
  timezone: string = 'UTC'
): string | null {
  // One-off commitments complete on check-in — they never reschedule.
  if (rule === 'once') return null;

  // Shift the instant onto the stored timezone's wall clock (held as UTC), so
  // day/month arithmetic and weekday checks use local calendar semantics.
  const shifted = new Date(fromDate.getTime() + getTimezoneOffsetMinutes(fromDate, timezone) * 60000);

  switch (rule) {
    case 'daily':
      shifted.setUTCDate(shifted.getUTCDate() + 1);
      break;
    case 'weekdays':
      do {
        shifted.setUTCDate(shifted.getUTCDate() + 1);
      } while (shifted.getUTCDay() === 0 || shifted.getUTCDay() === 6);
      break;
    case 'weekly':
      shifted.setUTCDate(shifted.getUTCDate() + 7);
      break;
    case 'monthly':
      shifted.setUTCMonth(shifted.getUTCMonth() + 1);
      break;
  }

  // Convert the local wall-clock result back to a UTC instant, using the
  // offset in effect at the new time so DST transitions stay correct.
  const newOffset = getTimezoneOffsetMinutes(new Date(shifted.getTime()), timezone);
  return new Date(shifted.getTime() - newOffset * 60000).toISOString();
}

export function loadPrayerCareStore(): PrayerCareStore {
  if (typeof window === 'undefined') {
    return { contacts: DEFAULT_CONTACTS, commitments: DEFAULT_COMMITMENTS, checkins: [], followups: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: PrayerCareStore = {
        contacts: DEFAULT_CONTACTS,
        commitments: DEFAULT_COMMITMENTS,
        checkins: [],
        followups: []
      };
      savePrayerCareStore(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      contacts: parsed.contacts || DEFAULT_CONTACTS,
      commitments: parsed.commitments || DEFAULT_COMMITMENTS,
      checkins: parsed.checkins || [],
      followups: parsed.followups || []
    };
  } catch (err) {
    console.error('Failed to load prayer circle store:', err);
    return { contacts: DEFAULT_CONTACTS, commitments: DEFAULT_COMMITMENTS, checkins: [], followups: [] };
  }
}

export function savePrayerCareStore(store: PrayerCareStore) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to save prayer circle store:', err);
  }
}

export function addContactToStore(
  store: PrayerCareStore, 
  data: { display_name: string; category: PrayerCategory; email?: string; phone?: string; is_sensitive?: boolean }
): { store: PrayerCareStore; contact: PrayerContact } {
  const contact: PrayerContact = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `contact-${Date.now()}`,
    display_name: data.display_name.trim(),
    category: data.category,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    is_sensitive: !!data.is_sensitive,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const updated: PrayerCareStore = {
    ...store,
    contacts: [contact, ...store.contacts]
  };
  savePrayerCareStore(updated);
  return { store: updated, contact };
}

export function addCommitmentToStore(
  store: PrayerCareStore,
  data: {
    contact_id?: string | null;
    title: string;
    private_details?: string;
    recurrence_rule: RecurrenceRule;
  }
): { store: PrayerCareStore; commitment: PrayerCommitment } {
  const commitment: PrayerCommitment = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `commit-${Date.now()}`,
    contact_id: data.contact_id || null,
    title: data.title.trim(),
    private_details: data.private_details?.trim() || null,
    recurrence_rule: data.recurrence_rule,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    next_due_at: new Date().toISOString(),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const updated: PrayerCareStore = {
    ...store,
    commitments: [commitment, ...store.commitments]
  };
  savePrayerCareStore(updated);
  return { store: updated, commitment };
}

export function performCheckin(
  store: PrayerCareStore,
  commitmentId: string,
  outcome: CheckinOutcome,
  privateNote?: string
): { store: PrayerCareStore; checkin: PrayerCheckin } {
  const commitment = store.commitments.find(c => c.id === commitmentId);
  if (!commitment) throw new Error('Commitment not found');

  const now = new Date();
  let nextDue: string | null = null;
  let newStatus = commitment.status;

  if (outcome === 'answered') {
    newStatus = 'answered';
    nextDue = null;
  } else if (outcome === 'snoozed') {
    // Snooze 24h
    const snoozeDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    nextDue = snoozeDate.toISOString();
  } else if (commitment.recurrence_rule === 'once') {
    // One-off commitment completes on check-in (prayed/skipped) — it archives
    // instead of rescheduling. (calculateNextDue returns null for 'once'.)
    newStatus = 'archived';
    nextDue = null;
  } else {
    // Prayed or skipped
    nextDue = calculateNextDue(commitment.recurrence_rule, now, commitment.timezone);
  }

  const checkin: PrayerCheckin = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `checkin-${Date.now()}`,
    commitment_id: commitmentId,
    outcome,
    private_note: privateNote?.trim() || null,
    completed_at: now.toISOString(),
    next_due_at: nextDue
  };

  const updatedCommitments = store.commitments.map(c => {
    if (c.id === commitmentId) {
      return {
        ...c,
        status: newStatus,
        next_due_at: nextDue || c.next_due_at,
        updated_at: now.toISOString()
      };
    }
    return c;
  });

  const updated: PrayerCareStore = {
    ...store,
    commitments: updatedCommitments,
    checkins: [checkin, ...store.checkins]
  };
  savePrayerCareStore(updated);
  return { store: updated, checkin };
}

export function recordFollowupInStore(
  store: PrayerCareStore,
  data: {
    contact_id?: string | null;
    channel: FollowupChannel;
    recipient?: string | null;
    message: string;
    status?: 'draft' | 'sent';
  }
): { store: PrayerCareStore; followup: PrayerFollowup } {
  const followup: PrayerFollowup = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `followup-${Date.now()}`,
    contact_id: data.contact_id || null,
    channel: data.channel,
    recipient: data.recipient || null,
    message: data.message,
    status: data.status || 'sent',
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const updated: PrayerCareStore = {
    ...store,
    followups: [followup, ...store.followups],
  };
  savePrayerCareStore(updated);
  return { store: updated, followup };
}
