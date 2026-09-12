// BibleDesk — Creator Profiles Client & Storage Store
// Supports guest/offline creation + Supabase synchronization

import type { CreatorProfile } from '@/types/creator';

const LOCAL_STORAGE_KEY = 'bibledesk_creator_profiles_v1';
const MY_CREATOR_KEY = 'bibledesk_my_creator_profile_id';

export const DEFAULT_CREATOR_PROFILES: CreatorProfile[] = [
  {
    id: 'creator_grace_worship',
    handle: 'graceworship',
    display_name: 'Grace Worship Collective',
    tagline: 'Acoustic Scripture psalms & contemplative worship music',
    bio: 'We are a collective of worship leaders and indie musicians crafting scriptural songs, live acoustic worship sessions, and contemplative liturgical playlists to center hearts on Christ.',
    avatar_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
    banner_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=80',
    category: 'worship',
    location: 'Nashville, TN',
    church_affiliation: 'Grace Fellowship Church',
    season_verse: {
      ref: 'Psalm 34:3',
      quote: 'Oh, magnify the LORD with me, and let us exalt his name together!',
    },
    featured_media: [
      {
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Abide in Me (Acoustic Psalm 91 Live)',
      },
      {
        type: 'spotify',
        url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        title: 'Sovereign Joy (EP)',
      },
    ],
    social_links: [
      { platform: 'youtube', label: 'Grace Worship YouTube', url: 'https://youtube.com' },
      { platform: 'spotify', label: 'Spotify Artist Page', url: 'https://spotify.com' },
      { platform: 'instagram', label: '@graceworshipmusic', url: 'https://instagram.com' },
    ],
    patronage_links: [
      { platform: 'patreon', label: 'Join Our Hymn Circle on Patreon', url: 'https://patreon.com', description: 'Early chord charts, stems, & monthly prayer zoom' },
      { platform: 'buymeacoffee', label: 'Send Coffee & Bless our Band', url: 'https://buymeacoffee.com' },
    ],
    prayer_requests: [
      {
        id: 'pr_gw_1',
        title: 'Fall University Worship Tour & Stems',
        details: 'Praying for safety on the road and that students encounter God’s deep peace and renewal.',
        urgency: 'normal',
        prayed_count: 84,
      },
    ],
    is_verified: true,
    created_at: new Date('2026-08-01').toISOString(),
    updated_at: new Date('2026-09-01').toISOString(),
  },
  {
    id: 'creator_scripture_podcast',
    handle: 'deepwells',
    display_name: 'Deep Wells Biblical Theology',
    tagline: 'Verse-by-verse exposition & ancient near-east historical context',
    bio: 'Weekly deep dive podcast exploring the rich historical, linguistic, and systematic depths of the Bible with pastor Caleb Hayes. Digging past surface takes into the Hebrew & Greek roots.',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    banner_url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200&auto=format&fit=crop&q=80',
    category: 'podcast',
    location: 'Austin, TX',
    church_affiliation: 'Austin Reformed Fellowship',
    season_verse: {
      ref: 'Colossians 3:16',
      quote: 'Let the word of Christ dwell in you richly, teaching and admonishing one another in all wisdom.',
    },
    featured_media: [
      {
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Episode 48: The Covenant of Peace in Isaiah 54',
      },
    ],
    social_links: [
      { platform: 'apple_music', label: 'Apple Podcasts', url: 'https://podcasts.apple.com' },
      { platform: 'spotify', label: 'Spotify Podcasts', url: 'https://spotify.com' },
      { platform: 'substack', label: 'Deep Wells Essays on Substack', url: 'https://substack.com' },
      { platform: 'x', label: '@DeepWellsBiblical', url: 'https://x.com' },
    ],
    patronage_links: [
      { platform: 'buymeacoffee', label: 'Support the Studio & Podcast', url: 'https://buymeacoffee.com', description: 'Help keep all episodes 100% free forever for pastors and missionaries' },
      { platform: 'stripe', label: 'Direct Ministry Gift (Stripe)', url: 'https://stripe.com' },
    ],
    prayer_requests: [
      {
        id: 'pr_dw_1',
        title: 'Translation of Study Notes into Spanish',
        details: 'Pray for theological clarity and translator partnerships across Latin America.',
        urgency: 'urgent',
        prayed_count: 142,
      },
    ],
    is_verified: true,
    created_at: new Date('2026-08-10').toISOString(),
    updated_at: new Date('2026-09-02').toISOString(),
  },
  {
    id: 'creator_scripture_art',
    handle: 'illuminatedkingdom',
    display_name: 'Illuminated Kingdom Art',
    tagline: 'Hand-lettered scripture art & illuminated manuscript prints',
    bio: 'Visual artist and illustrator handcrafting reverent illuminated prints of God’s Word for homes, hospital rooms, and quiet prayer closets.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    banner_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
    category: 'artist',
    location: 'Denver, CO',
    season_verse: {
      ref: 'Exodus 31:3',
      quote: 'And I have filled him with the Spirit of God, with ability and intelligence, with knowledge and all craftsmanship.',
    },
    social_links: [
      { platform: 'instagram', label: '@illuminatedkingdom', url: 'https://instagram.com' },
      { platform: 'website', label: 'Illuminated Print Store', url: 'https://bible-desk.vercel.app' },
    ],
    patronage_links: [
      { platform: 'patreon', label: 'Join the Art Guild on Patreon', url: 'https://patreon.com', description: 'Monthly high-res digital downloads & desktop wallpapers' },
    ],
    prayer_requests: [
      {
        id: 'pr_art_1',
        title: 'Hospital ICU Scripture Canvas Donations',
        details: 'Donating 50 large scripture canvases to local pediatric oncology wards this month.',
        urgency: 'normal',
        prayed_count: 67,
      },
    ],
    is_verified: true,
    created_at: new Date('2026-08-15').toISOString(),
    updated_at: new Date('2026-09-03').toISOString(),
  },
];

