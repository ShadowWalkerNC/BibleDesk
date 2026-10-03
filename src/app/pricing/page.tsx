'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Sparkles,
  BookOpen,
  Crown,
  Server,
  ArrowRight,
} from 'lucide-react';
import { TIERS, getUserTier, type SubscriptionTier } from '@/lib/tiers';
import { authHeaders, getAuthToken, getAuthUser } from '@/lib/client-auth';
import styles from './page.module.css';

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const sessionUser = getAuthUser();
    setUser(sessionUser);
    if (sessionUser) {
      fetch('/api/auth/me', { headers: authHeaders(), cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const tier = data?.tier;
          if (tier === 'pro' || tier === 'ministry' || tier === 'lifetime') {
            setCurrentTier(tier);
          } else {
            setCurrentTier(getUserTier(null));
          }
        })
        .catch(() => setCurrentTier(getUserTier(null)));
    }
  }, []);

  async function handleSubscribe(tier: SubscriptionTier) {
    if (tier === 'free') {
      router.push('/bible');
      return;
    }

    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoadingTier(tier);
    setNotification(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          tier,
          interval: isAnnual ? 'year' : 'month',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate upgrade');
      }

      if (data.mode === 'mock') {
        setCurrentTier(tier);
        setNotification(`✓ ${tier.toUpperCase()} membership activated successfully (Local/Self-Hosted Mode)!`);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setNotification(`Error: ${err.message}`);
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleManageBilling() {
    if (!user) {
      router.push('/login?redirect=/pricing');
      return;
    }

    setLoadingTier('pro');
    setNotification(null);

    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to open customer portal');
      }

      if (data.mode === 'mock') {
        setNotification('✓ Local/Self-Hosted Mode: Your Pro membership is active and managed locally.');
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setNotification(`Error: ${err.message}`);
    } finally {
      setLoadingTier(null);
    }
  }


  return (
    <main className={styles.container}>
      {/* ── Hero Section ── */}
      <section className={styles.hero}>
        <div className={styles.badge}>
          <Crown size={14} />
          <span>100% Free &amp; Open Access</span>
        </div>
        <h1 className={`${styles.title} text-serif`}>
          Completely Free Bible Study Platform
        </h1>
        <p className={styles.subtitle}>
          No subscriptions, no paywalls, and no paid tiers. All Scripture reading, Strong’s lexicons, concordance search,
          and prayer features are 100% free forever. Every user receives 5 free AI answers daily, or connect your personal
          Google Gemini or Muse AI account for unlimited study queries!
        </p>

        {notification && (
          <div className={styles.notificationBanner}>
            {notification}
          </div>
        )}
      </section>

      {/* ── Pricing Grid ── */}
      <section className={styles.cardsGrid}>
        {/* Tier 1: Community (Free Core) */}
        <div className={`${styles.card} ${styles.cardFeatured}`}>
          <div className={styles.popularPill}>100% Free Forever</div>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconBox}><BookOpen size={20} /></div>
            <h2 className={styles.cardTitle}>Community Foundation</h2>
            <p className={styles.cardDesc}>Complete Scripture study and 5-dimension grounded research.</p>
            <div className={styles.priceRow}>
              <span className={styles.priceAmount}>$0</span>
              <span className={styles.pricePeriod}>Free for Everyone</span>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>6 Offline Bible Translations (KJV, ASV, WEB, BBE, Darby, YLT)</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>Strong’s Greek (5.5k) &amp; Hebrew (8.6k) Lexicons</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>500,000+ TSK Cross-References</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>5 Free Server AI Answers / Day per user</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>Local Notes, Bookmarks, Highlights &amp; Collections</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>Open REST API &amp; Model Context Protocol (MCP)</span></div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/bible')}
            className={styles.tierBtnPrimary}
          >
            Start Reading Scripture
          </button>
        </div>

        {/* Tier 2: BYOK Gemini */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconBox} style={{ background: 'rgba(181, 132, 20, 0.15)', color: '#b58414' }}>
              <Sparkles size={20} />
            </div>
            <h2 className={styles.cardTitle}>BYOK Gemini AI</h2>
            <p className={styles.cardDesc}>Bring your free personal Google Gemini key for unlimited queries.</p>
            <div className={styles.priceRow}>
              <span className={styles.priceAmount}>$0</span>
              <span className={styles.pricePeriod}>Google AI Studio Key</span>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>All Foundation Features Included</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Unlimited 5-Dimension AI Study Answers</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Bypass the Daily 5-Answer Server Limit</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Stored Privately on Your User Profile</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Direct Google Gemini 2.5 Flash Inference</strong></div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/bible')}
            className={styles.tierBtnSecondary}
          >
            Configure in Study Settings
          </button>
        </div>

        {/* Tier 3: Muse AI Integration */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconBox}><Crown size={20} /></div>
            <h2 className={styles.cardTitle}>Muse AI Account Connection</h2>
            <p className={styles.cardDesc}>Connect your Muse AI account directly to BibleDesk.</p>
            <div className={styles.priceRow}>
              <span className={styles.priceAmount}>$0</span>
              <span className={styles.pricePeriod}>Personal Muse Account</span>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>All Foundation Features Included</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Use Your Own Muse Account Quota</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Unlimited AI Answers via Muse</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Muse Code CLI &amp; Terminal Pairing Ready</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Works Across All BibleDesk Workspaces</strong></div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/bible')}
            className={styles.tierBtnSecondary}
          >
            Connect Muse Account
          </button>
        </div>
      </section>

      {/* ── Feature Comparison Matrix Table ── */}
      <section className={styles.tableSection}>
        <div className={styles.tableHeading}>
          <h2 className={`${styles.tableTitle} text-serif`}>Compare Plan Features</h2>
          <p className={styles.tableSubtitle}>Transparent breakdown of capabilities across all tiers.</p>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th className={styles.colFeature}>Feature</th>
                <th className={styles.colTier}>Free Core</th>
                <th className={`${styles.colTier} ${styles.colTierHighlight}`}>BYOK Gemini</th>
                <th className={styles.colTier}>Muse AI Account</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>6 Public-Domain Bibles (Offline)</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Strong’s Greek &amp; Hebrew Lexicons</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>TSK Cross-References (500k+)</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Daily AI Answers Quota</td>
                <td>5 / day (Server-managed)</td>
                <td><strong>Unlimited (Personal Key)</strong></td>
                <td><strong>Unlimited (Muse Account)</strong></td>
              </tr>
              <tr>
                <td>Custom API Key / Account Connectivity</td>
                <td>Server default</td>
                <td>✓ Google Gemini Key</td>
                <td>✓ Muse AI Token</td>
              </tr>
              <tr>
                <td>Notes, Bookmarks &amp; Highlights</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Biblical Knowledge Graph Explorer</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>1-Click Obsidian Vault (.zip) Export</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Terminal AI Pairing &amp; MCP Server</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Open Source & Self-Host Callout ── */}
      <section className={styles.selfHostCallout}>
        <div className={styles.selfHostContent}>
          <Server size={32} className={styles.selfHostIcon} />
          <div>
            <h3>Self-Hosting for Your Church or Ministry?</h3>
            <p>
              BibleDesk is 100% open-source under the MIT License. You can run your own instance via Docker
              or on your own cloud servers with full Pro capabilities enabled.
            </p>
          </div>
          <Link href="/developers" className={styles.selfHostLink}>
            <span>View Deploy Docs</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className={styles.faqSection}>
        <h2 className={`${styles.faqTitle} text-serif`}>Frequently Asked Questions</h2>
        <div className={styles.faqGrid}>
          <div className={styles.faqCard}>
            <h4>Why is Bible reading completely free?</h4>
            <p>
              We believe the Word of God belongs to the whole world. Scripture text, lexicons, and cross-references
              run entirely on public-domain data and will never require payment or tracking.
            </p>
          </div>

          <div className={styles.faqCard}>
            <h4>What does the Pro subscription pay for?</h4>
            <p>
              Pro funds the high-performance server GPU/cloud compute required to run deep 5-dimension AI synthesis,
              real-time database sync across your devices, and ongoing open-source maintenance.
            </p>
          </div>

          <div className={styles.faqCard}>
            <h4>Can I use AI without a paid subscription?</h4>
            <p>
              Yes! You receive 5 free server AI answers every day. You can also paste your own free Google Gemini API key
              (BYOK) in the settings for unlimited personal AI queries with zero payment.
            </p>
          </div>

          <div className={styles.faqCard}>
            <h4>Can I cancel my membership anytime?</h4>
            <p>
              Yes. You can cancel with one click from your profile. Your notes and study history remain safely on your device
              and accessible in your free account.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
