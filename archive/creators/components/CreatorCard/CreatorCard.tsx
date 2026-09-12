'use client';

import Link from 'next/link';
import {
  CheckCircle,
  BookOpen,
  Music,
  Mic,
  PenTool,
  Church,
  Palette,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';
import type { CreatorProfile, CreatorCategory } from '@/types/creator';
import styles from './CreatorCard.module.css';

interface CreatorCardProps {
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

export default function CreatorCard({ creator }: CreatorCardProps) {
  const CatIcon = CATEGORY_ICONS[creator.category] || HeartHandshake;

  return (
    <Link href={`/c/${encodeURIComponent(creator.handle)}`} className={styles.card}>
      <div
        className={styles.banner}
        style={{
          backgroundImage: creator.banner_url ? `url(${creator.banner_url})` : undefined,
        }}
      >
        <div className={styles.bannerOverlay} />
      </div>

      <div className={styles.body}>
        <div className={styles.headerRow}>
          {creator.avatar_url ? (
            <img
              src={creator.avatar_url}
              alt={creator.display_name}
              className={styles.avatar}
              loading="lazy"
            />
          ) : (
            <div className={styles.avatarFallback}>
              {creator.display_name.charAt(0)}
            </div>
          )}

          <div className={styles.titleArea}>
            <div className={styles.nameRow}>
              <h3 className={styles.displayName}>{creator.display_name}</h3>
              {creator.is_verified && (
                <CheckCircle size={14} className={styles.verifiedBadge} />
              )}
            </div>
            <p className={styles.handle}>@{creator.handle}</p>
          </div>
        </div>

        <p className={styles.tagline}>{creator.tagline}</p>

        {creator.season_verse && (
          <div className={styles.seasonVerse}>
            <span className={styles.verseRef}>
              <BookOpen size={13} />
              {creator.season_verse.ref}
            </span>
            {creator.season_verse.quote && (
              <p className={styles.verseQuote}>"{creator.season_verse.quote}"</p>
            )}
          </div>
        )}

        <div className={styles.metaRow}>
          <span className={styles.categoryPill}>
            <CatIcon size={12} />
            {creator.category}
          </span>

          <span className={styles.supportCue}>
            View Ministry <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
