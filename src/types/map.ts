export type MapPinPrivacyMode = 'approximate' | 'precise' | 'restricted';

export interface MissionMapPin {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  category: string;
  text: string;
  urgency: 'low' | 'normal' | 'high';
  isRestricted: boolean;
  privacy_mode?: MapPinPrivacyMode;
  contact_id?: string;
  contact_name?: string;
  source?: 'public' | 'circle';
  country_code?: string;
  country_name?: string;
}

export interface CategoryColorMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export const CATEGORY_COLORS: Record<string, CategoryColorMeta> = {
  healing: {
    label: 'Healing',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.12)',
    border: 'rgba(5, 150, 105, 0.4)'
  },
  church: {
    label: 'Church',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.12)',
    border: 'rgba(37, 99, 235, 0.4)'
  },
  missions: {
    label: 'Missions',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.12)',
    border: 'rgba(124, 58, 237, 0.4)'
  },
  family: {
    label: 'Family',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.4)'
  },
  friend: {
    label: 'Friend',
    color: '#b58414',
    bg: 'rgba(181, 132, 20, 0.12)',
    border: 'rgba(181, 132, 20, 0.4)'
  },
  restricted: {
    label: 'Restricted',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.14)',
    border: 'rgba(220, 38, 38, 0.45)'
  },
  work: {
    label: 'Work',
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.12)',
    border: 'rgba(234, 88, 12, 0.4)'
  },
  community: {
    label: 'Community',
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.12)',
    border: 'rgba(79, 70, 229, 0.4)'
  },
  other: {
    label: 'Other',
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.12)',
    border: 'rgba(107, 114, 128, 0.4)'
  }
};

export function getCategoryMeta(categoryRaw: string, isRestricted?: boolean): CategoryColorMeta {
  if (isRestricted) return CATEGORY_COLORS.restricted;
  const key = (categoryRaw || '').toLowerCase();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.other;
}

// Verified user prayer beacons (starts empty until real prayers are pinned)
export const DEFAULT_MAP_PINS: MissionMapPin[] = [];
