'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  BookOpen,
  MapPin,
  Church,
  Heart,
  Share2,
  ExternalLink,
  ArrowRight,
  Music,
  Mic,
  PenTool,
  Palette,
  HeartHandshake,
  Coffee,
  DollarSign,
  Globe,
  Radio,
  Video,
  MessageCircle,
  Send,
} from 'lucide-react';
import type { CreatorProfile, CreatorCategory, SocialLink, PatronageLink } from '@/types/creator';
import { incrementPrayerCount } from '@/lib/creatorStore';
import styles from './CreatorProfileView.module.css';

interface CreatorProfileViewProps {
  creator: CreatorProfile;
}

const CATEGORY_ICONS: Record<CreatorCategory, typeof Music> = {
  worship: Music,
  podcast: Mic,
  writer: PenTool,
  pastor: Church,
  artist: Palette,
  ministry: HeartHandshake,
};

const SOCIAL_ICONS: Record<string, typeof Globe> = {
  youtube: Video,
  instagram: MessageCircle,
  x: Send,
  twitter: Send,
  website: Globe,
  spotify: Music,
  apple_music: Music,
  substack: PenTool,
};

export default function CreatorProfileView({ creator }: CreatorProfileViewProps) {
  const [profile, setProfile] = useState<CreatorProfile>(creator);
  const [copied, setCopied] = useState(false);
  const [prayingMap, setPrayingMap] = useState<Record<string, boolean>>({});

  const CatIcon = CATEGORY_ICONS[profile.category] || HeartHandshake;

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handlePray = (prayerId: string) => {
    if (prayingMap[prayerId]) return;
    const newCount = incrementPrayerCount(profile.handle, prayerId);
    setPrayingMap((prev) => ({ ...prev, [prayerId]: true }));
    setProfile((prev) => {
      const updatedPrayers = (prev.prayer_requests || []).map((p) =>
        p.id === prayerId ? { ...p, prayed_count: newCount } : p
      );
      return { ...prev, prayer_requests: updatedPrayers };
    });
  };

  // Convert YouTube / Spotify URL to embed safe URL if possible
  const getEmbedUrl = (media: { type: string; url: string }) => {
    if (media.type === 'youtube') {
      const match = media.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    }
    if (media.type === 'spotify') {
      if (media.url.includes('open.spotify.com/')) {
        return media.url.replace('open.spotify.com/', 'open.spotify.com/embed/');
      }
    }
    return null;
  };

  return (
    <div className={styles.container}>
      {/* Banner */}
      <div
        className={styles.banner}
        style={{
          backgroundImage: profile.banner_url ? `url(${profile.banner_url})` : undefined,
        }}
      >
        <div className={styles.bannerOverlay} />
      </div>

      {/* Header Profile Area */}
      <div className={styles.profileHeader}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarFallback}>
            {profile.display_name.charAt(0)}
          </div>
        )}

        <div className={styles.nameRow}>
          <h1 className={styles.displayName}>{profile.display_name}</h1>
          {profile.is_verified && (
            <CheckCircle size={18} className={styles.verifiedBadge} />
          )}
        </div>

        <p className={styles.handle}>@{profile.handle}</p>
        <p className={styles.tagline}>{profile.tagline}</p>

        <div className={styles.metaPills}>
          <span className={styles.metaPill}>
            <CatIcon size={12} />
            {profile.category}
          </span>
          {profile.location && (
            <span className={styles.metaPill}>
              <MapPin size={12} />
              {profile.location}
            </span>
          )}
          {profile.church_affiliation && (
            <span className={styles.metaPill}>
              <Church size={12} />
              {profile.church_affiliation}
            </span>
          )}
          <button
            type="button"
            className={styles.metaPill}
            onClick={handleShare}
            style={{ cursor: 'pointer' }}
          >
            <Share2 size={12} />
            {copied ? 'Link Copied!' : 'Share Page'}
          </button>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className={styles.bioCard}>
          <p style={{ margin: 0 }}>{profile.bio}</p>
        </div>
      )}

      {/* Season Verse Block */}
      {profile.season_verse?.ref && (
        <div className={styles.verseCard}>
          <div className={styles.verseHeader}>
            <span className={styles.verseLabel}>
              <BookOpen size={13} />
              Scripture of the Season
            </span>
            <Link
              href={`/bible?q=${encodeURIComponent(profile.season_verse.ref)}`}
              className={styles.verseLinkBtn}
            >
              Read in Desk <ArrowRight size={11} />
            </Link>
          </div>

          {profile.season_verse.quote && (
            <p className={styles.verseQuoteText}>"{profile.season_verse.quote}"</p>
          )}
          <span className={styles.verseCitation}>— {profile.season_verse.ref}</span>
        </div>
      )}

      {/* Patronage & Support Buttons */}
      {profile.patronage_links && profile.patronage_links.length > 0 && (
        <div>
          <h2 className={styles.sectionTitle}>
            <Heart size={16} style={{ color: 'var(--gold-400)' }} />
            Support Ministry & Calling
          </h2>
          <div className={styles.patronageGrid}>
            {profile.patronage_links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.patronageBtn}
              >
                <div className={styles.patronageLeft}>
                  <div className={styles.patronageIconWrap}>
                    {link.platform === 'buymeacoffee' ? (
                      <Coffee size={18} />
                    ) : (
                      <DollarSign size={18} />
                    )}
                  </div>
                  <div className={styles.patronageInfo}>
                    <span className={styles.patronageLabel}>{link.label}</span>
                    {link.description && (
                      <span className={styles.patronageDesc}>{link.description}</span>
                    )}
                  </div>
                </div>
                <ExternalLink size={15} style={{ opacity: 0.7 }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Prayer Requests Block */}
      {profile.prayer_requests && profile.prayer_requests.length > 0 && (
        <div>
          <h2 className={styles.sectionTitle}>
            <HeartHandshake size={16} style={{ color: 'var(--dim-practical)' }} />
            Ministry Prayer Requests
          </h2>
          <div className={styles.prayerCard}>
            {profile.prayer_requests.map((prayer) => (
              <div key={prayer.id} className={styles.prayerItem}>
                <div className={styles.prayerLeft}>
                  <div className={styles.prayerTitleRow}>
                    <h3 className={styles.prayerTitle}>{prayer.title}</h3>
                    {prayer.urgency === 'urgent' && (
                      <span className={styles.urgencyBadge}>Urgent</span>
                    )}
                  </div>
                  {prayer.details && (
                    <p className={styles.prayerDetails}>{prayer.details}</p>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.prayButton}
                  onClick={() => handlePray(prayer.id)}
                  disabled={prayingMap[prayer.id]}
                >
                  <Heart
                    size={14}
                    fill={prayingMap[prayer.id] ? '#f472b6' : 'none'}
                  />
                  <span>{prayingMap[prayer.id] ? 'Prayed' : 'I Prayed'}</span>
                  <span className={styles.prayCount}>
                    {prayer.prayed_count || 0}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Media (YouTube / Spotify) */}
      {profile.featured_media && profile.featured_media.length > 0 && (
        <div>
          <h2 className={styles.sectionTitle}>
            <Radio size={16} style={{ color: 'var(--gold-400)' }} />
            Featured Worship & Messages
          </h2>
          <div className={styles.mediaGrid}>
            {profile.featured_media.map((media, idx) => {
              const embedUrl = getEmbedUrl(media);
              if (!embedUrl) return null;
              return (
                <div key={idx} className={styles.mediaItem}>
                  {media.title && <p className={styles.mediaTitle}>{media.title}</p>}
                  <div className={styles.mediaFrameWrap}>
                    <iframe
                      src={embedUrl}
                      title={media.title || 'Featured media'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Social and Ministry Links */}
      {profile.social_links && profile.social_links.length > 0 && (
        <div>
          <h2 className={styles.sectionTitle}>
            <Globe size={16} style={{ color: 'var(--text-muted)' }} />
            Connect Across the Kingdom
          </h2>
          <div className={styles.socialGrid}>
            {profile.social_links.map((link, idx) => {
              const IconComp = SOCIAL_ICONS[link.platform] || Globe;
              return (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialBtn}
                >
                  <IconComp size={15} />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Branding Note */}
      <div className={styles.footerNote}>
        <p>
          Christian Creator Profile powered by{' '}
          <Link href="/">BibleDesk</Link> · 100% Free Kingdom Platform
        </p>
      </div>
    </div>
  );
}
