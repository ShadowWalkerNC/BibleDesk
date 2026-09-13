'use client';

import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  Globe,
  Code,
  ArrowRight,
  Check,
  MessageCircle,
  Layers,
  Terminal,
  Scroll,
  Brain,
} from 'lucide-react';
import styles from './MarketingShowcase.module.css';

export default function MarketingShowcase() {
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
          Treasury of Scripture Knowledge cross-references, a global prayer atlas, and an open developer SDK.
        </p>

        <div className={styles.heroActions}>
          <Link href="/bible" className={styles.primaryCta}>
            <BookOpen size={18} />
            <span>Open Study Desk</span>
            <ArrowRight size={16} />
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
            <Check size={16} color="#059669" />
            <span>5 Free AI Answers Daily · Unlimited with BYOK</span>
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

      {/* ── 2. Persona Section ── */}
      <section className={styles.personaSection} aria-label="Audience Personas">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Tailored for the Body of Christ</span>
          <h2 className={styles.sectionTitle}>Built for Believers</h2>
          <p className={styles.sectionSubtitle}>
            For personal discipleship and daily devotion, BibleDesk provides the local-first biblical foundation.
          </p>
        </div>

        {/* Individual Believers */}
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
                <Link href="/study-resources?tab=encourage" className={styles.secondaryCta} style={{ border: '1px solid var(--gold-500)', padding: '0.65rem 1.25rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
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

      </section>

      {/* ── 3. Transparent Pricing Grid ── */}
      <section className={styles.pricingSection} aria-label="Transparent Pricing">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBadge}>Transparent Stewardship</span>
          <h2 className={styles.sectionTitle}>Simple, Kingdom-First Pricing</h2>
          <p className={styles.sectionSubtitle}>
            We believe the Word of God should never be locked behind a paywall. Scripture reading, concordance
            lookups, and Strong’s lexicons remain free forever.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {/* Tier 1: Individual Believers */}
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
            </div>

            <Link href="/login" className={styles.secondaryCta} style={{ width: '100%', justifyContent: 'center' }}>
              <span>Sign Up for Free</span>
            </Link>
          </div>

          {/* Tier 2: Developers & Open Source */}
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
            Access BibleDesk in your browser and as an installable PWA, share verses over WhatsApp,
            and export to your personal Obsidian notes.
          </p>
        </div>

        <div className={styles.integrationsGrid}>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIconBox}>
              <MessageCircle size={20} />
            </div>
            <div>
              <div className={styles.integrationTitle}>WhatsApp Sharing</div>
              <div className={styles.integrationDesc}>Share verses and encouragements straight into WhatsApp chats with wa.me links — no bot, no server needed.</div>
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
