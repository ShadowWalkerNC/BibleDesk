// BibleDesk — Church Integration & Ministry Types
// Supports Church directory, church-wide prayer chains, and embeddable website widgets.

export interface ChurchProfile {
  id: string;
  name: string;
  denomination?: string;
  city?: string;
  state_province?: string;
  country?: string;
  website?: string;
  contact_email?: string;
  phone?: string;
  invite_code: string;
  admin_user_id?: string;
  member_count?: number;
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export type ChurchMemberRole = 'pastor' | 'elder' | 'staff' | 'intercessor' | 'member';

export interface ChurchMember {
  id: string;
  church_id: string;
  user_id: string;
  display_name: string;
  role: ChurchMemberRole;
  email?: string;
  joined_at: string;
}

export interface ChurchWidgetConfig {
  church_id: string;
  church_name: string;
  theme?: 'parchment' | 'dark' | 'light';
  show_daily_verse?: boolean;
  show_prayer_wall?: boolean;
  show_scripture_search?: boolean;
  accent_color?: string;
  custom_title?: string;
}

// Verified Registered Churches registry (starts empty until real congregations register)
export const DEFAULT_CHURCHES: ChurchProfile[] = [];
export const SAMPLE_CHURCHES: ChurchProfile[] = [];

