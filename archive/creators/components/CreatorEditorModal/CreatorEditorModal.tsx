'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import type { CreatorProfile, CreatorCategory } from '@/types/creator';
import { saveCreatorProfile } from '@/lib/creatorStore';
import styles from './CreatorEditorModal.module.css';

interface CreatorEditorModalProps {
  initialProfile?: CreatorProfile | null;
  onClose: () => void;
  onSaved: (saved: CreatorProfile) => void;
}

export default function CreatorEditorModal({
  initialProfile,
  onClose,
  onSaved,
}: CreatorEditorModalProps) {
  const [handle, setHandle] = useState(initialProfile?.handle || '');
  const [displayName, setDisplayName] = useState(initialProfile?.display_name || '');
  const [tagline, setTagline] = useState(initialProfile?.tagline || '');
  const [bio, setBio] = useState(initialProfile?.bio || '');
  const [category, setCategory] = useState<CreatorCategory>(initialProfile?.category || 'worship');
  const [location, setLocation] = useState(initialProfile?.location || '');
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(initialProfile?.banner_url || '');
  const [seasonRef, setSeasonRef] = useState(initialProfile?.season_verse?.ref || 'Psalm 34:3');
  const [seasonQuote, setSeasonQuote] = useState(initialProfile?.season_verse?.quote || '');
  const [patronUrl, setPatronUrl] = useState(initialProfile?.patronage_links?.[0]?.url || '');
  const [patronLabel, setPatronLabel] = useState(initialProfile?.patronage_links?.[0]?.label || 'Support on Patreon');
  const [youtubeUrl, setYoutubeUrl] = useState(
    initialProfile?.featured_media?.find(m => m.type === 'youtube')?.url || ''
  );
  const [spotifyUrl, setSpotifyUrl] = useState(
    initialProfile?.featured_media?.find(m => m.type === 'spotify')?.url || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || !displayName.trim()) return;

    const featured_media = [];
    if (youtubeUrl.trim()) {
      featured_media.push({ type: 'youtube' as const, url: youtubeUrl.trim(), title: 'Featured Message or Worship' });
    }
    if (spotifyUrl.trim()) {
      featured_media.push({ type: 'spotify' as const, url: spotifyUrl.trim(), title: 'Featured Music or Podcast' });
    }

    const patronage_links = [];
    if (patronUrl.trim()) {
      patronage_links.push({
        platform: 'custom' as const,
        label: patronLabel.trim() || 'Support Ministry',
        url: patronUrl.trim(),
        description: 'Direct ministry blessing (0% platform fee)',
      });
    }

    const profile: CreatorProfile = {
      id: initialProfile?.id || `creator_${Date.now()}`,
      handle: handle.replace(/^@/, '').toLowerCase().trim(),
      display_name: displayName.trim(),
      tagline: tagline.trim(),
      bio: bio.trim() || undefined,
      category,
      location: location.trim() || undefined,
      avatar_url: avatarUrl.trim() || undefined,
      banner_url: bannerUrl.trim() || undefined,
      season_verse: seasonRef.trim() ? { ref: seasonRef.trim(), quote: seasonQuote.trim() || undefined } : undefined,
      featured_media,
      patronage_links,
      social_links: initialProfile?.social_links || [
        { platform: 'website', label: 'Ministry Website', url: 'https://bible-desk.vercel.app' },
      ],
      prayer_requests: initialProfile?.prayer_requests || [
        {
          id: `pr_${Date.now()}`,
          title: 'Grace and Wisdom in Creative Calling',
          details: 'Please pray that the Lord grants wisdom, theological depth, and spiritual vitality.',
          urgency: 'normal',
          prayed_count: 1,
        },
      ],
      is_verified: initialProfile?.is_verified ?? true,
      created_at: initialProfile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCreatorProfile(profile);
    onSaved(profile);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.headerRow}>
          <h2 className={styles.modalTitle}>
            <Sparkles size={18} style={{ display: 'inline', marginRight: '0.4rem' }} />
            {initialProfile ? 'Edit Creator Profile' : 'Create Christian Creator Page'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Handle / URL (@yourname) *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. davidworship"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Display Name *</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. David Worship Collective"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Calling & Category</label>
            <select
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as CreatorCategory)}
            >
              <option value="worship">Worship Musician / Leader</option>
              <option value="podcast">Podcast Host / Video</option>
              <option value="writer">Author / Devotional Writer</option>
              <option value="pastor">Pastor / Teacher</option>
              <option value="artist">Christian Visual Artist / Painter</option>
              <option value="ministry">Missionary / Non-Profit Ministry</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tagline / Headline</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Acoustic scripture psalms & contemplative music"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Bio & Ministry Mission</label>
            <textarea
              className={styles.textarea}
              placeholder="Share what God has called you to create, your testimony, or your congregation..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Location / City</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Nashville, TN"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Scripture of the Season</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Verse ref (e.g. Psalm 34:3)"
              value={seasonRef}
              onChange={(e) => setSeasonRef(e.target.value)}
            />
            <input
              type="text"
              className={styles.input}
              placeholder="Verse quote (optional)"
              value={seasonQuote}
              onChange={(e) => setSeasonQuote(e.target.value)}
              style={{ marginTop: '0.4rem' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Patronage / Support Link (Patreon, BuyMeACoffee, Stripe, etc.)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Button Label (e.g. Support on Patreon)"
              value={patronLabel}
              onChange={(e) => setPatronLabel(e.target.value)}
            />
            <input
              type="url"
              className={styles.input}
              placeholder="URL (e.g. https://patreon.com/yourministry)"
              value={patronUrl}
              onChange={(e) => setPatronUrl(e.target.value)}
              style={{ marginTop: '0.4rem' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Featured YouTube Video URL (Optional)</label>
            <input
              type="url"
              className={styles.input}
              placeholder="e.g. https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Featured Spotify Track/Album URL (Optional)</label>
            <input
              type="url"
              className={styles.input}
              placeholder="e.g. https://open.spotify.com/track/..."
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
            />
          </div>

          <div className={styles.actionsRow}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              Publish Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
