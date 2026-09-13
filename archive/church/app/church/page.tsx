'use client';

import { useState, useEffect } from 'react';
import {
  Church,
  ShieldCheck,
  Plus,
  Users,
  Heart,
  Code,
  Copy,
  Check,
  Share2,
  Globe,
  ExternalLink,
  MessageCircle,
  Mail,
  X,
  Send,
  Sparkles,
  Tv,
  Presentation,
  Radio,
  Layers,
} from 'lucide-react';
import type { ChurchProfile } from '@/types/church';
import { getAppUrl } from '@/lib/appUrl';
import styles from './page.module.css';

interface ChurchPrayerItem {
  id: string;
  author: string;
  category: string;
  urgency: 'normal' | 'urgent' | 'crisis';
  text: string;
  date: string;
  prayedCount: number;
}

export default function ChurchHubPage() {
  const [churches, setChurches] = useState<ChurchProfile[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<string>('');
  const [churchPrayers, setChurchPrayers] = useState<ChurchPrayerItem[]>([]);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isNewPrayerOpen, setIsNewPrayerOpen] = useState(false);
  const [prayedItems, setPrayedItems] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Widget config
  const [widgetTheme, setWidgetTheme] = useState<'parchment' | 'light' | 'dark'>('parchment');
  const [showDailyVerse, setShowDailyVerse] = useState(true);
  const [showPrayerWall, setShowPrayerWall] = useState(true);

  // Church Registration Form state
  const [formName, setFormName] = useState('');
  const [formDenomination, setFormDenomination] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('United States');
  const [formEmail, setFormEmail] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Prayer Form state
  const [prayerAuthor, setPrayerAuthor] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('General Intercession');
  const [prayerUrgency, setPrayerUrgency] = useState<'normal' | 'urgent' | 'crisis'>('normal');
  const [prayerText, setPrayerText] = useState('');

  // Load real registered churches on mount
  useEffect(() => {
    async function loadChurches() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/church');
        const data = await res.json();
        let list: ChurchProfile[] = data.churches || [];

        // Merge locally registered churches if present in browser
        if (typeof window !== 'undefined') {
          const local = localStorage.getItem('bibledesk_my_churches');
          if (local) {
            try {
              const parsed: ChurchProfile[] = JSON.parse(local);
              const ids = new Set(list.map(c => c.id));
              for (const c of parsed) {
                if (!ids.has(c.id)) list.unshift(c);
              }
            } catch {}
          }
        }

        setChurches(list);
        if (list.length > 0) {
          setSelectedChurchId(list[0].id);
        }
      } catch (err) {
        console.warn('Could not fetch registered churches:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadChurches();
  }, []);

  const selectedChurch = churches.find(c => c.id === selectedChurchId) || (churches.length > 0 ? churches[0] : null);

  // Load real prayers for the selected church
  useEffect(() => {
    if (!selectedChurch) {
      setChurchPrayers([]);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`bibledesk_church_prayers_${selectedChurch.id}`);
        if (stored) {
          setChurchPrayers(JSON.parse(stored));
        } else {
          setChurchPrayers([]);
        }
      } catch {
        setChurchPrayers([]);
      }
    }
  }, [selectedChurch]);

  const appUrl = getAppUrl();
  const inviteLink = selectedChurch
    ? `${appUrl}/church/join?code=${selectedChurch.invite_code}`
    : `${appUrl}/church`;

  const embedSnippet = selectedChurch
    ? `<iframe\n  src="${appUrl}/embed/church?id=${selectedChurch.id}&theme=${widgetTheme}&verse=${showDailyVerse}&prayer=${showPrayerWall}"\n  width="100%"\n  height="540"\n  frameborder="0"\n  style="border-radius: 14px; border: 1px solid rgba(181, 132, 20, 0.35);"\n></iframe>`
    : '';

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleIntercede = (prayerId: string, currentCount: number) => {
    setPrayedItems(prev => ({
      ...prev,
      [prayerId]: (prev[prayerId] ?? currentCount) + 1,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/church', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          denomination: formDenomination,
          city: formCity,
          country: formCountry,
          contact_email: formEmail,
          website: formWebsite,
        }),
      });
      const data = await res.json();
      if (data.success && data.church) {
        const updated = [data.church, ...churches];
        setChurches(updated);
        setSelectedChurchId(data.church.id);

        if (typeof window !== 'undefined') {
          localStorage.setItem('bibledesk_my_churches', JSON.stringify(updated));
        }

        setIsRegisterOpen(false);
        setFormName('');
        setFormEmail('');
        setFormDenomination('');
        setFormCity('');
        setFormWebsite('');
      }
    } catch (err) {
      console.error('Failed to register church:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChurch || !prayerText.trim()) return;

    const newPrayer: ChurchPrayerItem = {
      id: `cp-${Date.now()}`,
      author: prayerAuthor.trim() || 'Church Member',
      category: prayerCategory,
      urgency: prayerUrgency,
      text: prayerText.trim(),
      date: 'Just now',
      prayedCount: 1,
    };

    const updated = [newPrayer, ...churchPrayers];
    setChurchPrayers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bibledesk_church_prayers_${selectedChurch.id}`, JSON.stringify(updated));
    }

    setIsNewPrayerOpen(false);
    setPrayerAuthor('');
    setPrayerText('');
    setPrayerUrgency('normal');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.freeBadge}>
          <ShieldCheck size={16} />
          <span>100% Free Forever for Churches &amp; Ministries</span>
        </div>
        <h1 className={styles.title}>Church Community &amp; Pastoral Hub</h1>
        <p className={styles.subtitle}>
          Equip your congregation with a unified prayer chain, pastoral care triage, 1-click website embed
          widgets, and multi-channel outreach—at zero financial cost to your ministry.
        </p>
      </header>

      {/* Church Selector / Active Church Bar */}
      {selectedChurch ? (
        <div className={styles.churchBar}>
          <div className={styles.churchBarLeft}>
            <div className={styles.churchIconBox}>
              <Church size={24} />
            </div>
            <div>
              <div className={styles.churchName}>{selectedChurch.name}</div>
              <div className={styles.churchMeta}>
                {selectedChurch.denomination} • {selectedChurch.city ? `${selectedChurch.city}, ` : ''}{selectedChurch.country || 'USA'} • {selectedChurch.member_count || 1} Registered Members
              </div>
            </div>
          </div>

          <div className={styles.churchBarRight}>
            {churches.length > 1 && (
              <select
                className={styles.secondaryBtn}
                value={selectedChurchId}
                onChange={e => setSelectedChurchId(e.target.value)}
                style={{ minHeight: '44px' }}
              >
                {churches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `(${c.city})` : ''}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className={`${styles.actionBtn} ${styles.primaryBtn}`}
              onClick={() => setIsRegisterOpen(true)}
            >
              <Plus size={16} />
              <span>Register Another Church</span>
            </button>
          </div>
        </div>
      ) : !isLoading ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '3.5rem 1.5rem', marginBottom: '2rem' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(181, 132, 20, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Church size={32} color="#b58414" />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: '#2d2416', marginBottom: '0.6rem' }}>
            Register Your Church or Ministry
          </h2>
          <p style={{ color: '#685d47', maxWidth: '560px', margin: '0 auto 1.75rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
            No unverified churches are listed. BibleDesk is 100% Free Forever for Christian congregations. Register your church to instantly activate your congregation's private prayer chain, member invite codes, and website embed widgets.
          </p>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.primaryBtn}`}
            onClick={() => setIsRegisterOpen(true)}
            style={{ padding: '0.85rem 1.8rem', fontSize: '1rem' }}
          >
            <Plus size={18} />
            <span>Register Your Church Free ($0)</span>
          </button>
        </div>
      ) : null}

      {/* Main 2-Column Dashboard (Shown when church is selected) */}
      {selectedChurch && (
        <div className={styles.layout}>
          {/* Left Column: Church Prayer Chain */}
          <section className={styles.card} aria-label="Church Prayer Chain">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <Heart size={20} color="#b58414" />
                <span>Congregation Prayer Chain</span>
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#7a6f5a', fontWeight: 600 }}>
                  {churchPrayers.length} Petitions
                </span>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setIsNewPrayerOpen(true)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', minHeight: '34px' }}
                >
                  <Plus size={14} />
                  <span>Add Petition</span>
                </button>
              </div>
            </div>

            <div className={styles.prayerChainList}>
              {churchPrayers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#8a7e67' }}>
                  <Heart size={36} color="#b58414" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <h3 style={{ fontSize: '1.05rem', color: '#2d2416', marginBottom: '0.35rem' }}>No Active Petitions Yet</h3>
                  <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                    Your congregation prayer chain is ready. Church members can post petitions using your member invite link, or you can add the first request below.
                  </p>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.primaryBtn}`}
                    onClick={() => setIsNewPrayerOpen(true)}
                  >
                    <Plus size={15} />
                    <span>Post First Prayer Petition</span>
                  </button>
                </div>
              ) : (
                churchPrayers.map(item => {
                  const currentPrayed = prayedItems[item.id] ?? item.prayedCount;
                  return (
                    <article key={item.id} className={styles.prayerItem}>
                      <div className={styles.prayerItemHeader}>
                        <div>
                          <span className={styles.prayerAuthor}>{item.author}</span>
                          <span style={{ fontSize: '0.78rem', color: '#8c826e', marginLeft: '0.5rem' }}>
                            • {item.category} • {item.date}
                          </span>
                        </div>
                        <span
                          className={`${styles.urgencyBadge} ${
                            item.urgency === 'crisis'
                              ? styles.urgencyCrisis
                              : item.urgency === 'urgent'
                              ? styles.urgencyUrgent
                              : styles.urgencyNormal
                          }`}
                        >
                          {item.urgency === 'crisis' && '⚠️ '}
                          {item.urgency}
                        </span>
                      </div>

                      <p className={styles.prayerText}>"{item.text}"</p>

                      <div className={styles.prayerFooter}>
                        <button
                          type="button"
                          className={styles.prayerIntercedeBtn}
                          onClick={() => handleIntercede(item.id, item.prayedCount)}
                        >
                          <Heart size={14} color="#b58414" fill={prayedItems[item.id] ? '#b58414' : 'none'} />
                          <span>{currentPrayed} Intercessors Standing</span>
                        </button>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {selectedChurch.contact_email && (
                            <a
                              href={`mailto:${selectedChurch.contact_email}?subject=Pastoral Care Follow-up for ${encodeURIComponent(item.author)}&body=${encodeURIComponent(item.text)}`}
                              className={styles.prayerIntercedeBtn}
                              title="Send Pastoral Care Email"
                            >
                              <Mail size={14} />
                              <span>Care Email</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: Ministry Outreach Tools & Website Embed */}
          <div className={styles.toolsCol}>
            {/* Member Join Link Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Users size={18} color="#b58414" />
                  <span>Member Invite Link</span>
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#574d3c', lineHeight: 1.5 }}>
                Share this link in your weekly church bulletin or group chats so members automatically connect
                their personal BibleDesk study desk to <strong>{selectedChurch.name}</strong>.
              </p>

              <div className={styles.codeBox}>
                <span>{inviteLink}</span>
                <button
                  type="button"
                  className={styles.copyCodeBtn}
                  onClick={() => copyToClipboard(inviteLink, 'link')}
                >
                  {copiedType === 'link' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedType === 'link' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#8a7e67' }}>
                Church Join Code: <strong>{selectedChurch.invite_code}</strong>
              </div>
            </div>

            {/* Embeddable Website Widget Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Code size={18} color="#b58414" />
                  <span>Embed on Your Website</span>
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#574d3c', lineHeight: 1.5 }}>
                Paste this widget code into Squarespace, WordPress, Subsplash, or your church website to provide
                interactive Scripture lookups and your prayer wall directly to visitors.
              </p>

              <div style={{ margin: '0.85rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`${styles.secondaryBtn} ${widgetTheme === 'parchment' ? styles.primaryBtn : ''}`}
                  onClick={() => setWidgetTheme('parchment')}
                  style={{ minHeight: '36px', fontSize: '0.82rem' }}
                >
                  Parchment Theme
                </button>
                <button
                  type="button"
                  className={`${styles.secondaryBtn} ${widgetTheme === 'dark' ? styles.primaryBtn : ''}`}
                  onClick={() => setWidgetTheme('dark')}
                  style={{ minHeight: '36px', fontSize: '0.82rem' }}
                >
                  Dark Sanctuary
                </button>
                <button
                  type="button"
                  className={`${styles.secondaryBtn} ${widgetTheme === 'light' ? styles.primaryBtn : ''}`}
                  onClick={() => setWidgetTheme('light')}
                  style={{ minHeight: '36px', fontSize: '0.82rem' }}
                >
                  Clean Light
                </button>
              </div>

              <div className={styles.codeBox}>
                <pre style={{ margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {embedSnippet}
                </pre>
                <button
                  type="button"
                  className={styles.copyCodeBtn}
                  onClick={() => copyToClipboard(embedSnippet, 'embed')}
                >
                  {copiedType === 'embed' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedType === 'embed' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Sunday Live Worship & Slide Projection Interop */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Tv size={18} color="#ef4444" />
                  <span>Live Streaming &amp; Projector Interop</span>
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#574d3c', lineHeight: 1.5 }}>
                Integrate your existing church presentation software and broadcast channels with zero added infrastructure cost.
              </p>

              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', background: '#fbf9f4', padding: '0.75rem', borderRadius: '8px' }}>
                  <Tv size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.84rem' }}>
                    <strong>Church Live Sermon Theatre:</strong> Embed free 4K YouTube Live or Facebook Live streams in BibleDesk so shut-in members study Scripture while watching.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', background: '#fbf9f4', padding: '0.75rem', borderRadius: '8px' }}>
                  <Presentation size={20} color="#b58414" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.84rem' }}>
                    <strong>1-Click ProPresenter 7 Slides:</strong> In <a href="/sermons" style={{ color: '#b58414', textDecoration: 'underline' }}>Sermons</a>, generate formatted slide blocks for Sunday sanctuary projection.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', background: '#fbf9f4', padding: '0.75rem', borderRadius: '8px' }}>
                  <Radio size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.84rem' }}>
                    <strong>Ambient Worship Radio:</strong> Sacred hymn streams and official station docks for K-LOVE, Air1, and Moody Radio.
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Interop Guide Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  <Layers size={18} color="#b58414" />
                  <span>Church Tech Stack Interoperability</span>
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#574d3c', lineHeight: 1.5 }}>
                BibleDesk is designed to eliminate expensive software silos by interoperating with tools your team already uses:
              </p>

              <div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.85rem' }}>
                <div style={{ background: '#fbf9f4', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: '#4a4030' }}>
                  <strong>Planning Center Services (PCO):</strong> Export sermon outlines and Scripture references directly into your Order of Service.
                </div>
                <div style={{ background: '#fbf9f4', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: '#4a4030' }}>
                  <strong>ProPresenter 7 &amp; Keynote:</strong> 1-Click presentation slide text exporter auto-chunked into slide blocks.
                </div>
                <div style={{ background: '#fbf9f4', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: '#4a4030' }}>
                  <strong>Squarespace / WordPress / Subsplash:</strong> Embed Scripture search and your prayer chain on your public website.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Church Modal */}
      {isRegisterOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsRegisterOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Church size={22} color="#b58414" />
                <span>Register Your Church or Ministry</span>
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsRegisterOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegister} className={styles.modalForm}>
              <label className={styles.formLabel}>
                Church / Ministry Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. Grace Fellowship Church"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className={styles.formInput}
                />
              </label>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>
                  Denomination / Tradition
                  <input
                    type="text"
                    placeholder="e.g. Baptist, Anglican, Non-Denom"
                    value={formDenomination}
                    onChange={e => setFormDenomination(e.target.value)}
                    className={styles.formInput}
                  />
                </label>
                <label className={styles.formLabel}>
                  City / Location
                  <input
                    type="text"
                    placeholder="e.g. Dallas, TX"
                    value={formCity}
                    onChange={e => setFormCity(e.target.value)}
                    className={styles.formInput}
                  />
                </label>
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>
                  Pastoral Contact Email *
                  <input
                    type="email"
                    required
                    placeholder="pastor@church.org"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className={styles.formInput}
                  />
                </label>
                <label className={styles.formLabel}>
                  Church Website
                  <input
                    type="url"
                    placeholder="https://yourchurch.org"
                    value={formWebsite}
                    onChange={e => setFormWebsite(e.target.value)}
                    className={styles.formInput}
                  />
                </label>
              </div>

              <div style={{ background: '#fbf9f4', padding: '0.85rem 1rem', borderRadius: '10px', fontSize: '0.84rem', color: '#685d47', borderLeft: '3px solid #059669' }}>
                ✦ <strong>Zero-Cost Commitment:</strong> BibleDesk never charges churches or non-profit ministries for prayer chain features, member accounts, or website embed widgets.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setIsRegisterOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.actionBtn} ${styles.primaryBtn}`}
                  disabled={isSubmitting}
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Registering...' : 'Register Church Free'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Church Prayer Modal */}
      {isNewPrayerOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsNewPrayerOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Heart size={22} color="#b58414" />
                <span>Submit Prayer Petition</span>
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsNewPrayerOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPrayer} className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>
                  Your Name / Household
                  <input
                    type="text"
                    placeholder="e.g. John D. or Anonymous"
                    value={prayerAuthor}
                    onChange={e => setPrayerAuthor(e.target.value)}
                    className={styles.formInput}
                  />
                </label>
                <label className={styles.formLabel}>
                  Urgency Level
                  <select
                    value={prayerUrgency}
                    onChange={e => setPrayerUrgency(e.target.value as any)}
                    className={styles.formInput}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="crisis">Crisis / Immediate</option>
                  </select>
                </label>
              </div>

              <label className={styles.formLabel}>
                Category
                <select
                  value={prayerCategory}
                  onChange={e => setPrayerCategory(e.target.value)}
                  className={styles.formInput}
                >
                  <option value="Healing & Health">Healing &amp; Health</option>
                  <option value="Missions & Outreach">Missions &amp; Outreach</option>
                  <option value="Family & Home">Family &amp; Home</option>
                  <option value="Church Leadership">Church Leadership</option>
                  <option value="Spiritual Growth">Spiritual Growth</option>
                  <option value="General Intercession">General Intercession</option>
                </select>
              </label>

              <label className={styles.formLabel}>
                Prayer Request Details *
                <textarea
                  required
                  rows={4}
                  placeholder="Share how your church family can lift you up in prayer..."
                  value={prayerText}
                  onChange={e => setPrayerText(e.target.value)}
                  className={styles.formInput}
                  style={{ resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setIsNewPrayerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.actionBtn} ${styles.primaryBtn}`}
                >
                  <Send size={15} />
                  <span>Submit to Prayer Chain</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
