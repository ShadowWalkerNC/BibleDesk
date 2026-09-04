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
  Send,
  Calendar,
  Clock,
  UserCheck,
  MessageCircle,
  Copy,
  Mail,
  Phone,
  Smile,
  RefreshCw,
  Bell,
  ChevronRight
} from 'lucide-react';
import PageHeader from '@/components/PageHeader/PageHeader';
import PrayerAtlas from '@/components/PrayerAtlas/PrayerAtlas';
import { getBrowserClient } from '@/lib/supabase';
import { COUNTRIES_SORTED, getCountryByCode } from '@/lib/countryCoords';
import type { MissionMapPin } from '@/types/map';
import { DEFAULT_MAP_PINS } from '@/types/map';
import { createWhatsAppShareLink } from '@/lib/whatsapp';
import { 
  PrayerContact, 
  PrayerCommitment, 
  PrayerCategory, 
  RecurrenceRule,
  CheckinOutcome,
  FollowupChannel
} from '@/types/prayerCare';
import { 
  loadPrayerCareStore, 
  addContactToStore, 
  addCommitmentToStore, 
  performCheckin, 
  recordFollowupInStore,
  FOLLOWUP_TEMPLATES 
} from '@/lib/prayerCareLocal';
import styles from './page.module.css';

interface PublicPrayerRequest {
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

type MainTab = 'today' | 'circle' | 'community' | 'world' | 'answered';

export default function PrayerBoardPage() {
  // Navigation: Primary Segments
  const [activeTab, setActiveTab] = useState<MainTab>('today');

  // ── Public Prayers & Globe State ──────────────────────────────────────────
  const [prayers, setPrayers] = useState<PublicPrayerRequest[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [submittingPublic, setSubmittingPublic] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // View mode for Public Board: 'split' | 'globe' | 'feed'
  const [viewMode, setViewMode] = useState<'split' | 'globe' | 'feed'>('split');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterRestricted, setFilterRestricted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Pin on Globe
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<PublicPrayerRequest | null>(null);

  // Modal for new Public prayer submission
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [locationPrivacy, setLocationPrivacy] = useState<'exact' | 'country_only' | 'restricted'>('country_only');
  const [prayedSession, setPrayedSession] = useState<Record<string, boolean>>({});

  // ── Prayer Care Workflow State (Local-first & Supabase synced) ───────────
  const [contacts, setContacts] = useState<PrayerContact[]>([]);
  const [commitments, setCommitments] = useState<PrayerCommitment[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal: Add New Person & Prayer Commitment
  const [isAddCommitmentModalOpen, setIsAddCommitmentModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactCategory, setContactCategory] = useState<PrayerCategory>('Friend');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSensitive, setContactSensitive] = useState(false);
  const [commitmentTitle, setCommitmentTitle] = useState('');
  const [commitmentDetails, setCommitmentDetails] = useState('');
  const [commitmentRule, setCommitmentRule] = useState<RecurrenceRule>('daily');

  // Modal: Care Follow-up Composer
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [selectedFollowupContact, setSelectedFollowupContact] = useState<PrayerContact | null>(null);
  const [selectedFollowupCommitment, setSelectedFollowupCommitment] = useState<PrayerCommitment | null>(null);
  const [followupMessage, setFollowupMessage] = useState(FOLLOWUP_TEMPLATES[0].text);
  const [followupChannel, setFollowupChannel] = useState<FollowupChannel>('whatsapp');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Check-in Note Modal
  const [checkinNoteModalOpen, setCheckinNoteModalOpen] = useState(false);
  const [pendingCheckinCommitment, setPendingCheckinCommitment] = useState<PrayerCommitment | null>(null);
  const [privateNote, setPrivateNote] = useState('');

  // ── Multi-Channel Reminders & Digest State ────────────────────────────────
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [digestSending, setDigestSending] = useState(false);

  // Initial Load
  useEffect(() => {
    // 1. Load Local Prayer Care Store
    const store = loadPrayerCareStore();
    setContacts(store.contacts);
    setCommitments(store.commitments);

    // 2. Auth Session Check
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || '';
        setDisplayName(name);
      }
    });

    // 3. Check browser notification support
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // 4. Fetch Public Community Prayers
    fetchPublicPrayers();
  }, []);

  async function fetchPublicPrayers() {
    setLoadingPublic(true);
    try {
      const res = await fetch('/api/prayer');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.trim()) { setPrayers([]); return; }
      const data = JSON.parse(text);
      if (data.success) setPrayers(data.prayers);
    } catch (err) {
      console.error('Failed to fetch public prayers:', err);
    } finally {
      setLoadingPublic(false);
    }
  }

  // ── Due Commitments ("Today in Prayer" Queue) ────────────────────────────
  const dueCommitments = useMemo(() => {
    const now = new Date();
    return commitments.filter(c => {
      if (c.status !== 'active') return false;
      const due = new Date(c.next_due_at);
      return due <= now;
    });
  }, [commitments]);

  // Answered Commitments
  const answeredCommitments = useMemo(() => {
    return commitments.filter(c => c.status === 'answered');
  }, [commitments]);

  // Filtered Contacts for "My Circle"
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (c.is_archived) return false;
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      return true;
    });
  }, [contacts, categoryFilter]);

  // Globe Pins
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

    const merged = [...DEFAULT_MAP_PINS];
    for (const pin of submittedPins) {
      if (!merged.find(m => m.id === pin.id)) merged.push(pin);
    }
    return merged;
  }, [prayers]);

  // ── Actions: Check-in & Care Workflow ────────────────────────────────────

  function handleCheckin(commitment: PrayerCommitment, outcome: CheckinOutcome) {
    if (outcome === 'prayed') {
      setPendingCheckinCommitment(commitment);
      setCheckinNoteModalOpen(true);
    } else {
      executeCheckin(commitment.id, outcome);
    }
  }

  function executeCheckin(commitmentId: string, outcome: CheckinOutcome, note?: string) {
    const store = loadPrayerCareStore();
    const result = performCheckin(store, commitmentId, outcome, note);
    setCommitments(result.store.commitments);

    const commitment = store.commitments.find(c => c.id === commitmentId);
    const contact = contacts.find(c => c.id === commitment?.contact_id);

    if (outcome === 'prayed' && contact) {
      // Offer optional follow-up care
      setSelectedFollowupContact(contact);
      setSelectedFollowupCommitment(commitment || null);
      setFollowupMessage(`I prayed for you today regarding "${commitment?.title}". How are you doing?`);
      setFollowupModalOpen(true);
    } else if (outcome === 'snoozed') {
      setMessage({ text: 'Prayer snoozed for 24 hours. Grace over streaks.', type: 'success' });
      setTimeout(() => setMessage(null), 3500);
    } else if (outcome === 'answered') {
      setMessage({ text: 'Praise God! Prayer recorded in your Answered Gratitude log.', type: 'success' });
      setTimeout(() => setMessage(null), 4000);
    }
  }

  function handleCreateCommitment(e: React.FormEvent) {
    e.preventDefault();
    if (!commitmentTitle.trim() || !contactName.trim()) return;

    let store = loadPrayerCareStore();
    // 1. Add contact
    const { store: storeWithContact, contact } = addContactToStore(store, {
      display_name: contactName,
      category: contactCategory,
      email: contactEmail,
      phone: contactPhone,
      is_sensitive: contactSensitive
    });

    // 2. Add commitment
    const { store: finalStore } = addCommitmentToStore(storeWithContact, {
      contact_id: contact.id,
      title: commitmentTitle,
      private_details: commitmentDetails,
      recurrence_rule: commitmentRule
    });

    setContacts(finalStore.contacts);
    setCommitments(finalStore.commitments);
    setIsAddCommitmentModalOpen(false);

    // Reset fields
    setContactName('');
    setCommitmentTitle('');
    setCommitmentDetails('');
    setContactEmail('');
    setContactPhone('');
    setContactSensitive(false);

    setMessage({ text: `Added ${contact.display_name} to your Prayer Circle.`, type: 'success' });
    setTimeout(() => setMessage(null), 3500);
  }

  function handleSendFollowup() {
    if (!followupMessage.trim() || !selectedFollowupContact) return;

    // Record follow-up event in store
    const store = loadPrayerCareStore();
    recordFollowupInStore(store, {
      contact_id: selectedFollowupContact.id,
      channel: followupChannel,
      recipient: followupChannel === 'email' 
        ? selectedFollowupContact.email 
        : (followupChannel === 'whatsapp' || followupChannel === 'sms')
          ? selectedFollowupContact.phone 
          : 'clipboard',
      message: followupMessage,
      status: 'sent',
    });

    if (followupChannel === 'clipboard') {
      navigator.clipboard.writeText(followupMessage);
      setCopiedSuccess(true);
      setTimeout(() => {
        setCopiedSuccess(false);
        setFollowupModalOpen(false);
      }, 1500);
    } else if (followupChannel === 'whatsapp') {
      const link = createWhatsAppShareLink(
        followupMessage,
        selectedFollowupContact.phone || undefined
      );
      window.open(link, '_blank');
      setFollowupModalOpen(false);
    } else if (followupChannel === 'sms') {
      const cleanPhone = (selectedFollowupContact.phone || '').replace(/[^0-9+]/g, '');
      const body = encodeURIComponent(followupMessage);
      window.location.href = `sms:${cleanPhone}?body=${body}`;
      setFollowupModalOpen(false);
    } else if (followupChannel === 'email') {
      const email = selectedFollowupContact.email || '';
      const subject = encodeURIComponent('Thinking of you and praying today');
      const body = encodeURIComponent(followupMessage);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      setFollowupModalOpen(false);
    }
  }

  // ── Multi-Channel Reminder & Digest Handlers ──────────────────────────────
  async function handleRequestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setMessage({ text: 'Web push notifications are not supported on this browser.', type: 'error' });
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setMessage({ text: 'Prayer reminders enabled! You will be notified when prayers are due.', type: 'success' });
        setTimeout(() => setMessage(null), 3500);
      } else {
        setMessage({ text: 'Notifications were denied. Please enable them in your browser settings.', type: 'error' });
      }
    } catch (e) {
      console.error('Notification permission error:', e);
    }
  }

  function handleSendTestNotification() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      handleRequestNotificationPermission();
      return;
    }
    const samplePerson = dueCommitments[0]?.contact_id 
      ? contacts.find(c => c.id === dueCommitments[0].contact_id)?.display_name 
      : 'Sarah (Family)';
    const sampleTitle = dueCommitments[0]?.title || 'Health, peace, and spiritual strength';

    new Notification(`Time to Pray for ${samplePerson}`, {
      body: `${sampleTitle} — Open BibleDesk to pray and check in.`,
      icon: '/icon-192.png',
    });

    setMessage({ text: 'Test reminder notification sent to your device!', type: 'success' });
    setTimeout(() => setMessage(null), 3500);
  }

  async function handleSendEmailDigest() {
    setDigestSending(true);
    try {
      const supabase = getBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/prayer/digest?send=true', { headers });
      const data = await res.json();

      if (data.success) {
        setMessage({ 
          text: `Daily Prayer Digest generated! (${data.dueCount} prayers scheduled). Check your email inbox.`, 
          type: 'success' 
        });
      } else {
        setMessage({ 
          text: data.error || 'Please sign in to email daily prayer digests.', 
          type: 'error' 
        });
      }
    } catch (err) {
      console.error('Email digest error:', err);
      setMessage({ text: 'Failed to generate prayer digest email.', type: 'error' });
    } finally {
      setDigestSending(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  // Public Board Handlers
  async function handlePublicPray(id: string) {
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

  async function handlePublicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newRequest.trim()) return;

    setSubmittingPublic(true);
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
      fetchPublicPrayers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Error submitting prayer request', type: 'error' });
    } finally {
      setSubmittingPublic(false);
    }
  }

  return (
    <main className={styles.mainContainer}>
      <div className="container">
        <PageHeader
          icon={Heart}
          title="Pastoral Prayer Care &amp; Intercession"
          subtitle="A quiet space to remember who you committed to pray for, follow up with genuine pastoral care, and stand with believers worldwide."
          actions={
            <div className={styles.headerActions}>
              <button
                onClick={() => setIsAddCommitmentModalOpen(true)}
                className={styles.addCareBtn}
              >
                <Plus size={16} />
                <span>Add to Prayer Circle</span>
              </button>
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className={styles.pinPrayerHeroBtn}
              >
                <Globe size={16} />
                <span>Pin to Global Map</span>
              </button>
            </div>
          }
        />

        {message && (
          <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
            {message.text}
          </div>
        )}

        {/* ── Segmented Navigation (Jakob's Law Mobile-Friendly) ─────── */}
        <nav className={styles.segmentedNav} aria-label="Prayer Workspace Sections">
          <button
            className={`${styles.segmentBtn} ${activeTab === 'today' ? styles.segmentBtnActive : ''}`}
            onClick={() => setActiveTab('today')}
          >
            <Clock size={16} />
            <span>Today in Prayer</span>
            {dueCommitments.length > 0 && (
              <span className={styles.badgeCount}>{dueCommitments.length}</span>
            )}
          </button>

          <button
            className={`${styles.segmentBtn} ${activeTab === 'circle' ? styles.segmentBtnActive : ''}`}
            onClick={() => setActiveTab('circle')}
          >
            <UserCheck size={16} />
            <span>My Circle ({contacts.length})</span>
          </button>

          <button
            className={`${styles.segmentBtn} ${activeTab === 'community' ? styles.segmentBtnActive : ''}`}
            onClick={() => setActiveTab('community')}
          >
            <Heart size={16} />
            <span>Community Wall ({prayers.length})</span>
          </button>

          <button
            className={`${styles.segmentBtn} ${activeTab === 'world' ? styles.segmentBtnActive : ''}`}
            onClick={() => setActiveTab('world')}
          >
            <Globe size={16} />
            <span>World PrayerAtlas</span>
          </button>

          <button
            className={`${styles.segmentBtn} ${activeTab === 'answered' ? styles.segmentBtnActive : ''}`}
            onClick={() => setActiveTab('answered')}
          >
            <Sparkles size={16} />
            <span>Answered ({answeredCommitments.length})</span>
          </button>
        </nav>

        {/* ── 1. Tab: Today in Prayer (Due Queue) ────────────────────── */}
        {activeTab === 'today' && (
          <section className={styles.sectionContainer}>
            <div className={styles.sectionIntro}>
              <h2 className={styles.sectionTitle}>Today&apos;s Intercession Rhythm</h2>
              <p className={styles.sectionDesc}>
                Take a quiet moment before God. Mark when you have prayed, take an optional note, or follow up with pastoral care.
              </p>
            </div>

            {/* Multi-channel Reminders & Daily Digest Control Bar */}
            <div className={styles.remindersBanner}>
              <div className={styles.remindersInfo}>
                <div className={styles.remindersIcon}>
                  <Bell size={20} />
                </div>
                <div>
                  <h4 className={styles.remindersTitle}>Daily Intercession Reminders</h4>
                  <p className={styles.remindersSubtitle}>
                    {notificationPermission === 'granted'
                      ? 'Device push reminders are active. You will be alerted when commitments are due.'
                      : 'Enable gentle browser notifications to be reminded when friends need prayer.'}
                  </p>
                </div>
              </div>

              <div className={styles.remindersActions}>
                {notificationPermission === 'granted' ? (
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className={styles.reminderActionBtn}
                    title="Send a sample reminder alert to verify device notifications"
                  >
                    <Bell size={14} />
                    <span>Test Device Alert</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotificationPermission}
                    className={styles.reminderActionBtn}
                    title="Enable browser notifications"
                  >
                    <Bell size={14} />
                    <span>Enable Reminders</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={digestSending}
                  onClick={handleSendEmailDigest}
                  className={styles.reminderDigestBtn}
                  title="Generate and email today's intercession digest to your inbox"
                >
                  <Mail size={14} />
                  <span>{digestSending ? 'Sending Digest...' : "Email Today's Digest"}</span>
                </button>
              </div>
            </div>

            {dueCommitments.length === 0 ? (
              <div className={`${styles.emptyStateCard} glass-card`}>
                <div className={styles.emptyStateIcon}><Check size={28} /></div>
                <h3>You are all caught up for today</h3>
                <p>
                  No pending prayer commitments are due right now. Rest in God&apos;s peace or add a new friend or family member to your circle.
                </p>
                <button
                  className={styles.addCommitmentBtn}
                  onClick={() => setIsAddCommitmentModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Add Person to Circle</span>
                </button>
              </div>
            ) : (
              <div className={styles.dueGrid}>
                {dueCommitments.map(c => {
                  const contact = contacts.find(cnt => cnt.id === c.contact_id);
                  return (
                    <article key={c.id} className={`${styles.careCard} glass-card`}>
                      <div className={styles.careCardHeader}>
                        <div className={styles.careCardPerson}>
                          <span className={styles.careCardName}>
                            {contact?.display_name || 'Personal Intention'}
                          </span>
                          {contact?.category && (
                            <span className={styles.categoryBadge}>{contact.category}</span>
                          )}
                          {contact?.is_sensitive && (
                            <span className={styles.sensitiveBadge} title="Sensitive entry">
                              <Lock size={12} /> Sensitive
                            </span>
                          )}
                        </div>
                        <span className={styles.recurrencePill}>{c.recurrence_rule}</span>
                      </div>

                      <h4 className={styles.careCardTitle}>{c.title}</h4>
                      {c.private_details && !contact?.is_sensitive && (
                        <p className={styles.careCardDetails}>{c.private_details}</p>
                      )}

                      {/* Action Bar — Thumb-friendly 48px Jakob's Law */}
                      <div className={styles.careCardActions}>
                        <button
                          className={styles.actionPrayedBtn}
                          onClick={() => handleCheckin(c, 'prayed')}
                        >
                          <Check size={16} />
                          <span>Prayed</span>
                        </button>
                        <button
                          className={styles.actionSnoozeBtn}
                          onClick={() => handleCheckin(c, 'snoozed')}
                          title="Snooze for 24 hours without breaking rhythm"
                        >
                          <Clock size={15} />
                          <span>Snooze</span>
                        </button>
                        <button
                          className={styles.actionAnsweredBtn}
                          onClick={() => handleCheckin(c, 'answered')}
                          title="Mark answered with praise"
                        >
                          <Sparkles size={15} />
                          <span>Answered</span>
                        </button>
                        {contact && (
                          <button
                            className={styles.actionFollowupBtn}
                            onClick={() => {
                              setSelectedFollowupContact(contact);
                              setSelectedFollowupCommitment(c);
                              setFollowupMessage(`I prayed for you today regarding "${c.title}". How are you doing?`);
                              setFollowupModalOpen(true);
                            }}
                            title="Send follow-up care note"
                          >
                            <MessageCircle size={15} />
                            <span>Follow Up</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── 2. Tab: My Circle ──────────────────────────────────────── */}
        {activeTab === 'circle' && (
          <section className={styles.sectionContainer}>
            <div className={styles.filterRow}>
              <div className={styles.categoryChips}>
                {['all', 'Family', 'Friend', 'Church', 'Missions', 'Healing', 'Work'].map(cat => (
                  <button
                    key={cat}
                    className={`${styles.chipBtn} ${categoryFilter === cat ? styles.chipBtnActive : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat === 'all' ? 'All Contacts' : cat}
                  </button>
                ))}
              </div>
              <button
                className={styles.addContactInlineBtn}
                onClick={() => setIsAddCommitmentModalOpen(true)}
              >
                <Plus size={15} />
                <span>Add Person</span>
              </button>
            </div>

            <div className={styles.circleGrid}>
              {filteredContacts.map(contact => {
                const personCommitments = commitments.filter(c => c.contact_id === contact.id);
                return (
                  <div key={contact.id} className={`${styles.circleCard} glass-card`}>
                    <div className={styles.circleCardHeader}>
                      <div>
                        <h4 className={styles.circleName}>{contact.display_name}</h4>
                        <span className={styles.circleCategory}>{contact.category}</span>
                      </div>
                      {contact.is_sensitive && (
                        <span className={styles.sensitiveTag}><Lock size={12} /> Confidential</span>
                      )}
                    </div>

                    <div className={styles.circleCommitmentsList}>
                      {personCommitments.length === 0 ? (
                        <p className={styles.noCommitmentsNote}>No active prayer rhythms.</p>
                      ) : (
                        personCommitments.map(cm => (
                          <div key={cm.id} className={styles.circleCommitmentItem}>
                            <span className={styles.circleCommitmentDot} />
                            <div className={styles.circleCommitmentContent}>
                              <span className={styles.circleCommitmentTitle}>{cm.title}</span>
                              <span className={styles.circleCommitmentSchedule}>{cm.recurrence_rule} • Status: {cm.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className={styles.circleCardFooter}>
                      <button
                        className={styles.circleQuickPrayBtn}
                        onClick={() => {
                          const firstActive = personCommitments.find(c => c.status === 'active');
                          if (firstActive) handleCheckin(firstActive, 'prayed');
                        }}
                      >
                        <Heart size={14} />
                        <span>Pray Today</span>
                      </button>
                      <button
                        className={styles.circleFollowupBtn}
                        onClick={() => {
                          setSelectedFollowupContact(contact);
                          setSelectedFollowupCommitment(personCommitments[0] || null);
                          setFollowupMessage(`You were on my heart today. How can I keep praying for you?`);
                          setFollowupModalOpen(true);
                        }}
                      >
                        <MessageCircle size={14} />
                        <span>Care</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 3. Tab: Community Wall ─────────────────────────────────── */}
        {activeTab === 'community' && (
          <section className={styles.sectionContainer}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search community prayers..."
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
              >
                <ShieldAlert size={14} />
                <span>Sensitive Regions</span>
              </button>
            </div>

            <div className={styles.communityGrid}>
              {prayers.map(p => (
                <article key={p.id} className={`${styles.communityCard} glass-card`}>
                  <div className={styles.communityHeader}>
                    <span className={styles.communityAuthor}>{p.display_name}</span>
                    {p.country_name && (
                      <span className={styles.countryTag}>
                        <MapPin size={12} /> {p.country_name}
                      </span>
                    )}
                  </div>
                  <p className={styles.communityText}>{p.request}</p>
                  <div className={styles.communityFooter}>
                    <button
                      className={`${styles.prayBtn} ${prayedSession[p.id] ? styles.prayBtnActive : ''}`}
                      onClick={() => handlePublicPray(p.id)}
                    >
                      <Heart size={14} />
                      <span>{p.likes_count} {prayedSession[p.id] ? 'Prayed' : 'Pray'}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── 4. Tab: World PrayerAtlas ──────────────────────────────── */}
        {activeTab === 'world' && (
          <section className={styles.sectionContainer}>
            <div className={`${styles.atlasCard} glass-card`}>
              <div className={styles.atlasCardHeader}>
                <div>
                  <h2 className={styles.atlasCardTitle}>Global Intercession Map</h2>
                  <p className={styles.atlasCardSubtitle}>
                    Rotate the globe to discover prayer beacons and pray for missionaries, churches, and restricted regions.
                  </p>
                </div>
                <span className={styles.globePinCount}>
                  <MapPin size={13} /> {globePins.length} Global Beacons
                </span>
              </div>
              <PrayerAtlas
                pins={globePins}
                selectedPinId={selectedPinId}
                onSelectPin={(pin) => {
                  setSelectedPinId(pin.id);
                  const matched = prayers.find(p => p.id === pin.id);
                  if (matched) setSelectedPrayer(matched);
                }}
              />
            </div>
          </section>
        )}

        {/* ── 5. Tab: Answered Prayers & Gratitude ───────────────────── */}
        {activeTab === 'answered' && (
          <section className={styles.sectionContainer}>
            <div className={styles.sectionIntro}>
              <h2 className={styles.sectionTitle}>Answered Prayers &amp; Gratitude Log</h2>
              <p className={styles.sectionDesc}>
                &ldquo;Return to your home, and declare how much God has done for you.&rdquo; (Luke 8:39)
              </p>
            </div>

            {answeredCommitments.length === 0 ? (
              <div className={`${styles.emptyStateCard} glass-card`}>
                <div className={styles.emptyStateIcon}><Sparkles size={28} /></div>
                <h3>No prayers marked answered yet</h3>
                <p>When God moves in response to your intercession, mark the item answered to preserve it in your praise journal.</p>
              </div>
            ) : (
              <div className={styles.answeredGrid}>
                {answeredCommitments.map(c => {
                  const contact = contacts.find(cnt => cnt.id === c.contact_id);
                  return (
                    <div key={c.id} className={`${styles.answeredCard} glass-card`}>
                      <div className={styles.answeredHeader}>
                        <span className={styles.answeredBadge}><Check size={14} /> Answered</span>
                        <span className={styles.answeredDate}>Updated: {new Date(c.updated_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className={styles.answeredTitle}>{c.title}</h4>
                      <p className={styles.answeredFor}>Prayed for: {contact?.display_name || 'Personal'}</p>
                      {c.private_details && (
                        <p className={styles.answeredDetails}>{c.private_details}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Modal: Add Contact & Prayer Commitment ─────────────────── */}
        {isAddCommitmentModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsAddCommitmentModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Add to Private Prayer Circle</h3>
                <button 
                  className={styles.modalCloseBtn}
                  onClick={() => setIsAddCommitmentModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCommitment} className={styles.modalForm}>
                <label className={styles.formLabel}>
                  Person or Group Name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah, Pastor David, Youth Group"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className={styles.formInput}
                  />
                </label>

                <div className={styles.formRow}>
                  <label className={styles.formLabel}>
                    Category
                    <select
                      value={contactCategory}
                      onChange={(e) => setContactCategory(e.target.value as PrayerCategory)}
                      className={styles.formSelect}
                    >
                      <option value="Family">Family</option>
                      <option value="Friend">Friend</option>
                      <option value="Church">Church</option>
                      <option value="Missions">Missions</option>
                      <option value="Healing">Healing</option>
                      <option value="Work">Work</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </label>

                  <label className={styles.formLabel}>
                    Prayer Rhythm
                    <select
                      value={commitmentRule}
                      onChange={(e) => setCommitmentRule(e.target.value as RecurrenceRule)}
                      className={styles.formSelect}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="once">One-Time</option>
                    </select>
                  </label>
                </div>

                <label className={styles.formLabel}>
                  Prayer Intention / Title *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Peace during medical treatment, new job interview"
                    value={commitmentTitle}
                    onChange={(e) => setCommitmentTitle(e.target.value)}
                    className={styles.formInput}
                  />
                </label>

                <label className={styles.formLabel}>
                  Private Details (Only visible to you)
                  <textarea
                    rows={3}
                    placeholder="Add specific verses or prayer notes..."
                    value={commitmentDetails}
                    onChange={(e) => setCommitmentDetails(e.target.value)}
                    className={styles.formTextarea}
                  />
                </label>

                <div className={styles.formRow}>
                  <label className={styles.formLabel}>
                    Phone (WhatsApp Follow-up)
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className={styles.formInput}
                    />
                  </label>
                  <label className={styles.formLabel}>
                    Email (Optional)
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={styles.formInput}
                    />
                  </label>
                </div>

                <div className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="sensitive_check"
                    checked={contactSensitive}
                    onChange={(e) => setContactSensitive(e.target.checked)}
                  />
                  <label htmlFor="sensitive_check">
                    Mark as Sensitive (hides details in notification previews)
                  </label>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalCancelBtn}
                    onClick={() => setIsAddCommitmentModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.modalSubmitBtn}>
                    Save to Prayer Circle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Care Follow-up Composer ─────────────────────────── */}
        {followupModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setFollowupModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h3>Send Pastoral Care Follow-up</h3>
                  <p className={styles.modalSub}>
                    To: {selectedFollowupContact?.display_name} • Never automated; reviewed by you.
                  </p>
                </div>
                <button 
                  className={styles.modalCloseBtn}
                  onClick={() => setFollowupModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Channel Selector */}
              <div className={styles.channelRow}>
                <button
                  type="button"
                  className={`${styles.channelBtn} ${followupChannel === 'whatsapp' ? styles.channelBtnActive : ''}`}
                  onClick={() => setFollowupChannel('whatsapp')}
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  className={`${styles.channelBtn} ${followupChannel === 'email' ? styles.channelBtnActive : ''}`}
                  onClick={() => setFollowupChannel('email')}
                >
                  <Mail size={16} />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  className={`${styles.channelBtn} ${followupChannel === 'sms' ? styles.channelBtnActive : ''}`}
                  onClick={() => setFollowupChannel('sms')}
                >
                  <Phone size={16} />
                  <span>SMS</span>
                </button>
                <button
                  type="button"
                  className={`${styles.channelBtn} ${followupChannel === 'clipboard' ? styles.channelBtnActive : ''}`}
                  onClick={() => setFollowupChannel('clipboard')}
                >
                  <Copy size={16} />
                  <span>Copy</span>
                </button>
              </div>

              {/* Template Picker */}
              <div className={styles.templateList}>
                <span className={styles.templateLabel}>Choose a Template:</span>
                {FOLLOWUP_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    className={styles.templatePill}
                    onClick={() => setFollowupMessage(tmpl.text)}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>

              {/* Editable Message Box */}
              <textarea
                rows={4}
                value={followupMessage}
                onChange={(e) => setFollowupMessage(e.target.value)}
                className={styles.followupTextarea}
                placeholder="Write your personal encouragement..."
              />

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setFollowupModalOpen(false)}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className={styles.modalSubmitBtn}
                  onClick={handleSendFollowup}
                >
                  {copiedSuccess ? (
                    <>
                      <Check size={16} />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : followupChannel === 'whatsapp' ? (
                    <>
                      <MessageCircle size={16} />
                      <span>Open in WhatsApp</span>
                    </>
                  ) : followupChannel === 'email' ? (
                    <>
                      <Mail size={16} />
                      <span>Open Email Draft</span>
                    </>
                  ) : followupChannel === 'sms' ? (
                    <>
                      <Phone size={16} />
                      <span>Open SMS App</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Optional Check-in Note ──────────────────────────── */}
        {checkinNoteModalOpen && pendingCheckinCommitment && (
          <div className={styles.modalOverlay} onClick={() => setCheckinNoteModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Mark as Prayed</h3>
                <button 
                  className={styles.modalCloseBtn}
                  onClick={() => setCheckinNoteModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <p className={styles.notePrompt}>
                Add an optional private reflection or prayer scripture for &ldquo;{pendingCheckinCommitment.title}&rdquo;:
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Sensed peace from Philippians 4:6-7..."
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                className={styles.formTextarea}
              />
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => {
                    executeCheckin(pendingCheckinCommitment.id, 'prayed');
                    setCheckinNoteModalOpen(false);
                    setPrivateNote('');
                  }}
                >
                  Skip Note
                </button>
                <button
                  type="button"
                  className={styles.modalSubmitBtn}
                  onClick={() => {
                    executeCheckin(pendingCheckinCommitment.id, 'prayed', privateNote);
                    setCheckinNoteModalOpen(false);
                    setPrivateNote('');
                  }}
                >
                  Save &amp; Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Public Prayer Submission ────────────────────────── */}
        {isSubmitModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsSubmitModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Pin Prayer Request to Global Map</h3>
                <button 
                  className={styles.modalCloseBtn}
                  onClick={() => setIsSubmitModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePublicSubmit} className={styles.modalForm}>
                <label className={styles.formLabel}>
                  Your Prayer Request *
                  <textarea
                    rows={4}
                    required
                    placeholder="Share what you are believing God for..."
                    value={newRequest}
                    onChange={(e) => setNewRequest(e.target.value)}
                    className={styles.formTextarea}
                  />
                </label>

                <div className={styles.formRow}>
                  <label className={styles.formLabel}>
                    Nation / Country
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className={styles.formSelect}
                    >
                      <option value="">Select country...</option>
                      {COUNTRIES_SORTED.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.formLabel}>
                    Privacy Level
                    <select
                      value={locationPrivacy}
                      onChange={(e) => setLocationPrivacy(e.target.value as any)}
                      className={styles.formSelect}
                    >
                      <option value="country_only">Country Capital Beacon (Recommended)</option>
                      <option value="restricted">Restricted Region Shield (Anonymous)</option>
                    </select>
                  </label>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalCancelBtn}
                    onClick={() => setIsSubmitModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submittingPublic}
                    className={styles.modalSubmitBtn}
                  >
                    {submittingPublic ? 'Submitting...' : 'Submit to Prayer Wall'}
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
