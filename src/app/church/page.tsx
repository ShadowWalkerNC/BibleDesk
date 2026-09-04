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
import { SAMPLE_CHURCHES, ChurchProfile } from '@/types/church';
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

const SAMPLE_CHURCH_PRAYERS: Record<string, ChurchPrayerItem[]> = {
  'church-grace-city': [
    {
      id: 'cp-1',
      author: 'David & Sarah M.',
      category: 'Missions & Outreach',
      urgency: 'normal',
      text: 'Pray for our youth mission team preparing for the summer inner-city camp in July.',
      date: 'Today at 9:15 AM',
      prayedCount: 14,
    },
    {
      id: 'cp-2',
      author: 'Anonymous Sister',
      category: 'Healing & Health',
      urgency: 'urgent',
      text: 'Sister undergoing biopsy results this Thursday. Praying for peace that surpasses understanding and complete healing.',
      date: 'Yesterday',
      prayedCount: 28,
    },
    {
      id: 'cp-3',
      author: 'Pastor Michael',
      category: 'Church Leadership',
      urgency: 'crisis',
      text: 'Urgent prayer for the family of Elder John after sudden hospitalization. Pastoral team is with them now.',
      date: '3 hours ago',
      prayedCount: 42,
    },
  ],
  'church-hope-chapel': [
    {
      id: 'cp-4',
      author: 'Deacon Thomas',
      category: 'Community',
      urgency: 'normal',
      text: 'Thanksgiving for 20 new families who attended our community food pantry yesterday.',
      date: 'Today',
      prayedCount: 19,
    },
  ],
};

export default function ChurchHubPage() {
  const [churches, setChurches] = useState<ChurchProfile[]>(SAMPLE_CHURCHES);
  const [selectedChurchId, setSelectedChurchId] = useState<string>(SAMPLE_CHURCHES[0].id);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [prayedItems, setPrayedItems] = useState<Record<string, number>>({});

  // Widget config
  const [widgetTheme, setWidgetTheme] = useState<'parchment' | 'light' | 'dark'>('parchment');
  const [showDailyVerse, setShowDailyVerse] = useState(true);
  const [showPrayerWall, setShowPrayerWall] = useState(true);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDenomination, setFormDenomination] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('United States');
  const [formEmail, setFormEmail] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedChurch = churches.find(c => c.id === selectedChurchId) || churches[0];
  const churchPrayers = SAMPLE_CHURCH_PRAYERS[selectedChurch.id] || SAMPLE_CHURCH_PRAYERS['church-grace-city'];

  const inviteLink = `https://bibledesk.org/church/join?code=${selectedChurch.invite_code}`;
  const embedSnippet = `<iframe\n  src="https://bibledesk.org/embed/church?id=${selectedChurch.id}&theme=${widgetTheme}&verse=${showDailyVerse}&prayer=${showPrayerWall}"\n  width="100%"\n  height="540"\n  frameborder="0"\n  style="border-radius: 14px; border: 1px solid rgba(181, 132, 20, 0.35);"\n></iframe>`;

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
        setChurches(prev => [data.church, ...prev]);
        setSelectedChurchId(data.church.id);
        setIsRegisterOpen(false);
        setFormName('');
        setFormEmail('');
      }
    } catch (err) {
      console.error('Failed to register church:', err);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className={styles.churchBar}>
        <div className={styles.churchBarLeft}>
          <div className={styles.churchIconBox}>
            <Church size={24} />
          </div>
          <div>
            <div className={styles.churchName}>{selectedChurch.name}</div>
            <div className={styles.churchMeta}>
              {selectedChurch.denomination} • {selectedChurch.city}, {selectedChurch.country} • {selectedChurch.member_count} Members
            </div>
          </div>
        </div>

        <div className={styles.churchBarRight}>
          <select
            className={styles.secondaryBtn}
            value={selectedChurchId}
            onChange={e => setSelectedChurchId(e.target.value)}
            style={{ minHeight: '44px' }}
          >
            {churches.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city})
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.primaryBtn}`}
            onClick={() => setIsRegisterOpen(true)}
          >
            <Plus size={16} />
            <span>Register Your Church</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Dashboard */}
      <div className={styles.layout}>
        {/* Left Column: Church Prayer Chain */}
        <section className={styles.card} aria-label="Church Prayer Chain">
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Heart size={20} color="#b58414" />
              <span>Congregation Prayer Chain</span>
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#7a6f5a', fontWeight: 600 }}>
              {churchPrayers.length} Active Petitions
            </span>
          </div>

          <div className={styles.prayerChainList}>
            {churchPrayers.map(item => {
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
                      <a
                        href={`mailto:${selectedChurch.contact_email}?subject=Pastoral Follow-up for ${encodeURIComponent(item.author)}&body=${encodeURIComponent(item.text)}`}
                        className={styles.prayerIntercedeBtn}
                        title="Send Pastoral Care Email"
                      >
                        <Mail size={14} />
                        <span>Care Email</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
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
              {(['parchment', 'light', 'dark'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setWidgetTheme(t)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: widgetTheme === t ? '#b58414' : '#f4efe4',
                    color: widgetTheme === t ? '#ffffff' : '#4a4131',
                    border: 'none',
                  }}
                >
                  {t.toUpperCase()} Theme
                </button>
              ))}
            </div>

            <div className={styles.codeBox}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{embedSnippet}</pre>
            </div>

            <button
              type="button"
              className={`${styles.actionBtn} ${styles.secondaryBtn}`}
              onClick={() => copyToClipboard(embedSnippet, 'widget')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {copiedType === 'widget' ? <Check size={16} color="#059669" /> : <Copy size={16} />}
              <span>{copiedType === 'widget' ? 'Snippet Copied!' : 'Copy Embed Code'}</span>
            </button>
          </div>

          {/* Church Tech Integrations Guide Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <Layers size={18} color="#b58414" />
                <span>Church Tech Ecosystem Interop</span>
              </h3>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#574d3c', lineHeight: 1.5, margin: '0 0 10px 0' }}>
              BibleDesk operates alongside the software your ministry already uses, eliminating costly duplicate subscriptions:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ background: '#f8f5ee', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid #b58414' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3d3426' }}>
                  Planning Center (PCO)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#685d47' }}>
                  Write outlines in BibleDesk; 1-click Markdown copy pastes directly into PCO Services order of worship.
                </div>
              </div>

              <div style={{ background: '#f8f5ee', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid #b58414' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3d3426' }}>
                  ProPresenter 7 (Renewed Vision)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#685d47' }}>
                  1-Click Slide Export auto-chunks sermon Scripture &amp; bullet points for Sunday projector presentation.
                </div>
              </div>

              <div style={{ background: '#f8f5ee', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid #059669' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3d3426' }}>
                  YouTube Live &amp; Facebook Live
                </div>
                <div style={{ fontSize: '0.78rem', color: '#685d47' }}>
                  Zero-cost live sermon theatre embeds your free 4K CDN broadcasts with synchronized Scripture lookups.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Register Church Modal */}
      {isRegisterOpen && (
        <div className={styles.overlay} onClick={() => setIsRegisterOpen(false)} role="dialog" aria-modal="true">
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Church size={20} color="#b58414" />
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', margin: 0 }}>
                  Register Your Church (100% Free Forever)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c826e' }}
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleRegister} className={styles.modalBody}>
              <label className={styles.formLabel}>
                Church or Ministry Name *
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
    </div>
  );
}
