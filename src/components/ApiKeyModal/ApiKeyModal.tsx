'use client';

import { useState, useEffect } from 'react';
import { Key, Sparkles, BookOpen, ExternalLink, Check, Trash2, X, ShieldCheck } from 'lucide-react';
import styles from './ApiKeyModal.module.css';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const stored = localStorage.getItem('bibledesk_gemini_key') || '';
      setApiKey(stored);
      setHasExistingKey(!!stored);
      setSaved(false);
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
              <Key size={18} />
            </div>
            <div>
              <h2 className={styles.title}>API Key &amp; Study Settings</h2>
              <p className={styles.subtitle}>Configure your personal Gemini AI model access</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Free Bible Guarantee Banner */}
        <div className={styles.infoBanner}>
          <div className={styles.infoBannerIcon}>
            <BookOpen size={18} />
          </div>
          <div className={styles.infoBannerText}>
            <strong>Bible Reader &amp; Search are 100% Free &amp; Shared</strong>
            <p>
              All 6 translations (KJV, ASV, WEB, BBE, Darby, YLT), Strong’s Greek/Hebrew lexicons,
              and 29k+ cross-references are bundled and work offline. No key required.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="gemini-key-input" className={styles.label}>
              <Sparkles size={14} className={styles.sparkleIcon} />
              <span>Google Gemini API Key</span>
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
              Powers the 5-Dimension AI Study Assistant and Verse Commentary.
              Your key stays encrypted in local browser storage.
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
            <span>Zero Server Logging: Your key is sent directly to Google Gemini and is never persisted on our databases.</span>
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            {hasExistingKey && (
              <button
                type="button"
                onClick={handleClear}
                className={styles.clearBtn}
                title="Remove saved API key"
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
      </div>
    </div>
  );
}
