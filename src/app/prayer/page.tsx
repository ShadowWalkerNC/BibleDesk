'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header/Header';
import { getBrowserClient } from '@/lib/supabase';
import PrayerAtlas from '@/components/PrayerAtlas/PrayerAtlas';
import { COUNTRIES_SORTED, getCountryByCode } from '@/lib/countryCoords';
import type { MissionMapPin } from '@/types/map';
import { DEFAULT_MAP_PINS } from '@/types/map';
import styles from './page.module.css';

interface PrayerRequest {
  id: string;
  user_id: string | null;
  display_name: string;
  request: string;
  likes_count: number;
  created_at: string;
  country_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_restricted?: boolean;
}

export default function PrayerBoardPage() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [newRequest, setNewRequest] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Location fields
  const [countryCode, setCountryCode] = useState('');
  const [showOnMap, setShowOnMap] = useState(true);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedAtlasPin, setSelectedAtlasPin] = useState<MissionMapPin | null>(null);

  // Track which requests the user clicked "Prayed" for in this session
  const [prayedSession, setPrayedSession] = useState<Record<string, boolean>>({});

  async function fetchPrayers() {
    setLoading(true);
    try {
      const res = await fetch('/api/prayer');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.trim()) { setPrayers([]); return; }
      const data = JSON.parse(text);
      if (data.success) setPrayers(data.prayers);
    } catch (err) {
      console.error('Failed to fetch prayers:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || '';
        setDisplayName(name);
      }
    });
    fetchPrayers();
  }, []);

  // Derive globe pins: start with defaults, then add user-submitted prayers that have location
  const globePins = useMemo<MissionMapPin[]>(() => {
    const submittedPins: MissionMapPin[] = prayers
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => ({
        id: p.id,
        latitude: p.latitude!,
        longitude: p.longitude!,
        label: p.is_restricted ? 'Restricted Region' : (p.display_name || 'Community Prayer'),
        category: 'prayer',
        text: p.is_restricted
          ? 'A prayer request from a restricted region. Pray for safety and open doors.'
          : p.request,
        urgency: 'normal',
        isRestricted: p.is_restricted ?? false,
      }));

    // Merge: default pins first, then community pins (deduplicate by id)
    const merged = [...DEFAULT_MAP_PINS];
    for (const pin of submittedPins) {
      if (!merged.find(m => m.id === pin.id)) merged.push(pin);
    }
    return merged;
  }, [prayers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newRequest.trim()) return;

    setSubmitting(true);
    setMessage(null);

    const selectedCountry = countryCode ? getCountryByCode(countryCode) : null;

    try {
      const res = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: newRequest,
          display_name: displayName || 'Anonymous Guest',
          anonymous,
          user_id: userId,
          country_code: selectedCountry?.code ?? null,
          country_name: selectedCountry?.name ?? null,
          latitude: showOnMap && selectedCountry ? selectedCountry.lat : null,
          longitude: showOnMap && selectedCountry ? selectedCountry.lng : null,
          is_restricted: selectedCountry?.isRestricted ?? false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit request');

      setMessage({ text: 'Prayer request submitted! It will appear on the map.', type: 'success' });
      setNewRequest('');
      setCountryCode('');
      setShowOnMap(true);

      // Prepend locally so it displays instantly
      setPrayers([data.prayer, ...prayers]);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit prayer request.';
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePray(id: string) {
    if (prayedSession[id]) return;
    setPrayers(prayers.map(p => p.id === id ? { ...p, likes_count: p.likes_count + 1 } : p));
    setPrayedSession({ ...prayedSession, [id]: true });
    try {
      await fetch('/api/prayer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error('Failed to register prayer increment:', err);
    }
  }

  function formatDate(dStr: string) {
    return new Date(dStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  const selectedCountryEntry = countryCode ? getCountryByCode(countryCode) : null;

  return (
    <>
      <Header />
      <main className={styles.mainContainer}>
        <div className={styles.grid}>

          {/* Left panel: Submission form + Globe */}
          <div className={styles.leftCol}>
            <div className={`${styles.formCard} glass-card`}>
              <h2 className={`${styles.formTitle} text-serif`}>Share a Prayer Request</h2>
              <p className={styles.formSubtitle}>
                Submit your request to the global church community. Pin it to the PrayerAtlas map so believers worldwide can pray with you.
              </p>

              {message && (
                <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Name */}
                <div className={styles.formGroup}>
                  <label htmlFor="display-name" className={styles.label}>Your Name</label>
                  <input
                    id="display-name"
                    type="text"
                    disabled={anonymous || submitting}
                    value={anonymous ? 'Anonymous' : displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Sarah Jenkins / Brother Thomas"
                    className={styles.input}
                  />
                </div>

                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="anon-toggle"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <label htmlFor="anon-toggle" className={styles.checkboxLabel}>Submit Anonymously</label>
                </div>

                {/* Request */}
                <div className={styles.formGroup}>
                  <label htmlFor="prayer-text" className={styles.label}>Your Request</label>
                  <textarea
                    id="prayer-text"
                    required
                    rows={5}
                    value={newRequest}
                    onChange={(e) => setNewRequest(e.target.value)}
                    placeholder="What can our community pray for? Healing, peace, guidance, family..."
                    className={styles.textarea}
                  />
                </div>

                {/* Location Section */}
                <div className={styles.locationSection}>
                  <div className={styles.locationHeader}>
                    <span className={styles.label}>Location (Optional)</span>
                    <span className={styles.locationHint}>Adds a pin on the PrayerAtlas globe</span>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="country-select" className={styles.label}>Country / Region</label>
                    <select
                      id="country-select"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className={styles.select}
                    >
                      <option value="">— Select country (optional) —</option>
                      {COUNTRIES_SORTED.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.name}{c.isRestricted ? ' (Restricted Region)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* RAN Warning */}
                  {selectedCountryEntry?.isRestricted && (
                    <div className={styles.ranWarning}>
                      <strong>Restricted Access Nation (RAN)</strong> — Your exact name and details will be protected. The map will only show a general regional marker for safety.
                    </div>
                  )}

                  {/* Show on Map toggle — only if non-RAN country selected */}
                  {countryCode && !selectedCountryEntry?.isRestricted && (
                    <div className={styles.checkboxGroup}>
                      <input
                        type="checkbox"
                        id="show-on-map"
                        checked={showOnMap}
                        onChange={(e) => setShowOnMap(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <label htmlFor="show-on-map" className={styles.checkboxLabel}>
                        Show my request as a pin on the PrayerAtlas globe
                      </label>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={submitting || !newRequest.trim()} className={styles.submitBtn}>
                  {submitting ? 'Submitting...' : 'Post Request'}
                </button>
              </form>
            </div>

            {/* 3D Globe Atlas */}
            <div className={styles.atlasWrapper}>
              <div className={styles.atlasHeader}>
                <h3 className={`${styles.atlasTitle} text-serif`}>PrayerAtlas — Global Mission Map</h3>
                <p className={styles.atlasSubtitle}>
                  {globePins.length - DEFAULT_MAP_PINS.length} community{' '}
                  {globePins.length - DEFAULT_MAP_PINS.length === 1 ? 'prayer' : 'prayers'} plotted
                </p>
              </div>
              <PrayerAtlas pins={globePins} onSelectPin={setSelectedAtlasPin} />
              {selectedAtlasPin && (
                <div className={styles.pinDetail}>
                  <div className={styles.pinDetailHeader}>
                    <span className={selectedAtlasPin.isRestricted ? styles.restrictedTag : styles.openTag}>
                      {selectedAtlasPin.isRestricted ? 'Restricted Region' : selectedAtlasPin.category.toUpperCase()}
                    </span>
                    <strong className={styles.pinLabel}>{selectedAtlasPin.label}</strong>
                  </div>
                  <p className={styles.pinText}>{selectedAtlasPin.text}</p>
                  <button onClick={() => setSelectedAtlasPin(null)} className={styles.pinDismiss}>
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Prayer Board feed */}
          <div className={styles.rightCol}>
            <div className={styles.boardHeader}>
              <h1 className={`${styles.title} text-serif`}>Church Prayer Board</h1>
              <p className={styles.subtitle}>
                &quot;Bear one another&apos;s burdens, and so fulfill the law of Christ.&quot; — Galatians 6:2
              </p>
            </div>

            {loading ? (
              <div className={styles.loadingWrapper}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '140px', width: '100%', marginBottom: '1.25rem', borderRadius: '8px' }} />
                ))}
              </div>
            ) : prayers.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No prayer requests shared yet. Be the first to share one!</p>
              </div>
            ) : (
              <div className={styles.feed}>
                {prayers.map((p) => {
                  const hasPrayed = prayedSession[p.id];
                  const hasLocation = p.latitude != null && p.longitude != null;
                  return (
                    <div key={p.id} className={`${styles.prayerCard} glass-card`}>
                      <div className={styles.cardHeader}>
                        <span className={styles.author}>{p.display_name}</span>
                        <div className={styles.cardMeta}>
                          {hasLocation && (
                            <span className={styles.mapBadge} title="Pinned on PrayerAtlas">
                              On Map
                            </span>
                          )}
                          <span className={styles.date}>{formatDate(p.created_at)}</span>
                        </div>
                      </div>
                      <p className={styles.requestText}>
                        {p.is_restricted ? '[Request protected for safety]' : p.request}
                      </p>

                      <div className={styles.cardFooter}>
                        <button
                          onClick={() => handlePray(p.id)}
                          className={`${styles.prayBtn} ${hasPrayed ? styles.prayBtnActive : ''}`}
                          title="Pray for this request"
                        >
                          {p.likes_count > 0 ? (
                            <span>{p.likes_count} {p.likes_count === 1 ? 'person' : 'people'} prayed for this</span>
                          ) : (
                            <span>Click to pray for this</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
