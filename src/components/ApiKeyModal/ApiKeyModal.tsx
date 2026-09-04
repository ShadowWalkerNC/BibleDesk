'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Key, Sparkles, BookOpen, ExternalLink, Check, Trash2, X, ShieldCheck, UserCheck, LogIn, ChevronDown, ChevronUp } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase';
import styles from './ApiKeyModal.module.css';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showOverride, setShowOverride] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const stored = localStorage.getItem('bibledesk_gemini_key') || '';
      setApiKey(stored);
      setHasExistingKey(!!stored);
      setSaved(false);

      const supabase = getBrowserClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          setShowOverride(true);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem('bibledesk_gemini_key', trimmed);
      setHasExistingKey(true);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1000);
    }
  }

  function handleClear() {
    localStorage.removeItem('bibledesk_gemini_key');
    setApiKey('');
    setHasExistingKey(false);
    setSaved(false);
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleRow}>
            <div className={styles.iconWrap} aria-hidden="true">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className={styles.title}>AI Study Assistant &amp; Keys</h2>
              <p className={styles.subtitle}>Google Gemini 5-Dimension Assistant Status</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Status for Signed In User */}
        {user ? (
          <div className={styles.includedBanner} style={{
            background: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <UserCheck size={18} style={{ color: '#34d399' }} />
              <strong style={{ color: '#34d399', fontSize: '0.9rem' }}>
                Gemini AI Included &amp; Active
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              You are signed in as <strong>{user.user_metadata?.name || user.email}</strong>. 
              Your account includes automatic access to Google Gemini 2.5 Flash for 5-dimension study questions (15 questions/hr). No personal API key is required.
            </p>
          </div>
        ) : (
          <div className={styles.guestBanner} style={{
            background: 'rgba(212, 160, 23, 0.1)',
            border: '1px solid rgba(212, 160, 23, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={18} style={{ color: 'var(--gold-400)' }} />
              <strong style={{ color: 'var(--gold-400)', fontSize: '0.9rem' }}>
                Sign In to Unlock Free AI Assistant
              </strong>
            </div>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Creating a free account unlocks our server-hosted Gemini AI model automatically. Or, enter your own free Gemini key below to continue as a guest.
            </p>
            <Link
              href="/login"
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--gold-500)',
                color: 'var(--navy-950)',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-xs)',
                textDecoration: 'none'
              }}
            >
              <LogIn size={14} />
              <span>Sign In or Create Account</span>
            </Link>
          </div>
        )}

        {/* Free Bible Guarantee Banner */}
        <div className={styles.infoBanner}>
          <div className={styles.infoBannerIcon}>
            <BookOpen size={18} />
          </div>
          <div className={styles.infoBannerText}>
            <strong>Bible Reader &amp; Concordance are 100% Free &amp; Open</strong>
            <p>
              All 6 translations (KJV, ASV, WEB, BBE, Darby, YLT), Strong’s Greek/Hebrew lexicons,
              and cross-references are bundled and work offline without any account or API key.
            </p>
          </div>
        </div>

        {/* Advanced BYOK Accordion for signed in users, or main form for guests */}
        {user && (
          <button
            type="button"
            onClick={() => setShowOverride(!showOverride)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              padding: '0.5rem 0',
              margin: '0.5rem 0',
            }}
          >
            <span>{showOverride ? 'Hide' : 'Show'} Custom API Key Override (for power users)</span>
            {showOverride ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}

        {showOverride && (
          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor="gemini-key-input" className={styles.label}>
                <Key size={14} className={styles.sparkleIcon} />
                <span>Custom Google Gemini API Key</span>
              </label>
              <input
                id="gemini-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setSaved(false);
                }}
                placeholder="AIzaSy..."
                className={styles.input}
                autoComplete="off"
                spellCheck={false}
              />
              <p className={styles.fieldHint}>
                Overrides the default server quota with your own personal Gemini API key. Stored locally in your browser only.
              </p>
            </div>

            <div className={styles.linkRow}>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLink}
              >
                <span>Get a free Gemini API key from Google AI Studio</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div className={styles.securityNote}>
              <ShieldCheck size={14} />
              <span>Zero Credential Logging: Your custom key is sent directly to Google Gemini and is never stored on our database.</span>
            </div>

            {/* Action Buttons */}
            <div className={styles.actions}>
              {hasExistingKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={styles.clearBtn}
                  title="Remove custom API key"
                >
                  <Trash2 size={15} />
                  <span>Remove Key</span>
                </button>
              )}
              <div className={styles.rightActions}>
                <button type="button" onClick={onClose} className={styles.cancelBtn}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!apiKey.trim() || saved}
                  className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
                >
                  {saved ? (
                    <>
                      <Check size={16} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Key</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
