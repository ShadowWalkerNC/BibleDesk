'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  ExternalLink,
  Music,
  Disc,
} from 'lucide-react';
import styles from './LiveRadioPlayer.module.css';

interface RadioStation {
  id: string;
  name: string;
  category: string;
  streamUrl: string;
}

const STATIONS: RadioStation[] = [
  {
    id: 'abiding-sacred',
    name: 'Abiding Radio (Sacred Hymns)',
    category: 'Choral & Classical Hymns',
    streamUrl: 'https://stream.abidingradio.org/sacred',
  },
  {
    id: 'abiding-instrumental',
    name: 'Abiding Radio (Instrumental)',
    category: 'Piano & Orchestral Meditation',
    streamUrl: 'https://stream.abidingradio.org/instrumental',
  },
  {
    id: 'moody-radio',
    name: 'Moody Radio (Chicago Live)',
    category: 'Christian Teaching & Worship',
    streamUrl: 'https://primary.moodyradio.org/chicago.mp3',
  },
];

export default function LiveRadioPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState<RadioStation>(STATIONS[0]);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Listen to custom event to open the player from Header or anywhere
    const handleOpenRadio = () => setIsOpen(true);
    window.addEventListener('bibledesk:open-radio', handleOpenRadio);
    return () => window.removeEventListener('bibledesk:open-radio', handleOpenRadio);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      setHasError(false);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsPlaying(false);
          setIsLoading(false);
          setHasError(true);
        });
    }
  };

  const handleStationChange = (stationId: string) => {
    const station = STATIONS.find((s) => s.id === stationId);
    if (!station) return;

    setCurrentStation(station);
    setHasError(false);

    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.src = station.streamUrl;
      audioRef.current.load();
      if (wasPlaying) {
        setIsLoading(true);
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch(() => {
            setIsPlaying(false);
            setIsLoading(false);
            setHasError(true);
          });
      }
    }
  };

  return (
    <aside className={styles.dockContainer} aria-label="Christian Worship Radio Dock">
      <audio
        ref={audioRef}
        src={currentStation.streamUrl}
        preload="none"
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onError={() => {
          setIsPlaying(false);
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {/* Floating collapsed pill */}
      {!isOpen ? (
        <button
          type="button"
          className={styles.floatingToggleBtn}
          onClick={() => setIsOpen(true)}
          title="Open Christian Worship Radio & Ambient Praise"
        >
          <div className={isPlaying ? styles.pulsingDot : ''}>
            <Radio size={16} color={isPlaying ? '#10b981' : '#b58414'} />
          </div>
          <span>{isPlaying ? `Playing: ${currentStation.name.split(' ')[0]}` : 'Worship Radio'}</span>
        </button>
      ) : (
        /* Expanded Player Card */
        <div className={styles.playerCard} role="region" aria-label="Worship Radio Player">
          <div className={styles.playerHeader}>
            <div className={styles.headerTitleBox}>
              <Radio size={18} color="#b58414" />
              <div>
                <h3 className={styles.headerTitle}>Worship Radio</h3>
                <span className={styles.headerSubtitle}>Live Ambient Praise</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.minimizeBtn}
              onClick={() => setIsOpen(false)}
              aria-label="Minimize radio player"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Now Playing info */}
          <div className={styles.nowPlayingSection}>
            <div className={styles.stationAvatar}>
              {isPlaying ? <Disc size={24} className="animate-spin" /> : <Music size={22} />}
            </div>
            <div className={styles.stationInfo}>
              <div className={styles.stationName}>{currentStation.name}</div>
              <div className={styles.stationCategory}>{currentStation.category}</div>
            </div>
          </div>

          {hasError && (
            <div style={{ fontSize: '0.76rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px' }}>
              Stream unavailable or connecting. Try selecting another station below.
            </div>
          )}

          {/* Station selector */}
          <select
            className={styles.selectStation}
            value={currentStation.id}
            onChange={(e) => handleStationChange(e.target.value)}
            aria-label="Select radio station"
          >
            {STATIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Controls Bar */}
          <div className={styles.controlsRow}>
            <button
              type="button"
              className={styles.playToggleBtn}
              onClick={togglePlay}
              disabled={isLoading}
              aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
            </button>

            <div className={styles.volumeBox}>
              <button
                type="button"
                className={styles.minimizeBtn}
                onClick={() => setIsMuted(!isMuted)}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className={styles.volumeSlider}
                aria-label="Volume slider"
              />
            </div>
          </div>

          {/* Partner Docks (K-LOVE, Air1, Moody) */}
          <div className={styles.externalStationsTitle}>Official Station Partners</div>
          <div className={styles.externalRow}>
            <a
              href="https://www.klove.com/listen"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalStationCard}
              title="Listen to K-LOVE official player in new window"
            >
              <span>K-LOVE Live</span>
              <ExternalLink size={11} color="#b58414" />
            </a>
            <a
              href="https://www.air1.com/listen"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalStationCard}
              title="Listen to Air1 Worship official player in new window"
            >
              <span>Air1 Worship</span>
              <ExternalLink size={11} color="#b58414" />
            </a>
            <a
              href="https://www.moodyradio.org/listen"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalStationCard}
              title="Listen to Moody Radio Network in new window"
            >
              <span>Moody Net</span>
              <ExternalLink size={11} color="#b58414" />
            </a>
          </div>
        </div>
      )}
    </aside>
  );
}
