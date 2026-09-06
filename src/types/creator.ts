// BibleDesk — Christian Creator & Ministry Hub Types
// Follows link-in-bio & ministry profile specification

export type CreatorCategory =
  | 'worship'
  | 'podcast'
  | 'writer'
  | 'pastor'
  | 'artist'
  | 'ministry';

export interface SocialLink {
  platform: 'youtube' | 'spotify' | 'apple_music' | 'instagram' | 'x' | 'substack' | 'discord' | 'website' | 'other';
  label: string;
  url: string;
}

export interface PatronageLink {
  platform: 'patreon' | 'buymeacoffee' | 'stripe' | 'paypal' | 'subsplash' | 'custom';
  label: string;
  url: string;
  description?: string;
}

export interface MediaEmbed {
  type: 'youtube' | 'spotify' | 'apple_music' | 'soundcloud';
  url: string;
  title?: string;
}

export interface CreatorPrayerRequest {
  id: string;
  title: string;
  details?: string;
  urgency?: 'normal' | 'urgent';
  prayed_count?: number;
  created_at?: string;
}

export interface CreatorProfile {
  id: string;
  user_id?: string;
  handle: string; // e.g. "davidworship"
  display_name: string;
  tagline: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  category: CreatorCategory;
  location?: string;
  church_affiliation?: string;
  season_verse?: {
    ref: string; // e.g. "Psalm 34:3"
    quote?: string;
  };
  featured_media?: MediaEmbed[];
  social_links?: SocialLink[];
  patronage_links?: PatronageLink[];
  prayer_requests?: CreatorPrayerRequest[];
  featured_sermon_ids?: string[];
  is_verified?: boolean;
  created_at: string;
  updated_at: string;
}
