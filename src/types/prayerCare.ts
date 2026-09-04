// BibleDesk — Prayer Care Workflow Types
// Follows docs/PRAYER_CARE_WORKFLOW.md specification

export type PrayerCategory = 
  | 'Family' 
  | 'Friend' 
  | 'Church' 
  | 'Missions' 
  | 'Healing' 
  | 'Work' 
  | 'Custom';

export type RecurrenceRule = 
  | 'daily' 
  | 'weekdays' 
  | 'weekly' 
  | 'monthly' 
  | 'once';

export type CommitmentStatus = 
  | 'active' 
  | 'paused' 
  | 'answered' 
  | 'archived';

export type CheckinOutcome = 
  | 'prayed' 
  | 'snoozed' 
  | 'skipped' 
  | 'answered';

export type FollowupChannel = 
  | 'email' 
  | 'sms' 
  | 'whatsapp' 
  | 'clipboard';

export type FollowupStatus = 
  | 'draft' 
  | 'approved' 
  | 'sent' 
  | 'failed' 
  | 'dismissed';

export interface PrayerContact {
  id: string;
  owner_id?: string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  category: PrayerCategory;
  is_sensitive: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrayerCommitment {
  id: string;
  owner_id?: string;
  contact_id?: string | null;
  contact?: PrayerContact;
  title: string;
  private_details?: string | null;
  recurrence_rule: RecurrenceRule;
  timezone: string;
  next_due_at: string;
  status: CommitmentStatus;
  created_at: string;
  updated_at: string;
  // Computed / local helper
  last_checkin?: PrayerCheckin;
}

export interface PrayerCheckin {
  id: string;
  owner_id?: string;
  commitment_id: string;
  outcome: CheckinOutcome;
  private_note?: string | null;
  completed_at: string;
  next_due_at?: string | null;
}

export interface PrayerFollowup {
  id: string;
  owner_id?: string;
  contact_id?: string | null;
  checkin_id?: string | null;
  channel: FollowupChannel;
  recipient?: string | null;
  subject?: string | null;
  message: string;
  status: FollowupStatus;
  approved_at?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface PrayerNotificationPreferences {
  owner_id: string;
  timezone: string;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  browser_enabled: boolean;
  email_enabled: boolean;
  digest_mode: 'individual' | 'daily_digest';
  updated_at: string;
}

export interface PrayerCareStore {
  contacts: PrayerContact[];
  commitments: PrayerCommitment[];
  checkins: PrayerCheckin[];
  followups: PrayerFollowup[];
}
