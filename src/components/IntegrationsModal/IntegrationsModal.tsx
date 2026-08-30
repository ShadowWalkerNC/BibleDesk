'use client';

import { useState, useEffect } from 'react';
import { 
  Share2, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  Sparkles, 
  BookOpen, 
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { createWhatsAppShareLink } from '@/lib/whatsapp';
import styles from './IntegrationsModal.module.css';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntegrationsModal({ isOpen, onClose }: IntegrationsModalProps) {
  const [activeTab, setActiveTab] = useState<'discord' | 'whatsapp'>('discord');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [savedDiscord, setSavedDiscord] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      setDiscordWebhookUrl(localStorage.getItem('bibledesk_discord_webhook') || '');
      setWhatsappPhone(localStorage.getItem('bibledesk_whatsapp_phone') || '');
      setTestResult(null);
      setSavedDiscord(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSaveDiscord(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('bibledesk_discord_webhook', discordWebhookUrl.trim());
    setSavedDiscord(true);
    setTimeout(() => setSavedDiscord(false), 2000);
  }

  async function handleTestDiscord() {
    if (!discordWebhookUrl.trim()) return;
    setTestingDiscord(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/discord/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl.trim(),
          title: '✦ BibleDesk Integration Connected',
          message: 'Your Discord channel is now connected to BibleDesk. Daily devotionals, sermon notes, and study answers can be dispatched directly here.',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: 'Test message sent to Discord successfully!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to send to Discord.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error.' });
    } finally {
      setTestingDiscord(false);
    }
  }

  function handleCopyWebhookUrl() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bibledesk.org';
    navigator.clipboard.writeText(`${origin}/api/discord/interactions`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleRow}>
            <div className={styles.iconWrap} aria-hidden="true">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className={styles.title}>Discord &amp; WhatsApp Integrations</h2>
              <p className={styles.subtitle}>Connect your church communities, channels, &amp; study groups</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabNav} role="tablist">
          <button
            className={`${styles.tabBtn} ${activeTab === 'discord' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('discord')}
            role="tab"
            aria-selected={activeTab === 'discord'}
          >
            <Radio size={15} />
            <span>Discord Channels &amp; Bot</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'whatsapp' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('whatsapp')}
            role="tab"
            aria-selected={activeTab === 'whatsapp'}
          >
            <MessageSquare size={15} />
            <span>WhatsApp Sharing &amp; Bot</span>
          </button>
        </div>

        {/* Tab 1: Discord */}
        {activeTab === 'discord' && (
          <div className={styles.tabBody}>
            <div className={styles.sectionHeader}>
              <strong>1. Channel Webhook Dispatch</strong>
              <p>Post 5-Dimension study answers, prayer requests, and daily devotionals directly to a Discord text channel.</p>
            </div>

            <form onSubmit={handleSaveDiscord} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label htmlFor="discord-url" className={styles.label}>
                  Discord Webhook URL
                </label>
                <input
                  id="discord-url"
                  type="url"
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className={styles.input}
                />
                <p className={styles.fieldHint}>
                  Obtained in Discord Server Settings → Integrations → Webhooks → New Webhook.
                </p>
              </div>

              {testResult && (
                <div className={`${styles.testAlert} ${testResult.success ? styles.testSuccess : styles.testError}`}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className={styles.formRow}>
                <button
                  type="button"
                  onClick={handleTestDiscord}
                  disabled={!discordWebhookUrl.trim() || testingDiscord}
                  className={styles.testBtn}
                >
                  <Send size={14} />
                  <span>{testingDiscord ? 'Sending...' : 'Send Test Notification'}</span>
                </button>
                <button
                  type="submit"
                  disabled={!discordWebhookUrl.trim()}
                  className={styles.saveBtn}
                >
                  {savedDiscord ? <Check size={14} /> : null}
                  <span>{savedDiscord ? 'Saved!' : 'Save Webhook'}</span>
                </button>
              </div>
            </form>

            <div className={styles.divider} />

            <div className={styles.sectionHeader}>
              <strong>2. Slash Command Bot Endpoint</strong>
              <p>Supports `/daily`, `/bible [ref]`, and `/ask [question]` within Discord servers.</p>
            </div>

            <div className={styles.codeSnippetBox}>
              <div className={styles.codeSnippetText}>
                Interactions Endpoint: <code>/api/discord/interactions</code>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className={styles.copyBtn}
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied' : 'Copy Endpoint'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: WhatsApp */}
        {activeTab === 'whatsapp' && (
          <div className={styles.tabBody}>
            <div className={styles.sectionHeader}>
              <strong>1. Instant 1-Click Click-to-Chat Share</strong>
              <p>Forward daily verses, sermon study outlines, or 5-dimension answers directly to WhatsApp study groups.</p>
            </div>

            <div className={styles.infoCard}>
              <BookOpen size={16} className={styles.infoCardIcon} />
              <div>
                <strong>Broadcast to Church Small Groups</strong>
                <p>Every study answer and daily devotional includes a pre-formatted WhatsApp share button formatted with bold titles and links.</p>
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.sectionHeader}>
              <strong>2. Meta WhatsApp Business Cloud Webhook</strong>
              <p>Receive inbound messages and reply automatically to Bible lookups and AI questions.</p>
            </div>

            <div className={styles.metaGuide}>
              <p><strong>Configured Webhook URL:</strong></p>
              <code>{typeof window !== 'undefined' ? window.location.origin : 'https://bibledesk.org'}/api/whatsapp/webhook</code>
              <p style={{ marginTop: '8px' }}><strong>Supported User Keywords:</strong></p>
              <ul className={styles.keywordList}>
                <li><code>daily</code> — Returns today's verse &amp; devotional reflection.</li>
                <li><code>John 3:16</code> — Returns verse text with Strong's definition links.</li>
                <li><code>ask: What is grace?</code> — Returns 5-Dimension AI Study Guide.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.closeModalBtn}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
