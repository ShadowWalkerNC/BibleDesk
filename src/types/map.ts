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

// Verified seed prayer beacons across global regions (ensures PrayerAtlas is never empty)
export const DEFAULT_MAP_PINS: MissionMapPin[] = [
  {
    id: 'seed-pin-1',
    latitude: 38.8951,
    longitude: -77.0364,
    label: 'United States • Civic & Family Revival',
    category: 'community',
    text: 'Praying for unity in local communities, spiritual revival in universities, and strength for families.',
    urgency: 'normal',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'US',
    country_name: 'United States',
  },
  {
    id: 'seed-pin-2',
    latitude: 9.082,
    longitude: 8.6753,
    label: 'Nigeria • Pastoral Leadership & Youth Discipleship',
    category: 'church',
    text: 'Praying for peace and protection over rural fellowships, and provision for church pastors training the next generation.',
    urgency: 'high',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'NG',
    country_name: 'Nigeria',
  },
  {
    id: 'seed-pin-3',
    latitude: 35.8617,
    longitude: 104.1954,
    label: 'Restricted Region • Underground Fellowships',
    category: 'restricted',
    text: 'Praying for perseverance, Bible translation access, and divine protection for house church leaders.',
    urgency: 'high',
    isRestricted: true,
    privacy_mode: 'restricted',
    source: 'public',
    country_code: 'CN',
    country_name: 'Restricted Region',
  },
  {
    id: 'seed-pin-4',
    latitude: 48.3794,
    longitude: 31.1656,
    label: 'Ukraine • Humanitarian Care & Healing',
    category: 'healing',
    text: 'Praying for displaced families, trauma recovery, and local churches opening shelters to provide warmth and gospel hope.',
    urgency: 'high',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'UA',
    country_name: 'Ukraine',
  },
  {
    id: 'seed-pin-5',
    latitude: 20.5937,
    longitude: 78.9629,
    label: 'India • Rural Mission Pioneers',
    category: 'missions',
    text: 'Interceding for indigenous missionaries sharing Scripture in unreached villages and caring for orphans and widows.',
    urgency: 'normal',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'IN',
    country_name: 'India',
  },
  {
    id: 'seed-pin-6',
    latitude: -14.235,
    longitude: -51.9253,
    label: 'Brazil • Youth & Urban Church Ministry',
    category: 'family',
    text: 'Believing God for restoration of broken homes, youth deliverance, and revival among urban church communities.',
    urgency: 'normal',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'BR',
    country_name: 'Brazil',
  },
  {
    id: 'seed-pin-7',
    latitude: 33.9391,
    longitude: 67.7099,
    label: 'Restricted Region • Believers in Isolation',
    category: 'restricted',
    text: 'Standing in prayer for isolated Christians in sensitive regions. May God provide supernatural courage, fellowship, and digital Scriptures.',
    urgency: 'high',
    isRestricted: true,
    privacy_mode: 'restricted',
    source: 'public',
    country_code: 'AF',
    country_name: 'Restricted Region',
  },
  {
    id: 'seed-pin-8',
    latitude: 55.3781,
    longitude: -3.436,
    label: 'United Kingdom • Gospel Renewal',
    category: 'church',
    text: 'Praying for fresh spiritual hunger, university campus awakenings, and revival across historic chapels and modern church plants.',
    urgency: 'normal',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'GB',
    country_name: 'United Kingdom',
  },
  {
    id: 'seed-pin-9',
    latitude: -0.0236,
    longitude: 37.9062,
    label: 'Kenya • Community Health & Scripture Engagement',
    category: 'missions',
    text: 'Praying for clean water ministries, community medical outreach, and distribution of local language Bible audio modules.',
    urgency: 'normal',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'KE',
    country_name: 'Kenya',
  },
  {
    id: 'seed-pin-10',
    latitude: 12.8797,
    longitude: 121.774,
    label: 'Philippines • Disaster Relief & Compassion Ministries',
    category: 'community',
    text: 'Supporting coastal church networks ministering to families affected by seasonal storms and poverty.',
    urgency: 'normal',
    isRestricted: false,
    privacy_mode: 'approximate',
    source: 'public',
    country_code: 'PH',
    country_name: 'Philippines',
  },
];
