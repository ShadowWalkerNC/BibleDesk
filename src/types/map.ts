export interface MissionMapPin {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  category: string;
  text: string;
  urgency: 'low' | 'normal' | 'high';
  isRestricted: boolean;
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
  },
  {
    id: 'pin-3',
    latitude: -1.2921,
    longitude: 36.8219,
    label: 'Nairobi, Kenya',
    category: 'missions',
    text: 'Pray for rain in rural mission fields and strength for local ministry coordinators.',
    urgency: 'high',
    isRestricted: false,
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
  },
  {
    id: 'pin-5',
    latitude: 30.0444,
    longitude: 31.2357,
    label: 'Northern Africa Region',
    category: 'restricted',
    text: 'Support letters for local training classes — pray for safety and local resources.',
    urgency: 'high',
    isRestricted: true,
  }
];
