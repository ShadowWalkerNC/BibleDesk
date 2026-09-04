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

export const SAMPLE_CHURCHES: ChurchProfile[] = [
  {
    id: 'church-grace-city',
    name: 'Grace City Church',
    denomination: 'Non-Denominational / Evangelical',
    city: 'Atlanta',
    state_province: 'GA',
    country: 'United States',
    website: 'https://gracecity.example.org',
    contact_email: 'pastoralcare@gracecity.example.org',
    invite_code: 'GC2026',
    member_count: 340,
    is_verified: true,
    created_at: '2026-01-10T12:00:00Z',
  },
  {
    id: 'church-hope-chapel',
    name: 'Hope Community Chapel',
    denomination: 'Reformed Baptist',
    city: 'London',
    country: 'United Kingdom',
    website: 'https://hopechapel.example.org',
    contact_email: 'prayer@hopechapel.example.org',
    invite_code: 'HOPE77',
    member_count: 185,
    is_verified: true,
    created_at: '2026-02-14T09:30:00Z',
  },
  {
    id: 'church-living-waters',
    name: 'Living Waters Fellowship',
    denomination: 'Pentecostal / Charismatic',
    city: 'Nairobi',
    country: 'Kenya',
    website: 'https://livingwaters.example.org',
    contact_email: 'office@livingwaters.example.org',
    invite_code: 'WATERS1',
    member_count: 520,
    is_verified: true,
    created_at: '2026-03-01T15:00:00Z',
  },
];
