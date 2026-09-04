'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  Heart,
  Church,
  Globe,
  Music,
  ShieldCheck,
  Code,
  ArrowRight,
  Check,
  ExternalLink,
  MessageCircle,
  Mail,
  Zap,
  Lock,
  Layers,
  Terminal,
} from 'lucide-react';
import styles from './MarketingShowcase.module.css';

type PersonaKey = 'believer' | 'church' | 'missionary' | 'artist';

export default function MarketingShowcase() {
  const [activePersona, setActivePersona] = useState<PersonaKey>('believer');

  return (
    <div className={styles.container}>
      {/* ── 1. Hero Section ── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <Sparkles size={15} />
          <span>The Open, Local-First Bible Study Platform &amp; Global Prayer Network</span>
        </div>

        <h1 className={styles.heroTitle}>
          Deep Scripture Study Meets <span>Global Intercession</span>
        </h1>

        <p className={styles.heroSubtitle}>
          Study Scripture with 6 public-domain translations 100% offline. Explore grounded 5-dimension theology,
          track corporate petitions on the 2D vector PrayerAtlas, and integrate your church—at zero paywall.
        </p>

        <div className={styles.heroCtas}>
          <Link href="/login" className={styles.primaryCta}>
            <span>Get Started Free</span>
            <ArrowRight size={18} />
          </Link>

          <Link href="/bible" className={styles.secondaryCta}>
            <BookOpen size={18} />
            <span>Open Study Desk</span>
          </Link>

          <Link href="/church" className={styles.secondaryCta}>
            <Church size={18} />
            <span>For Churches &amp; Ministries</span>
          </Link>
        </div>

        <div className={styles.featurePillsBar}>
          <div className={styles.featurePillItem}>
            <ShieldCheck size={16} color="#059669" />
            <span>100% Free Forever for Churches</span>
          </div>
          <div className={styles.featurePillItem}>
            <Check size={16} color="#059669" />
            <span>6 Translations Offline (KJV, ASV, WEB, BBE, Darby, YLT)</span>
          </div>
          <div className={styles.featurePillItem}>
            <Check size={16} color="#059669" />
            <span>Strong’s Greek &amp; Hebrew Lexicons</span>
          </div>
          <div className={styles.featurePillItem}>
            <Check size={16} color="#059669" />
            <span>Model Context Protocol (MCP) Ready</span>
          </div>
        </div>
      </section>

      {/* ── 2. Four Target Personas Interactive Section ── */}
      <section className={styles.personaSection} aria-label="Audience Personas">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Tailored for the Body of Christ</span>
          <h2 className={styles.sectionTitle}>Built for Every Stage of the Calling</h2>
          <p className={styles.sectionSubtitle}>
            Whether you are meditating in personal devotion, pastoring a flock, serving in a sensitive mission
            field, or writing worship songs, BibleDesk equips your ministry.
          </p>
        </div>

        {/* Persona Switcher Tabs */}
        <div className={styles.personaTabs} role="tablist">
          <button
            type="button"
            className={`${styles.personaTabBtn} ${activePersona === 'believer' ? styles.personaTabBtnActive : ''}`}
            onClick={() => setActivePersona('believer')}
          >
            <div className={styles.personaIconBox}>
              <BookOpen size={20} />
            </div>
            <span className={styles.personaTabTitle}>Everyday Believers</span>
            <span className={styles.personaTabRole}>Personal Devotion</span>
          </button>

          <button
            type="button"
            className={`${styles.personaTabBtn} ${activePersona === 'church' ? styles.personaTabBtnActive : ''}`}
            onClick={() => setActivePersona('church')}
          >
            <div className={styles.personaIconBox}>
              <Church size={20} />
            </div>
            <span className={styles.personaTabTitle}>Pastors &amp; Churches</span>
            <span className={styles.personaTabRole}>Congregation Care</span>
          </button>

          <button
            type="button"
            className={`${styles.personaTabBtn} ${activePersona === 'missionary' ? styles.personaTabBtnActive : ''}`}
            onClick={() => setActivePersona('missionary')}
          >
            <div className={styles.personaIconBox}>
              <Globe size={20} />
            </div>
            <span className={styles.personaTabTitle}>Missionaries</span>
            <span className={styles.personaTabRole}>Global Field Workers</span>
          </button>

          <button
            type="button"
            className={`${styles.personaTabBtn} ${activePersona === 'artist' ? styles.personaTabBtnActive : ''}`}
            onClick={() => setActivePersona('artist')}
          >
            <div className={styles.personaIconBox}>
              <Music size={20} />
            </div>
            <span className={styles.personaTabTitle}>Worship Artists</span>
            <span className={styles.personaTabRole}>Creatives &amp; Songwriters</span>
          </button>
        </div>

        {/* Persona Detail Card */}
        {activePersona === 'believer' && (
          <div className={styles.personaCard}>
            <div className={styles.personaCardContent}>
              <h3>Uncompromised Personal Devotion</h3>
              <p className={styles.personaCardDesc}>
                Read, search, and memorize Scripture without subscription paywalls or invasive tracking.
                Dive deeper into God’s Word with 5-dimension theological clarity.
              </p>
              <div className={styles.personaBulletList}>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>6 Public-Domain Translations Offline:</strong> Read KJV, ASV, WEB, BBE, Darby, and YLT anytime.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>5-Dimension Study Depth:</strong> Sourced answers across Scripture, History, Original Language, Theology, and Life Application.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Verse Memory &amp; Rhythms:</strong> Practice active recall flashcards, track reading plans, and set daily prayer reminders.</span>
                </div>
              </div>
              <Link href="/bible" className={styles.primaryCta}>
                <span>Start Studying Scripture</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.personaInteractivePreview}>
              <span className={styles.previewTag}>5-Dimension Insight Sample</span>
              <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#1e1913' }}>
                "What did Jesus mean by 'born again' in John 3:3?"
              </div>
              <div style={{ fontSize: '0.86rem', color: '#574d3b', lineHeight: 1.55 }}>
                📖 <strong>Original Language:</strong> The Greek word <em>anōthen</em> (ἄνωθεν, G509) carries a dual meaning: both 'again' (a second time) and 'from above' (heavenly divine origin).
              </div>
              <div style={{ fontSize: '0.84rem', color: '#8c6f21', fontStyle: 'italic' }}>
                💡 <strong>Practical:</strong> Regeneration is not self-improvement; it is receiving brand new spiritual life from the Holy Spirit.
              </div>
            </div>
          </div>
        )}

        {activePersona === 'church' && (
          <div className={styles.personaCard}>
            <div className={styles.personaCardContent}>
              <h3>Equip Your Congregation for Free</h3>
              <p className={styles.personaCardDesc}>
                Unite your church around corporate prayer, triage urgent pastoral needs, and embed interactive
                Scripture tools directly on your church website—at zero financial cost.
              </p>
              <div className={styles.personaBulletList}>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>100% Free Forever for Churches:</strong> Never pay for prayer chains, member accounts, or website embed widgets.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Congregation Prayer Chain:</strong> Member petitions with 4-tier escalation (Private $\rightarrow$ Circle $\rightarrow$ Church $\rightarrow$ Atlas).</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>1-Click Pastoral Follow-up:</strong> Pre-drafted care messages for WhatsApp, SMS, and Email to check on hospitalized or grieving saints.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>1-Click Website Embeds:</strong> Paste an iframe code into Squarespace, WordPress, or Subsplash to display your church prayer wall.</span>
                </div>
              </div>
              <Link href="/church" className={styles.primaryCta}>
                <span>Open Church Ministry Hub</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.personaInteractivePreview}>
              <span className={styles.previewTag}>Church Prayer Chain Preview</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>Grace Fellowship Prayer Chain</span>
                <span style={{ fontSize: '0.75rem', background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '99px' }}>CRISIS</span>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#4a4030', margin: '0.5rem 0' }}>
                "Urgent prayer for Elder Thomas entering surgery at 8 AM tomorrow morning. Pastoral care team is standing with the family."
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: '#b58414', color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
                  Stand in Prayer (34)
                </button>
              </div>
            </div>
          </div>
        )}

        {activePersona === 'missionary' && (
          <div className={styles.personaCard}>
            <div className={styles.personaCardContent}>
              <h3>Resilient Ministry in the Field</h3>
              <p className={styles.personaCardDesc}>
                Whether serving in a remote rural village or an urban restricted zone, BibleDesk provides offline
                Scripture tools and safe global intercession.
              </p>
              <div className={styles.personaBulletList}>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>100% Offline Operation:</strong> Full Bible translations, Strong's Greek &amp; Hebrew lexicons, and TSK cross-refs run without internet.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Restricted Region Shields:</strong> Mask location coordinates and render protective shields on sensitive worker beacons to preserve security.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Global Intercession Network:</strong> Rally praying saints across continents to intercede for breakthrough in unreached people groups.</span>
                </div>
              </div>
              <Link href="/prayer" className={styles.primaryCta}>
                <span>Explore 2D PrayerAtlas</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.personaInteractivePreview}>
              <span className={styles.previewTag} style={{ background: '#dc2626' }}>Restricted Shield Active</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontWeight: 700 }}>
                <Lock size={16} />
                <span>Protected Global Beacon</span>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#574d3b', margin: '0.4rem 0' }}>
                "Training underground church planters across Northern Africa. Pray for resilience, safe border crossings, and translated Scripture distribution."
              </p>
              <div style={{ fontSize: '0.78rem', color: '#8c826e' }}>
                Coordinates masked to regional capital centroid. 128 intercessors praying.
              </div>
            </div>
          </div>
        )}

        {activePersona === 'artist' && (
          <div className={styles.personaCard}>
            <div className={styles.personaCardContent}>
              <h3>Kingdom Creativity &amp; Songwriting</h3>
              <p className={styles.personaCardDesc}>
                Designed specifically for worship leaders, lyricists, musicians, and artists seeking divine
                inspiration and theological grounding for their craft.
              </p>
              <div className={styles.personaBulletList}>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Poetic Concordance Search:</strong> Search Psalms, prophets, and imagery by lyrical nuance, Hebrew root words, and theological resonance.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Encouragement for Creatives:</strong> Curated promises addressing calling, craftsmanship, artistic anxiety, and staying centered on Christ.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>1-Click Shareable Devotionals:</strong> Share biblical promise cards with your band, choir, social followers, and congregations.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Tour &amp; Event Prayer Beacons:</strong> Pin worship nights and tour stops to the PrayerAtlas to invite intercessors to cover your cities.</span>
                </div>
              </div>
              <Link href="/encourage" className={styles.primaryCta}>
                <span>Explore Words of Encouragement</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.personaInteractivePreview}>
              <span className={styles.previewTag} style={{ background: '#7c3aed' }}>Creative Calling Promise</span>
              <div style={{ fontStyle: 'italic', fontFamily: 'Lora, serif', fontSize: '0.96rem', color: '#1e1913' }}>
                "And I have filled him with the Spirit of God, with wisdom... to make artistic designs for work in gold, silver and bronze." — Exodus 31:3-4
              </div>
              <p style={{ fontSize: '0.85rem', color: '#574d3b', margin: '0.5rem 0' }}>
                Your artistic skill is not secular until baptized; it is God-breathed. Play skillfully, and write songs that anchor weary souls in truth.
              </p>
              <Link href="/encourage" style={{ fontSize: '0.82rem', color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}>
                View 15+ Artist Meditations →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. Transparent Pricing Grid ── */}
      <section className={styles.pricingSection} aria-label="Transparent Pricing">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Transparent Stewardship</span>
          <h2 className={styles.sectionTitle}>Simple, Kingdom-First Pricing</h2>
          <p className={styles.sectionSubtitle}>
            We believe the Word of God should never be locked behind a paywall. Scripture reading, concordance
            lookups, Strong’s lexicons, and church prayer chains remain free forever.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {/* Tier 1: Churches & Ministries */}
          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <span className={styles.pricingFeaturedBadge}>Free Forever Guarantee</span>
            <h3 className={styles.tierName}>Churches &amp; Non-Profits</h3>
            <div className={styles.tierPriceRow}>
              <span className={styles.tierPrice}>$0</span>
              <span className={styles.tierPeriod}>/ month forever</span>
            </div>
            <p className={styles.tierDesc}>
              For local churches, fellowship groups, mission agencies, and Christian charities.
            </p>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Unlimited Congregation Members</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Church-Wide Prayer Chain</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>1-Click Pastoral Follow-up (WhatsApp/Email)</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Embeddable Website Widgets</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Discord &amp; WhatsApp Bots</span>
              </div>
            </div>

            <Link href="/church" className={styles.primaryCta} style={{ width: '100%', justifyContent: 'center' }}>
              <span>Register Your Church Free</span>
            </Link>
          </div>

          {/* Tier 2: Individual Believers */}
          <div className={styles.pricingCard}>
            <h3 className={styles.tierName}>Individual Believers</h3>
            <div className={styles.tierPriceRow}>
              <span className={styles.tierPrice}>$0</span>
              <span className={styles.tierPeriod}>Free Preview</span>
            </div>
            <p className={styles.tierDesc}>
              Currently 100% free. A future update will offer an optional $4.99/mo Pro tier with expanded server AI tokens.
            </p>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>6 Offline Bible Translations</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Strong’s Greek &amp; Hebrew Lexicons</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>5-Dimension AI Study Assistant</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>2D Vector PrayerAtlas &amp; Rhythms</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Bring-Your-Own-Key (BYOK) Fallback</span>
              </div>
            </div>

            <Link href="/login" className={styles.secondaryCta} style={{ width: '100%', justifyContent: 'center' }}>
              <span>Sign Up for Free</span>
            </Link>
          </div>

          {/* Tier 3: Developers & Open Source */}
          <div className={styles.pricingCard}>
            <h3 className={styles.tierName}>Developers &amp; AI Agents</h3>
            <div className={styles.tierPriceRow}>
              <span className={styles.tierPrice}>$0</span>
              <span className={styles.tierPeriod}>MIT Open Source</span>
            </div>
            <p className={styles.tierDesc}>
              For software engineers, scholars, and autonomous AI agents building on open Scripture data.
            </p>

            <div className={styles.tierFeatureList}>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Official TypeScript / JS SDK</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Open REST Endpoints (CORS Enabled)</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Model Context Protocol (MCP) Server</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Claude / Cursor / Windsurf Integration</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Full GitHub Codebase Access</span>
              </div>
            </div>

            <Link href="/developers" className={styles.secondaryCta} style={{ width: '100%', justifyContent: 'center' }}>
              <span>View Developer Docs</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Integrations & Multi-Platform Grid ── */}
      <section className={styles.integrationsSection} aria-label="Integrations">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Universal Accessibility</span>
          <h2 className={styles.sectionTitle}>Connected Across Every Platform</h2>
          <p className={styles.sectionSubtitle}>
            Access BibleDesk on your desktop, browser, smartphone, Discord server, WhatsApp chat, and personal
            Obsidian notes.
          </p>
        </div>

        <div className={styles.integrationsGrid}>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <MessageCircle size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Discord Slash Bot</div>
              <div className={styles.integrationDesc}>Share daily verses, ask study questions, and broadcast church prayer alerts.</div>
            </div>
          </div>

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <MessageCircle size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>WhatsApp Cloud API</div>
              <div className={styles.integrationDesc}>Interactive bot responds to Scripture lookups and 1-click care follow-up drafts.</div>
            </div>
          </div>

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <Terminal size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Model Context Protocol</div>
              <div className={styles.integrationDesc}>Allows Claude Desktop, Cursor, and Windsurf to query Bible passages and lexicons.</div>
            </div>
          </div>

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <Layers size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Obsidian Markdown Export</div>
              <div className={styles.integrationDesc}>Export chapters with [[wikilinks]] for local personal knowledge management.</div>
            </div>
          </div>

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <Globe size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Chrome Side Panel (MV3)</div>
              <div className={styles.integrationDesc}>Read Scripture and lookup Strong’s definitions in a browser side panel while surfing.</div>
            </div>
          </div>

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <Zap size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Desktop &amp; Android APK</div>
              <div className={styles.integrationDesc}>Native Electron desktop app and Capacitor Android APK available for offline use.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Final CTA Banner ── */}
      <section className={styles.finalBanner}>
        <div className={styles.bannerCard}>
          <h2 className={styles.bannerTitle}>Rooted in Scripture. Connected in Prayer.</h2>
          <p className={styles.bannerSubtitle}>
            Join thousands of believers, pastors, missionaries, and worship artists studying the Word of God with
            depth, reverence, and global intercession.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/login" className={styles.primaryCta}>
              <span>Create Free Account</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/bible" className={styles.secondaryCta} style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(181, 132, 20, 0.5)' }}>
              <span>Enter Study Desk</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
