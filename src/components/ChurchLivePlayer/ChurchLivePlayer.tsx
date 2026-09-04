'use client';

import { useState } from 'react';
import { Tv, X, RefreshCw, ExternalLink } from 'lucide-react';
import styles from './ChurchLivePlayer.module.css';

interface ChurchLivePlayerProps {
  initialUrl?: string;
  churchName?: string;
  onClose?: () => void;
}

export function parseStreamEmbedUrl(inputUrl: string): string {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();

  // 1. YouTube Watch URL
  const ytWatchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytWatchMatch && ytWatchMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytWatchMatch[1]}?autoplay=1&rel=0`;
  }

  // 2. YouTube Channel Live Stream
  const ytChannelMatch = trimmed.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (ytChannelMatch && ytChannelMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/live_stream?channel=${ytChannelMatch[1]}&autoplay=1`;
  }

  // 3. YouTube Channel ID directly (UC...)
  if (trimmed.startsWith('UC') && trimmed.length >= 22) {
    return `https://www.youtube-nocookie.com/embed/live_stream?channel=${trimmed}&autoplay=1`;
  }

  // 4. Facebook Video URL
  if (trimmed.includes('facebook.com')) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false&autoplay=true`;
  }

  // 5. Already an embed URL or other iframe
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Fallback as video ID if 11 chars
  if (trimmed.length === 11) {
    return `https://www.youtube-nocookie.com/embed/${trimmed}?autoplay=1&rel=0`;
  }

  return trimmed;
}

export default function ChurchLivePlayer({
  initialUrl = 'https://www.youtube.com/watch?v=live_stream',
  churchName = 'Live Church Sermon Broadcast',
  onClose,
}: ChurchLivePlayerProps) {
  const [streamInput, setStreamInput] = useState(initialUrl);
  const [embedUrl, setEmbedUrl] = useState(() => parseStreamEmbedUrl(initialUrl));

  const handleUpdateStream = (e: React.FormEvent) => {
    e.preventDefault();
    setEmbedUrl(parseStreamEmbedUrl(streamInput));
  };

  const handleApplyPreset = (url: string) => {
    setStreamInput(url);
    setEmbedUrl(parseStreamEmbedUrl(url));
  };

  return (
    <section className={styles.liveContainer} aria-label="Live Church Broadcast Theatre">
      <div className={styles.liveHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={styles.badgeLive}>
            <div className={styles.liveDot} />
            <span>Live Broadcast</span>
          </div>
          <h3 className={styles.churchTitle}>{churchName}</h3>
        </div>

        <form onSubmit={handleUpdateStream} className={styles.inputRow}>
          <input
            type="text"
            placeholder="Paste YouTube Live URL, Channel ID, or Facebook Live link..."
            value={streamInput}
            onChange={(e) => setStreamInput(e.target.value)}
            className={styles.urlInput}
            aria-label="Stream URL or Channel ID"
          />
          <button type="submit" className={styles.updateBtn} title="Load stream">
            <RefreshCw size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Load
          </button>
        </form>

        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close live stream player">
            <X size={18} />
          </button>
        )}
      </div>

      <div className={styles.videoWrapper}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title="Church Live Stream"
            className={styles.iframeVideo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9c8e79' }}>
            Enter a YouTube Live or Facebook Live stream URL above to begin watching.
          </div>
        )}
      </div>

      <div className={styles.presetBar}>
        <span>Quick Test Presets:</span>
        <button
          type="button"
          className={styles.presetBtn}
          onClick={() => handleApplyPreset('https://www.youtube.com/watch?v=5qap5aO4i9A')}
        >
          Lofi Christian Worship
        </button>
        <button
          type="button"
          className={styles.presetBtn}
          onClick={() => handleApplyPreset('https://www.youtube.com/watch?v=f2nNfI9u77U')}
        >
          Scripture Hymns Ambient
        </button>
      </div>
    </section>
  );
}