export function getAllCreators(): CreatorProfile[] {
  if (typeof window === 'undefined') return DEFAULT_CREATOR_PROFILES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        // Merge defaults with stored
        const combined = [...DEFAULT_CREATOR_PROFILES];
        stored.forEach((item: CreatorProfile) => {
          const idx = combined.findIndex(c => c.handle.toLowerCase() === item.handle.toLowerCase());
          if (idx >= 0) {
            combined[idx] = item;
          } else {
            combined.unshift(item);
          }
        });
        return combined;
      }
    }
  } catch (e) {
    console.warn('[creatorStore] Failed to load creators from localStorage:', e);
  }
  return DEFAULT_CREATOR_PROFILES;
}

export function getCreatorByHandle(handle: string): CreatorProfile | null {
  const clean = handle.replace(/^@/, '').toLowerCase().trim();
  const all = getAllCreators();
  return all.find(c => c.handle.toLowerCase() === clean) || null;
}

export function saveCreatorProfile(profile: CreatorProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const all = getAllCreators();
    const cleanHandle = profile.handle.replace(/^@/, '').toLowerCase().trim();
    profile.handle = cleanHandle;
    profile.updated_at = new Date().toISOString();

    const existingIndex = all.findIndex(c => c.handle.toLowerCase() === cleanHandle);
    if (existingIndex >= 0) {
      all[existingIndex] = profile;
    } else {
      all.unshift(profile);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
    localStorage.setItem(MY_CREATOR_KEY, profile.id);
  } catch (e) {
    console.error('[creatorStore] Failed to save creator profile:', e);
  }
}

export function incrementPrayerCount(handle: string, prayerId: string): number {
  const creator = getCreatorByHandle(handle);
  if (!creator || !creator.prayer_requests) return 0;
  const pr = creator.prayer_requests.find(p => p.id === prayerId);
  if (!pr) return 0;
  pr.prayed_count = (pr.prayed_count || 0) + 1;
  saveCreatorProfile(creator);
  return pr.prayed_count;
}
