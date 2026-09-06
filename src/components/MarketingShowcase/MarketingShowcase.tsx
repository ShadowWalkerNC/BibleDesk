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
  Radio,
  Tv,
  Presentation,
  Scroll,
  Brain,
} from 'lucide-react';
import styles from './MarketingShowcase.module.css';

type PersonaKey = 'believer' | 'organization';

export default function MarketingShowcase() {
  const [activePersona, setActivePersona] = useState<PersonaKey>('believer');

  return (
    <div className={styles.container}>
      {/* ── 1. Hero Section ── */}
      <section className={styles.hero}>
        <img className={styles.heroImage} src="https://media.base44.com/images/public/6a9dbd4e73e396871759885a/7eedc9af3_generated_17af0daf.jpg" alt="" />
        <div className={styles.heroCopy}>
        <div className={styles.heroBadge}>
          <Sparkles size={15} />
          <span>The Open, Local-First Bible Study Platform &amp; Global Prayer Network</span>
        </div>

        <h1 className={styles.heroTitle}>
          Deep Scripture Study Meets <span>Global Intercession</span>
        </h1>

        <p className={styles.heroSubtitle}>
          BibleDesk unites 6 public-domain translations (100% offline), Strong’s Greek &amp; Hebrew lexicons,
          Treasury of Scripture Knowledge cross-references, church prayer networks, and an open developer SDK.
        </p>

        <div className={styles.heroActions}>
          <Link href="/bible" className={styles.primaryCta}>
            <BookOpen size={18} />
            <span>Open Study Desk</span>
            <ArrowRight size={16} />
          </Link>

          <Link href="/church" className={styles.secondaryCta}>
            <Church size={18} />
            <span>Church &amp; Ministry Hub ($0)</span>
          </Link>

          <Link href="/developers" className={styles.sdkCta}>
            <Code size={18} />
            <span>Developer SDK</span>
          </Link>
        </div>
        </div>

        {/* Feature Highlights Bar */}
        <div className={styles.featurePillsBar}>
          <div className={styles.featurePillItem}>
            <Globe size={16} color="#b58414" />
            <span>2D Vector PrayerAtlas</span>
          </div>
          <div className={styles.featurePillItem}>
            <Tv size={16} color="#ef4444" />
            <span>Live Sermon Theatre &amp; ProPresenter 7 Export</span>
          </div>
          <div className={styles.featurePillItem}>
            <ShieldCheck size={16} color="#059669" />
            <span>100% Free Forever for Churches</span>
          </div>
          <div className={styles.featurePillItem}>
            <Radio size={16} color="#b58414" />
            <span>Worship Radio (K-LOVE, Air1, Moody &amp; Sacred Hymns)</span>
          </div>
          <div className={styles.featurePillItem}>
            <Scroll size={16} color="#b58414" />
            <span>Multi-Tradition Catechisms &amp; Doctrinal RAG</span>
          </div>
          <div className={styles.featurePillItem}>
            <Check size={16} color="#059669" />
            <span>6 Translations Offline (KJV, ASV, WEB, BBE, Darby, YLT)</span>
          </div>
          <div className={styles.featurePillItem}>
            <Code size={16} color="#059669" />
            <span>Official Client SDK &amp; MCP Engine</span>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ── */}
      <h2 className={styles.featureSectionTitle}>Study, prayer, and community in one place</h2>
      <section className={styles.featureGrid} aria-label="Key features">
        <article className={styles.glassCard}>
          <div className={styles.featureIcon}><BookOpen size={18} /></div>
          <h3>Study Desk</h3>
          <p>Read Scripture, follow plans, and study with notes.</p>
        </article>
        <article className={styles.glassCard}>
          <div className={styles.featureIcon}><Globe size={18} /></div>
          <h3>Prayer Atlas</h3>
          <p>Connect prayer with the people and places that need it.</p>
        </article>
        <article className={styles.glassCard}>
          <div className={styles.featureIcon}><Brain size={18} /></div>
          <h3>Verse Memory</h3>
          <p>Keep the words you are learning close each day.</p>
        </article>
      </section>

      {/* ── Showcase ── */}
      <section className={styles.showcase}>
        <article className={styles.showcaseCard}>
          <img src="https://media.base44.com/images/public/6a9dbd4e73e396871759885a/0cae2598a_generated_ef405181.jpg" alt="" />
          <h2>Global prayer network</h2>
          <p>Bring Scripture, encouragement, and shared prayer into one gentle rhythm.</p>
        </article>
        <blockquote className={styles.verseBlock}>
          <p>"Your word is a lamp to my feet and a light to my path."</p>
          <cite>Psalm 119:105 · KJV</cite>
        </blockquote>
      </section>

      {/* ── 2. Two Core Personas Section ── */}
      <section className={styles.personaSection} aria-label="Audience Personas">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Tailored for the Body of Christ</span>
          <h2 className={styles.sectionTitle}>Built for Believers &amp; Ministries</h2>
          <p className={styles.sectionSubtitle}>
            Whether meditating in personal discipleship or leading a congregation, mission agency, or creative ministry, BibleDesk provides the local-first biblical foundation.
          </p>
        </div>

        {/* Persona Switcher Tabs (2 Pillars) */}
        <div className={styles.personaTabs} style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: '720px', margin: '0 auto 2.5rem' }} role="tablist">
          <button
            type="button"
            className={`${styles.personaTabBtn} ${activePersona === 'believer' ? styles.personaTabBtnActive : ''}`}
            onClick={() => setActivePersona('believer')}
          >
            <div className={styles.personaIconBox}>
              <BookOpen size={22} />
            </div>
            <span className={styles.personaTabTitle} style={{ fontSize: '1.05rem', fontWeight: 700 }}>Individual Believers &amp; Discipleship</span>
            <span className={styles.personaTabRole}>Personal Devotion · Verse Memory · Daily Rhythms</span>
          </button>

          <button
            type="button"
            className={`${styles.personaTabBtn} ${activePersona === 'organization' ? styles.personaTabBtnActive : ''}`}
            onClick={() => setActivePersona('organization')}
          >
            <div className={styles.personaIconBox}>
              <Church size={22} />
            </div>
            <span className={styles.personaTabTitle} style={{ fontSize: '1.05rem', fontWeight: 700 }}>Churches, Ministries &amp; Creators</span>
            <span className={styles.personaTabRole}>Prayer Chains · Sermons · Creator Hub · Missions</span>
          </button>
        </div>

        {/* Pillar 1: Individual Believers */}
        {activePersona === 'believer' && (
          <div className={styles.personaCard}>
            <div className={styles.personaCardContent}>
              <h3>Uncompromised Personal Devotion &amp; Discipleship</h3>
              <p className={styles.personaCardDesc}>
                Read, search, and memorize Scripture without subscription paywalls or invasive tracking.
                Dive deeper into God’s Word with 5-dimension theological clarity and daily spiritual rhythms.
              </p>
              <div className={styles.personaBulletList}>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>6 Public-Domain Translations Offline:</strong> Read KJV, ASV, WEB, BBE, Darby, and YLT with 0 latency and 0 network needed.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Strong’s Greek &amp; Hebrew Lexicons:</strong> Tap any verse to inspect 14,000+ original language lemmas, transliterations, and definitions.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>5-Dimension Study Assistant:</strong> Sourced answers across Scripture, History, Original Language, Theology, and Practical Application (5 free/day or unlimited with free BYOK).</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Multi-Tradition Catechisms &amp; Confessions:</strong> Westminster, Heidelberg, Luther, 1689 Baptist, 39 Articles, and Assemblies of God with interactive quiz recall.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Personal Prayer Circle &amp; Follow-up:</strong> Track commitments, set recurring rhythms, and log answered prayers with gratitude.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/bible" className={styles.primaryCta}>
                  <span>Start Studying Scripture</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/encourage" className={styles.secondaryCta} style={{ border: '1px solid var(--gold-500)', padding: '0.65rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                  <span>Words of Encouragement</span>
                </Link>
              </div>
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

        {/* Pillar 2: Organizations, Churches & Creators */}
        {activePersona === 'organization' && (
          <div className={styles.personaCard}>
            <div className={styles.personaCardContent}>
              <h3>Equip Your Congregation, Ministry &amp; Calling ($0 Free Forever)</h3>
              <p className={styles.personaCardDesc}>
                Whether you pastor a local congregation, direct a mission team, or lead worship, BibleDesk provides the free digital infrastructure to rally your community.
              </p>
              <div className={styles.personaBulletList}>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>100% Free Forever for Churches &amp; Non-Profits:</strong> Never pay for prayer chains, member accounts, or website embed widgets.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Christian Creator &amp; Ministry Hub:</strong> Publish a reverent link-in-bio page (<code>/@yourname</code>) with embedded YouTube/Spotify media, seasonal Scripture, and 0% platform fee direct support links.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Church Live Sermon Theatre &amp; Slides:</strong> Broadcast YouTube Live sermons and export 1-click ProPresenter 7 projector slides.</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Congregation Prayer Chain:</strong> Member petitions with 4-tier privacy escalation (Private $\rightarrow$ Circle $\rightarrow$ Church $\rightarrow$ Atlas).</span>
                </div>
                <div className={styles.personaBullet}>
                  <Check size={16} className={styles.bulletCheck} />
                  <span><strong>Global Mission Shields:</strong> Restricted shields for international workers with masked coordinates for safety.</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/church" className={styles.primaryCta}>
                  <span>Open Church Ministry Hub</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/creators" className={styles.secondaryCta} style={{ border: '1px solid var(--gold-500)', padding: '0.65rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                  <span>Explore Creator Hub</span>
                </Link>
              </div>
            </div>

            <div className={styles.personaInteractivePreview}>
              <span className={styles.previewTag}>Church Prayer &amp; Creator Preview</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>Grace Fellowship Prayer Chain</span>
                <span style={{ fontSize: '0.72rem', background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '99px' }}>URGENT</span>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#4a4030', margin: '0.4rem 0' }}>
                "Standing in prayer for Elder Thomas and ministry partners on mission in Southeast Asia. 84 intercessors praying."
              </p>
              <div style={{ fontStyle: 'italic', fontFamily: 'Lora, serif', fontSize: '0.84rem', color: '#1e1913', background: 'rgba(181, 132, 20, 0.1)', padding: '0.45rem', borderRadius: '6px' }}>
                "Oh, magnify the LORD with me, and let us exalt his name together!" — Psalm 34:3
              </div>
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
                <span>Live Sermon Theatre &amp; Slide Exporter</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Embeddable Website Widgets</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Christian Creator / Ministry Page</span>
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
              <span className={styles.tierPeriod}>Free Forever</span>
            </div>
            <p className={styles.tierDesc}>
              Full offline Bible foundation with 5 free server AI answers/day, or unlimited answers using your own free Gemini API key.
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
                <span>5 Free Server AI Answers / Day</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Unlimited AI with Free Gemini Key (BYOK)</span>
              </div>
              <div className={styles.tierFeatureItem}>
                <Check size={16} color="#059669" />
                <span>Optional Supporter Tier ($4.99/mo)</span>
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

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <Radio size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Live Worship Radio Dock</div>
              <div className={styles.integrationDesc}>Ambient sacred hymns and direct 1-click player docks for K-LOVE, Air1, and Moody Radio.</div>
            </div>
          </div>

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <Tv size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Church Live Sermon Theatre</div>
              <div className={styles.integrationDesc}>Embed zero-cost YouTube Live &amp; Facebook Live broadcasts with synced Scripture study.</div>
            </div>
          </div>

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <Presentation size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>ProPresenter 7 Slide Exporter</div>
              <div className={styles.integrationDesc}>1-Click projector slide export auto-chunking sermon points and Scriptures for Sunday services.</div>
            </div>
          </div>

          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <Scroll size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>Multi-Tradition Catechisms</div>
              <div className={styles.integrationDesc}>Westminster, Heidelberg, Luther, 1689 Baptist, 39 Articles, and Assemblies of God confessions.</div>
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
