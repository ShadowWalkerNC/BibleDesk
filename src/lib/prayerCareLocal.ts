// BibleDesk — Local-First Prayer Care Engine
// Handles offline-ready persistence, recurrence calculation, checkins, and care drafts.

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

export function calculateNextDue(rule: RecurrenceRule, fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  switch (rule) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekdays':
      do {
        d.setDate(d.getDate() + 1);
      } while (d.getDay() === 0 || d.getDay() === 6);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'once':
      // Move far in future or complete
      d.setFullYear(d.getFullYear() + 10);
      break;
  }
  return d.toISOString();
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
  } else {
    // Prayed or skipped
    nextDue = calculateNextDue(commitment.recurrence_rule, now);
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
