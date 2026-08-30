'use client';

import { useState, useEffect } from 'react';
import { SkipForward, Shuffle, Copy, Check, BookOpen, Heart, Sun, MessageSquare, Radio } from 'lucide-react';
import { createWhatsAppShareLink } from '@/lib/whatsapp';
import type { DailyVerse } from '@/app/api/daily/route';
import styles from './page.module.css';

export default function DailyVersePage() {
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(1);
  const [discordStatus, setDiscordStatus] = useState<string | null>(null);

  async function fetchDaily(url = '/api/daily') {
    setLoading(true);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setDailyVerse(data.dailyVerse);
        if (data.currentIndex !== undefined) setCurrentIndex(data.currentIndex);
        if (data.totalCount !== undefined) setTotalCount(data.totalCount);
      }
    } catch (err) {
      console.error('Failed to fetch daily verse:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDaily();
  }, []);

  function handleCopy() {
    if (!dailyVerse) return;
    const text = `"${dailyVerse.text}" — ${dailyVerse.reference} (${dailyVerse.translation})\n\nReflection: ${dailyVerse.reflection}\n\nVia BibleDesk Daily Verse: ${window.location.origin}/daily`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleShareWhatsApp() {
    if (!dailyVerse) return;
    const text = [
      `☀️ *BibleDesk Daily Devotional*`,
      `📖 *${dailyVerse.reference} (${dailyVerse.translation})*`,
      `"${dailyVerse.text}"`,
      '',
      `*Reflection:*`,
      dailyVerse.reflection,
      '',
      `*Daily Prayer:*`,
      `"${dailyVerse.prayer}"`,
      '',
      `🔗 ${window.location.origin}/daily`,
    ].join('\n');
    window.open(createWhatsAppShareLink(text), '_blank');
  }

  async function handleShareDiscord() {
    if (!dailyVerse) return;
    const webhookUrl = typeof window !== 'undefined' ? localStorage.getItem('bibledesk_discord_webhook') : null;
    if (!webhookUrl) {
      const discordText = `**☀️ BibleDesk Daily Devotional • ${dailyVerse.reference} (${dailyVerse.translation})**\n> "${dailyVerse.text}"\n\n**Reflection:** ${dailyVerse.reflection}\n\n🔗 ${window.location.origin}/daily`;
      navigator.clipboard.writeText(discordText);
      setDiscordStatus('Discord text copied!');
      setTimeout(() => setDiscordStatus(null), 2500);
      return;
    }

    setDiscordStatus('Posting to Discord...');
    try {
      const res = await fetch('/api/discord/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          title: `☀️ Daily Devotional • ${dailyVerse.reference}`,
          message: `*"${dailyVerse.text}"*\n\n**Reflection:**\n${dailyVerse.reflection}\n\n**Prayer:**\n"${dailyVerse.prayer}"`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscordStatus('Posted to Discord!');
      } else {
        setDiscordStatus(data.error || 'Failed to post');
      }
    } catch {
      setDiscordStatus('Network error');
    }
    setTimeout(() => setDiscordStatus(null), 2500);
  }

  function handleNext() {
    const nextIdx = (currentIndex + 1) % totalCount;
    fetchDaily(`/api/daily?index=${nextIdx}`);
  }

  function handleRandom() {
    fetchDaily('/api/daily?random=true');
  }

  return (
    <>
      <main className={styles.main}>
        <div className="container">
          <div className={styles.pageHeader}>
            <span className={styles.todayBadge}><Sun size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Daily Devotional</span>
            <h1 className={`${styles.title} text-serif`}>Daily Scripture &amp; Reflection</h1>
            <p className={styles.subtitle}>
              Start your day grounded in God’s Word with curated scripture, commentary, and prayer.
            </p>
            <div className={styles.navBar}>
              <button onClick={handleNext} className={styles.navBtn}>
                <SkipForward size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Next Devotional
              </button>
              <button onClick={handleRandom} className={styles.navBtn}>
                <Shuffle size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Shuffle Random
              </button>
            </div>
          </div>

          {loading ? (
            <div className={`${styles.card} glass-card`}>
              <div className="skeleton" style={{ height: '28px', width: '150px', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: '80px', width: '100%', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: '20px', width: '200px' }} />
            </div>
          ) : dailyVerse ? (
            <div className={`${styles.card} glass-card`}>
              <div className={styles.cardHeader}>
                <span className={styles.date}>{dailyVerse.date}</span>
                <span className={styles.themeTag}>{dailyVerse.theme}</span>
              </div>

              <blockquote className={`${styles.verseText} text-serif`}>
                &ldquo;{dailyVerse.text}&rdquo;
              </blockquote>

              <div className={styles.reference}>
                — {dailyVerse.reference} <span className={styles.transTag}>({dailyVerse.translation})</span>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}><Sun size={15} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--gold-400)' }} /> Morning Reflection</h3>
                <p className={styles.sectionBody}>{dailyVerse.reflection}</p>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}><Heart size={15} style={{ marginRight: '6px', verticalAlign: 'middle', color: 'var(--dim-practical)' }} /> Daily Prayer</h3>
                <p className={`${styles.sectionBody} text-serif`}>&ldquo;{dailyVerse.prayer}&rdquo;</p>
              </div>

              <div className={styles.cardFooter}>
                <button onClick={handleCopy} className={styles.copyBtn}>
                  {copied ? (
                    <><Check size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Copied</>
                  ) : (
                    <><Copy size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Copy</>
                  )}
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className={styles.copyBtn}
                  title="Share to WhatsApp"
                >
                  <MessageSquare size={14} style={{ marginRight: '5px', verticalAlign: 'middle', color: '#25D366' }} /> WhatsApp
                </button>

                <button
                  onClick={handleShareDiscord}
                  className={styles.copyBtn}
                  title="Post to Discord channel"
                >
                  <Radio size={14} style={{ marginRight: '5px', verticalAlign: 'middle', color: '#5865F2' }} />
                  {discordStatus || 'Discord'}
                </button>

                <a
                  href={`/bible?book=${encodeURIComponent(dailyVerse.reference.split(' ')[0])}`}
                  className={styles.readMoreLink}
                >
                  <BookOpen size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Open Reader →
                </a>
              </div>
            </div>
          ) : (
            <div className={styles.error}>Could not load daily verse.</div>
          )}
        </div>
      </main>
    </>
  );
}
