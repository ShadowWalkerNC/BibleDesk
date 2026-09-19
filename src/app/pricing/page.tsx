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
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase';
import styles from './page.module.css';

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getBrowserClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        supabase
          .from('profiles')
          .select('subscription_tier, subscription_status')
          .eq('id', u.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setCurrentTier(getUserTier(data));
            }
          });
      }
    });
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
          Authorization: `Bearer ${(await getBrowserClient().auth.getSession()).data.session?.access_token}`,
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
          Authorization: `Bearer ${(await getBrowserClient().auth.getSession()).data.session?.access_token}`,
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
          <span>Kingdom-First Stewardship</span>
        </div>
        <h1 className={`${styles.title} text-serif`}>
          Honest, Transparent Study Tiers
        </h1>
        <p className={styles.subtitle}>
          God’s Word should never be locked behind a paywall. Scripture reading, concordance search,
          and Strong’s lexicons remain free forever. Paid tiers fund hosted AI compute and cloud infrastructure.
        </p>

        {/* Billing Cycle Toggle */}
        <div className={styles.toggleContainer}>
          <span className={!isAnnual ? styles.toggleActive : ''}>Monthly</span>
          <button
            type="button"
            className={styles.toggleTrack}
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Toggle annual billing"
          >
            <div className={`${styles.toggleThumb} ${isAnnual ? styles.toggleThumbRight : ''}`} />
          </button>
          <span className={isAnnual ? styles.toggleActive : ''}>
            Annual <span className={styles.discountBadge}>Save 30%</span>
          </span>
        </div>

        {notification && (
          <div className={styles.notificationBanner}>
            {notification}
          </div>
        )}
      </section>

      {/* ── Pricing Grid ── */}
      <section className={styles.cardsGrid}>
        {/* Tier 1: Community (Free) */}
        <div className={`${styles.card} ${currentTier === 'free' ? styles.cardCurrent : ''}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconBox}><BookOpen size={20} /></div>
            <h2 className={styles.cardTitle}>Community Core</h2>
            <p className={styles.cardDesc}>Complete, offline Scripture study for individual believers.</p>
            <div className={styles.priceRow}>
              <span className={styles.priceAmount}>$0</span>
              <span className={styles.pricePeriod}>Free Forever</span>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>6 Offline Bible Translations</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>Strong’s Greek &amp; Hebrew Lexicons</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>500,000+ TSK Cross-References</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>5 Free Server AI Answers / Day</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>Unlimited AI with BYOK Gemini Key</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>Local Notes, Bookmarks &amp; Highlights</span></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><span>Open REST API &amp; Local MCP Engine</span></div>
          </div>

          <button
            type="button"
            onClick={() => handleSubscribe('free')}
            className={styles.tierBtnSecondary}
          >
            {currentTier === 'free' ? 'Current Plan' : 'Use Free Core'}
          </button>
        </div>

        {/* Tier 2: Pro (Featured) */}
        <div className={`${styles.card} ${styles.cardFeatured} ${currentTier === 'pro' ? styles.cardCurrent : ''}`}>
          <div className={styles.popularPill}>Most Popular</div>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconBox} style={{ background: 'rgba(181, 132, 20, 0.15)', color: '#b58414' }}>
              <Sparkles size={20} />
            </div>
            <h2 className={styles.cardTitle}>BibleDesk Pro</h2>
            <p className={styles.cardDesc}>Deep study superpowers with cloud sync and hosted AI compute.</p>
            <div className={styles.priceRow}>
              <span className={styles.priceAmount}>
                ${isAnnual ? Math.round(TIERS.pro.priceAnnual / 12) : TIERS.pro.priceMonthly}
              </span>
              <span className={styles.pricePeriod}>/ month {isAnnual ? '(billed $60/yr)' : ''}</span>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>All Community Features Included</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>250 Hosted AI Answers / Day (Zero Config)</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Real-Time Cloud Notes &amp; Highlights Sync</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Cross-Device Reading History &amp; Plans</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>1-Click Obsidian Vault (.zip) Export</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Formatted PDF Study Worksheets</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Google Calendar Prayer Care Sync</strong></div>
          </div>

          <button
            type="button"
            disabled={loadingTier === 'pro'}
            onClick={() => currentTier === 'pro' ? handleManageBilling() : handleSubscribe('pro')}
            className={styles.tierBtnPrimary}
          >
            {loadingTier === 'pro' ? 'Opening...' : currentTier === 'pro' ? 'Manage Subscription' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* Tier 3: Ministry & Leader */}
        <div className={`${styles.card} ${currentTier === 'ministry' ? styles.cardCurrent : ''}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconBox}><Crown size={20} /></div>
            <h2 className={styles.cardTitle}>Ministry &amp; Church Leader</h2>
            <p className={styles.cardDesc}>Collaborative tools for pastors, teachers, and small groups.</p>
            <div className={styles.priceRow}>
              <span className={styles.priceAmount}>
                ${isAnnual ? Math.round(TIERS.ministry.priceAnnual / 12) : TIERS.ministry.priceMonthly}
              </span>
              <span className={styles.pricePeriod}>/ month {isAnnual ? '(billed $180/yr)' : ''}</span>
            </div>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Everything in BibleDesk Pro</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>1,000 Hosted AI Answers / Day</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Sermon Prep Workspace &amp; Scripture Clipper</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Shared Small Group Study Notes</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Shared Group Prayer Boards &amp; Rhythms</strong></div>
            <div className={styles.featureItem}><Check size={16} color="#059669" /><strong>Priority Pastoral Support &amp; Roadmap Voting</strong></div>
          </div>

          <button
            type="button"
            disabled={loadingTier === 'ministry'}
            onClick={() => currentTier === 'ministry' ? handleManageBilling() : handleSubscribe('ministry')}
            className={styles.tierBtnSecondary}
          >
            {loadingTier === 'ministry' ? 'Opening...' : currentTier === 'ministry' ? 'Manage Subscription' : 'Select Ministry Tier'}
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
                <th className={`${styles.colTier} ${styles.colTierHighlight}`}>Pro</th>
                <th className={styles.colTier}>Ministry</th>
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
                <td>Daily Hosted AI Answers Quota</td>
                <td>5 / day</td>
                <td><strong>250 / day</strong></td>
                <td><strong>1,000 / day</strong></td>
              </tr>
              <tr>
                <td>Bring-Your-Own-Key (BYOK Gemini)</td>
                <td>✓ Unlimited</td>
                <td>✓ Unlimited</td>
                <td>✓ Unlimited</td>
              </tr>
              <tr>
                <td>Cloud Notes &amp; Highlights Sync</td>
                <td>Local only</td>
                <td>✓ Real-Time</td>
                <td>✓ Real-Time</td>
              </tr>
              <tr>
                <td>1-Click Obsidian Vault (.zip) Export</td>
                <td>—</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Formatted Printable PDF Worksheets</td>
                <td>—</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Google Calendar Prayer Care Sync</td>
                <td>—</td>
                <td>✓ Included</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Pastoral Reviewed Gmail Follow-ups</td>
                <td>—</td>
                <td>—</td>
                <td>✓ Included</td>
              </tr>
              <tr>
                <td>Group Workspaces &amp; Shared Notes</td>
                <td>—</td>
                <td>—</td>
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
