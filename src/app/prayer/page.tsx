'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Heart, 
  MapPin, 
  Globe, 
  Plus, 
  ShieldAlert, 
  Sparkles, 
  Search, 
  Filter, 
  Share2, 
  Check, 
  X,
  Lock,
  Layers,
  Send
} from 'lucide-react';
import PageHeader from '@/components/PageHeader/PageHeader';
import PrayerAtlas from '@/components/PrayerAtlas/PrayerAtlas';
import { getBrowserClient } from '@/lib/supabase';
import { COUNTRIES_SORTED, getCountryByCode } from '@/lib/countryCoords';
import type { MissionMapPin } from '@/types/map';
import { DEFAULT_MAP_PINS } from '@/types/map';
import { createWhatsAppShareLink } from '@/lib/whatsapp';
import styles from './page.module.css';

interface PrayerRequest {
  id: string;
  user_id: string | null;
  display_name: string;
  request: string;
  likes_count: number;
  created_at: string;
  country_code?: string;
  country_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_restricted?: boolean;
}

export default function PrayerBoardPage() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // View mode: 'split' | 'globe' | 'feed'
  const [viewMode, setViewMode] = useState<'split' | 'globe' | 'feed'>('split');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterRestricted, setFilterRestricted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Pin / Prayer on the 3D Globe
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);

  // Modal for new prayer submission
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [locationPrivacy, setLocationPrivacy] = useState<'exact' | 'country_only' | 'restricted'>('country_only');

  // Track prayers clicked in this session
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

  // Derive 3D Globe Pins
  const globePins = useMemo<MissionMapPin[]>(() => {
    const submittedPins: MissionMapPin[] = prayers
      .filter(p => p.latitude != null && p.longitude != null)
      .map(p => ({
        id: p.id,
        latitude: p.latitude!,
        longitude: p.longitude!,
        label: p.is_restricted 
          ? 'Restricted Region' 
          : (p.country_name ? `${p.country_name} • ${p.display_name || 'Community'}` : (p.display_name || 'Community Prayer')),
        category: 'prayer',
        text: p.is_restricted
          ? 'A prayer request from a sensitive or restricted region. Pray for safety, strength, and church perseverance.'
          : p.request,
        urgency: 'normal',
        isRestricted: p.is_restricted ?? false,
      }));

    // Merge defaults + submitted pins
    const merged = [...DEFAULT_MAP_PINS];
    for (const pin of submittedPins) {
      if (!merged.find(m => m.id === pin.id)) merged.push(pin);
    }
    return merged;
  }, [prayers]);

  // Handle pin selection on the 3D globe
  function handleSelectPin(pin: MissionMapPin) {
    setSelectedPinId(pin.id);
    const matchedPrayer = prayers.find(p => p.id === pin.id);
    if (matchedPrayer) {
      setSelectedPrayer(matchedPrayer);
    } else {
      // Default pin fallback
      setSelectedPrayer({
        id: pin.id,
        user_id: null,
        display_name: pin.label,
        request: pin.text,
        likes_count: 12,
        created_at: new Date().toISOString(),
        is_restricted: pin.isRestricted,
      });
    }
  }

  // Handle Prayer increment
  async function handlePray(id: string) {
    if (prayedSession[id]) return;
    setPrayers(prayers.map(p => p.id === id ? { ...p, likes_count: p.likes_count + 1 } : p));
    setPrayedSession({ ...prayedSession, [id]: true });
    if (selectedPrayer && selectedPrayer.id === id) {
      setSelectedPrayer({ ...selectedPrayer, likes_count: selectedPrayer.likes_count + 1 });
    }
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

  // Handle Prayer Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newRequest.trim()) return;

    setSubmitting(true);
    setMessage(null);

    const selectedCountry = countryCode ? getCountryByCode(countryCode) : null;
    const isRestrictedSetting = locationPrivacy === 'restricted' || Boolean(selectedCountry?.isRestricted);

    try {
      const res = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: newRequest,
          display_name: (anonymous || isRestrictedSetting) ? 'Anonymous Believer' : (displayName || 'Community Member'),
          anonymous: anonymous || isRestrictedSetting,
          user_id: userId,
          country_code: selectedCountry?.code ?? null,
          country_name: isRestrictedSetting ? 'Restricted Region' : (selectedCountry?.name ?? null),
          latitude: selectedCountry ? selectedCountry.lat : null,
          longitude: selectedCountry ? selectedCountry.lng : null,
          is_restricted: isRestrictedSetting,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to submit request');

      setMessage({ text: 'Prayer request pinned to the global map!', type: 'success' });
      setNewRequest('');
      setCountryCode('');
      setIsSubmitModalOpen(false);

      setPrayers([data.prayer, ...prayers]);
      if (data.prayer.latitude && data.prayer.longitude) {
        setSelectedPinId(data.prayer.id);
        setSelectedPrayer(data.prayer);
      }
      setTimeout(() => setMessage(null), 4000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit prayer request.';
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered Prayers
  const filteredPrayers = useMemo(() => {
    return prayers.filter(p => {
      if (filterRestricted && !p.is_restricted) return false;
      if (filterCountry !== 'all' && p.country_code !== filterCountry) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = p.request.toLowerCase().includes(q);
        const matchesAuthor = p.display_name.toLowerCase().includes(q);
        const matchesCountry = (p.country_name || '').toLowerCase().includes(q);
        if (!matchesText && !matchesAuthor && !matchesCountry) return false;
      }
      return true;
    });
  }, [prayers, filterCountry, filterRestricted, searchQuery]);

  function formatDate(dStr: string) {
    return new Date(dStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  const selectedCountryEntry = countryCode ? getCountryByCode(countryCode) : null;

  return (
    <main className={styles.mainContainer}>
      <div className="container">
        <PageHeader
          icon={Globe}
          title="PrayerAtlas — 3D Global Prayer Map"
          subtitle="Submit prayer requests to the 3D globe, discover requests from worldwide believers, and intercede for sensitive & restricted regions."
          actions={
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className={styles.pinPrayerHeroBtn}
            >
              <Plus size={16} />
              <span>Pin a Prayer to Map</span>
            </button>
          }
        />

        {message && (
          <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
            {message.text}
          </div>
        )}

        {/* View Controls & Filter Bar */}
        <div className={styles.toolbar}>
          <div className={styles.viewModeGroup}>
            <button
              className={`${styles.viewModeBtn} ${viewMode === 'split' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('split')}
              title="Split View: 3D Globe + Feed"
            >
              <Layers size={14} />
              <span>Split View</span>
            </button>
            <button
              className={`${styles.viewModeBtn} ${viewMode === 'globe' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('globe')}
              title="Full 3D Globe View"
            >
              <Globe size={14} />
              <span>3D Globe</span>
            </button>
            <button
              className={`${styles.viewModeBtn} ${viewMode === 'feed' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setViewMode('feed')}
              title="Prayer Board Feed"
            >
              <Heart size={14} />
              <span>Feed ({prayers.length})</span>
            </button>
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.searchBox}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search requests, countries, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">🌍 All Nations ({prayers.length})</option>
              {COUNTRIES_SORTED.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>

            <button
              onClick={() => setFilterRestricted(!filterRestricted)}
              className={`${styles.restrictedFilterBtn} ${filterRestricted ? styles.restrictedFilterActive : ''}`}
              title="Filter to Restricted / Sensitive Regions"
            >
              <ShieldAlert size={14} />
              <span>Sensitive Regions</span>
            </button>
          </div>
        </div>

        {/* Main Workspace Layout */}
        <div className={`${styles.workspaceGrid} ${styles[`view_${viewMode}`]}`}>

          {/* ── Left / Main: 3D Globe Atlas ────────────────────────── */}
          {(viewMode === 'split' || viewMode === 'globe') && (
            <div className={styles.globeColumn}>
              <div className={`${styles.atlasCard} glass-card`}>
                <div className={styles.atlasCardHeader}>
                  <div>
                    <h2 className={styles.atlasCardTitle}>Interactive Prayer Globe</h2>
                    <p className={styles.atlasCardSubtitle}>
                      Drag to rotate • Click any glowing beacon to focus on a country and intercede.
                    </p>
                  </div>
                  <span className={styles.globePinCount}>
                    <MapPin size={13} /> {globePins.length} Global Beacons
                  </span>
                </div>

                <PrayerAtlas
                  pins={globePins}
                  selectedPinId={selectedPinId}
                  onSelectPin={handleSelectPin}
                />

                {/* Selected Prayer Spotlight Drawer */}
                {selectedPrayer && (
                  <div className={styles.spotlightCard}>
                    <div className={styles.spotlightHeader}>
                      <div className={styles.spotlightMeta}>
                        <span className={selectedPrayer.is_restricted ? styles.spotlightRestricted : styles.spotlightOpen}>
                          {selectedPrayer.is_restricted ? (
                            <><ShieldAlert size={13} /> Sensitive Region</>
                          ) : (
                            <><MapPin size={13} /> {selectedPrayer.country_name || 'Global Community'}</>
                          )}
                        </span>
                        <strong className={styles.spotlightAuthor}>{selectedPrayer.display_name}</strong>
                      </div>
                      <button
                        onClick={() => { setSelectedPrayer(null); setSelectedPinId(null); }}
                        className={styles.spotlightClose}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <p className={styles.spotlightText}>
                      &ldquo;{selectedPrayer.is_restricted && selectedPrayer.user_id ? '[Request protected for safety. Pray for peace and perseverance]' : selectedPrayer.request}&rdquo;
                    </p>

                    <div className={styles.spotlightFooter}>
                      <button
                        onClick={() => handlePray(selectedPrayer.id)}
                        className={`${styles.prayBtn} ${prayedSession[selectedPrayer.id] ? styles.prayBtnActive : ''}`}
                      >
                        <Heart size={14} fill={prayedSession[selectedPrayer.id] ? 'currentColor' : 'none'} />
                        <span>{selectedPrayer.likes_count > 0 ? `${selectedPrayer.likes_count} Amen / Prayed` : 'Pray for This'}</span>
                      </button>

                      <a
                        href={createWhatsAppShareLink(
                          `*Prayer Request for ${selectedPrayer.country_name || 'the Global Church'}*\n\n"${selectedPrayer.request}"\n\n_Join in prayer on BibleDesk:_ https://bibledesk.org/prayer`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.shareLinkBtn}
                        title="Share on WhatsApp"
                      >
                        <Share2 size={13} />
                        <span>Share</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Right / Feed Column: Community Prayer Requests ───────── */}
          {(viewMode === 'split' || viewMode === 'feed') && (
            <div className={styles.feedColumn}>
              <div className={styles.feedHeader}>
                <h3 className={styles.feedTitle}>Community Prayer Board</h3>
                <span className={styles.feedCount}>{filteredPrayers.length} requests</span>
              </div>

              {loading ? (
                <div className={styles.loadingFeed}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '16px', marginBottom: '1rem' }} />
                  ))}
                </div>
              ) : filteredPrayers.length === 0 ? (
                <div className={styles.emptyFeed}>
                  <Globe size={32} className={styles.emptyIcon} />
                  <p>No prayer requests match your filter.</p>
                  <button onClick={() => { setFilterCountry('all'); setFilterRestricted(false); setSearchQuery(''); }} className={styles.clearFilterBtn}>
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className={styles.prayerList}>
                  {filteredPrayers.map((p) => {
                    const hasPrayed = prayedSession[p.id];
                    const isSelected = selectedPinId === p.id;
                    const hasLocation = p.latitude != null && p.longitude != null;

                    return (
                      <div
                        key={p.id}
                        className={`${styles.prayerCard} glass-card ${isSelected ? styles.prayerCardSelected : ''}`}
                        onClick={() => {
                          setSelectedPinId(p.id);
                          setSelectedPrayer(p);
                        }}
                      >
                        <div className={styles.cardHeader}>
                          <div className={styles.cardAuthorRow}>
                            <span className={styles.cardAuthor}>{p.display_name}</span>
                            {p.country_name && (
                              <span className={p.is_restricted ? styles.countryBadgeRestricted : styles.countryBadge}>
                                {p.is_restricted ? <ShieldAlert size={11} /> : <MapPin size={11} />}
                                {p.country_name}
                              </span>
                            )}
                          </div>
                          <span className={styles.cardDate}>{formatDate(p.created_at)}</span>
                        </div>

                        <p className={styles.cardText}>
                          {p.is_restricted && p.user_id ? '[Request protected for safety. Pray for boldness and peace]' : p.request}
                        </p>

                        <div className={styles.cardActions}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePray(p.id);
                            }}
                            className={`${styles.prayBtnSmall} ${hasPrayed ? styles.prayBtnActive : ''}`}
                          >
                            <Heart size={13} fill={hasPrayed ? 'currentColor' : 'none'} />
                            <span>{p.likes_count > 0 ? `${p.likes_count} Amen` : 'Pray'}</span>
                          </button>

                          {hasLocation && (
                            <span className={styles.globeFocusHint}>
                              <Globe size={12} /> Pin on Map
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Submit Prayer Modal / Drawer ────────────────────────── */}
        {isSubmitModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsSubmitModalOpen(false)}>
            <div className={`${styles.modalCard} glass-card`} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h3 className={styles.modalTitle}>Pin a Prayer Request</h3>
                  <p className={styles.modalSubtitle}>Share with the global body of Christ on the PrayerAtlas map.</p>
                </div>
                <button onClick={() => setIsSubmitModalOpen(false)} className={styles.modalCloseBtn}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="modal-name" className={styles.label}>Your Name (Optional)</label>
                  <input
                    id="modal-name"
                    type="text"
                    disabled={anonymous || submitting}
                    value={anonymous ? 'Anonymous Believer' : displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Sister Maria, Pastor David, or Guest"
                    className={styles.input}
                  />
                </div>

                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="modal-anon"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <label htmlFor="modal-anon" className={styles.checkboxLabel}>Submit Anonymously</label>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="modal-request" className={styles.label}>Prayer Request</label>
                  <textarea
                    id="modal-request"
                    required
                    rows={4}
                    value={newRequest}
                    onChange={(e) => setNewRequest(e.target.value)}
                    placeholder="What would you like the global church community to pray for?"
                    className={styles.textarea}
                  />
                </div>

                {/* Privacy & Location Choice */}
                <div className={styles.privacySection}>
                  <label className={styles.label}>Location &amp; Privacy Level</label>
                  <div className={styles.privacyGrid}>
                    <button
                      type="button"
                      className={`${styles.privacyOption} ${locationPrivacy === 'country_only' ? styles.privacyOptionActive : ''}`}
                      onClick={() => setLocationPrivacy('country_only')}
                    >
                      <Globe size={16} />
                      <div>
                        <strong>Country-Level Pin</strong>
                        <span>Marks the nation on the 3D globe; hides city &amp; exact coordinates.</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`${styles.privacyOption} ${locationPrivacy === 'restricted' ? styles.privacyOptionActive : ''}`}
                      onClick={() => setLocationPrivacy('restricted')}
                    >
                      <ShieldAlert size={16} />
                      <div>
                        <strong>Sensitive / Restricted Region</strong>
                        <span>Protects identity &amp; exact location with a shield marker for persecuted church prayer.</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="modal-country" className={styles.label}>Select Nation</label>
                  <select
                    id="modal-country"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">— Select Country / Region —</option>
                    {COUNTRIES_SORTED.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.name} {c.isRestricted ? '🛡️ (Restricted Region)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newRequest.trim()}
                    className={styles.submitBtn}
                  >
                    <Send size={15} />
                    <span>{submitting ? 'Pinning to Globe...' : 'Pin Prayer to Map'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
