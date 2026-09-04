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

// Default dummy markers spread across the world (e.g. regions/continents) for local-first fallback
export const DEFAULT_MAP_PINS: MissionMapPin[] = [
  {
    id: 'pin-1',
    latitude: 34.0522,
    longitude: -118.2437,
    label: 'Los Angeles, USA',
    category: 'community',
    text: 'Pray for our upcoming high school youth retreat and local outreach initiatives.',
    urgency: 'normal',
    isRestricted: false,
    privacy_mode: 'precise',
    source: 'public',
    country_code: 'US',
    country_name: 'United States'
  },
  {
    id: 'pin-2',
    latitude: 51.5074,
    longitude: -0.1278,
    label: 'London, UK',
    category: 'church',
    text: 'Pray for wisdom for the pastoral staff navigating congregation transitions.',
    urgency: 'low',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'GB',
    country_name: 'United Kingdom'
  },
  {
    id: 'pin-3',
    latitude: -1.2921,
    longitude: 36.8219,
    label: 'Nairobi, Kenya',
    category: 'healing',
    text: 'Pray for rain in rural mission fields and restorative healing for clinic patients.',
    urgency: 'high',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'KE',
    country_name: 'Kenya'
  },
  {
    id: 'pin-4',
    latitude: 35.6762,
    longitude: 139.6503,
    label: 'Tokyo, Japan',
    category: 'missions',
    text: 'Pray for the university church plant group facing cultural barriers.',
    urgency: 'normal',
    isRestricted: false,
    privacy_mode: 'precise',
    source: 'public',
    country_code: 'JP',
    country_name: 'Japan'
  },
  {
    id: 'pin-5',
    latitude: 30.0444,
    longitude: 31.2357,
    label: 'Northern Africa Region',
    category: 'restricted',
    text: 'Support letters for local training classes — pray for safety and underground church resilience.',
    urgency: 'high',
    isRestricted: true,
    privacy_mode: 'restricted',
    source: 'public',
    country_code: 'EG',
    country_name: 'Egypt'
  }
];
