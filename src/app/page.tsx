'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Sun,
  Brain,
  Scroll,
  Church,
  Sparkles,
  Heart,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import SearchBar from '@/components/SearchBar/SearchBar';
import DimensionPanel from '@/components/DimensionPanel/DimensionPanel';
import StreamingProgress from '@/components/StreamingProgress/StreamingProgress';
import RateLimitBar from '@/components/RateLimitBar/RateLimitBar';
import SacredHaloCanvas from '@/components/SacredHaloCanvas/SacredHaloCanvas';
import { ErrorState } from '@/components/LoadingState/LoadingState';
import { useStreamingAsk } from '@/hooks/useStreamingAsk';
import { getBrowserClient } from '@/lib/supabase';
import MarketingShowcase from '@/components/MarketingShowcase/MarketingShowcase';
import styles from './page.module.css';

const QUICK_LINKS = [
  { label: 'Study Desk',    href: '/bible',    icon: BookOpen },
  { label: 'Daily Verse',   href: '/daily',    icon: Sun },
  { label: 'Plans',         href: '/plans',    icon: Calendar },
  { label: 'Verse Memory',  href: '/memory',   icon: Brain },
  { label: 'Encouragement', href: '/encourage',icon: Sparkles },
  { label: 'Church Hub',    href: '/church',   icon: Church },
  { label: 'Prayer Atlas',  href: '/prayer',   icon: Heart },
  { label: 'Developers',    href: '/developers',icon: MessageSquare },
];

const PLACEHOLDERS = [
  'What did Jesus mean by "born again"?',
  'Explain the armor of God in Ephesians 6',
  'Who wrote the book of Hebrews?',
  'What is the significance of the number 40 in the Bible?',
  'What does "selah" mean in the Psalms?',
  'Why did God harden Pharaoh\'s heart?',
  'What is the Sermon on the Mount about?',
  'Explain the Trinity in Scripture',
];

const DAILY_VERSE = {
  text: 'Your word is a lamp to my feet and a light to my path.',
  ref: 'Psalm 119:105',
  translation: 'KJV',
};

export default function HomePage() {
  const { status, stages, answer, shareSlug, error, rateLimit, ask, retry } = useStreamingAsk();
  const answerRef = useRef<HTMLDivElement>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  function handleAsk(question: string, translation: import('@/types').TranslationId, isNonAI = false) {
    ask(question, translation, isNonAI);
    setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  const isLoading  = status === 'loading';
  const hasContent = isLoading || answer !== null || error !== null;

  // Render Marketing Showcase for unauthenticated visitors
  if (user === null) {
    return <MarketingShowcase />;
  }

  return (
    <div className={styles.startScreen}>

      {/* ── Left column: Verse + Quick Start ──────────────────── */}
      <section className={styles.leftCol} aria-label="Start">

        {/* Wordmark */}
        <div className={styles.wordmarkRow}>
          <div className={styles.wordmarkIcon} aria-hidden="true">✦</div>
          <h1 className={styles.wordmark}>
            Bible<span>Desk</span>
          </h1>
        </div>

        {/* Daily Verse card */}
        <blockquote className={styles.dailyVerse}>
          <p className={styles.dailyVerseText}>"{DAILY_VERSE.text}"</p>
          <footer className={styles.dailyVerseRef}>
            <cite>{DAILY_VERSE.ref}</cite>
            <span className={styles.dailyVerseTrans}>{DAILY_VERSE.translation}</span>
          </footer>
        </blockquote>

        {/* Primary CTA */}
        <Link href="/bible" className={styles.primaryCta}>
          <BookOpen size={18} />
          <span>Open Study Desk</span>
          <ArrowRight size={15} className={styles.ctaArrow} />
        </Link>

        {/* Quick links grid */}
        <nav className={styles.quickNav} aria-label="Quick navigation">
          <p className={styles.quickNavLabel}>Tools</p>
          <div className={styles.quickGrid}>
            {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className={styles.quickItem}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </section>

      {/* ── Right column: AI Assistant ────────────────────────── */}
      <section className={styles.rightCol} aria-label="AI study assistant" id="assistant">

        <header className={styles.assistantHeader}>
          <Sparkles size={16} className={styles.assistantIcon} />
          <div>
            <h2 className={styles.assistantTitle}>5-Dimension Assistant</h2>
            <p className={styles.assistantSubtitle}>
              Scripture · Historical · Language · Theology · Application
            </p>
          </div>
        </header>

        <div className={styles.searchWrapper}>
          <SearchBar
            onSubmit={handleAsk}
            isLoading={isLoading}
            placeholder={PLACEHOLDERS[placeholderIdx]}
          />
          {rateLimit && (
            <div className={styles.rateLimitWrapper}>
              <RateLimitBar rateLimit={rateLimit} />
            </div>
          )}
        </div>

        {/* Answer area */}
        <div ref={answerRef} className={styles.answerArea}>
          {hasContent && (
            <div aria-label="Study answer" aria-live="polite">
              {isLoading && <StreamingProgress completedStages={stages} />}
              {error && !isLoading && (
                <ErrorState message={error} onRetry={retry} />
              )}
              {answer && status === 'done' && (
                <DimensionPanel answer={answer} shareSlug={shareSlug ?? undefined} />
              )}
            </div>
          )}
          {!hasContent && (
            <div className={styles.answerPlaceholder}>
              <div style={{ width: '100%', height: '220px', marginBottom: '0.75rem' }}>
                <SacredHaloCanvas tintColor="#b58414" />
              </div>
              <p>Ask a question above to explore Scripture across all 5 dimensions with Strong's lexicons and historical context.</p>
            </div>
          )}
        </div>

      </section>
    </div>
  );
}
