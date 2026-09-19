'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Check,
  Compass,
  Command,
  Key,
  Shield,
  X,
  Layers,
  Heart,
  Wrench,
} from 'lucide-react';
import type { TranslationId } from '@/types';
import styles from './OnboardingModal.module.css';

interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  onComplete?: (preferences: UserOnboardingPreferences) => void;
}

export interface UserOnboardingPreferences {
  translation: TranslationId;
  studyPersona: 'devotional' | 'theological' | 'pastoral' | 'group';
  geminiKey?: string;
  themePreference: 'parchment' | 'light' | 'dark';
  loadSampleWorkspace?: boolean;
}

const TRANSLATIONS: { id: TranslationId; name: string; desc: string }[] = [
  { id: 'web', name: 'World English Bible (WEB)', desc: 'Modern, clear English · completely public domain' },
  { id: 'kjv', name: 'King James Version (KJV)', desc: 'Historic 1611 literary majesty' },
  { id: 'asv', name: 'American Standard Version (ASV)', desc: 'Literal, scholarly 1901 translation' },
  { id: 'darby', name: 'Darby Translation', desc: 'Direct literal rendering by J.N. Darby' },
  { id: 'bbe', name: 'Bible in Basic English (BBE)', desc: 'Simplified 1,000-word vocabulary' },
  { id: 'ylt', name: "Young's Literal Translation (YLT)", desc: 'Strict word-for-word tense fidelity' },
];

const PERSONAS = [
  {
    id: 'devotional',
    title: 'Daily Devotional & Prayer',
    desc: 'Focus on prayer rhythms, daily chapter reflections, and memory verses.',
    icon: Heart,
  },
  {
    id: 'theological',
    title: 'Theological & Language Scholar',
    desc: "Examine Strong's Greek/Hebrew roots, cross-references, and historical creeds.",
    icon: Compass,
  },
  {
    id: 'pastoral',
    title: 'Pastor & Teacher',
    desc: 'Prepare expository outlines, historical context, and exegetical study notes.',
    icon: BookOpen,
  },
  {
    id: 'group',
    title: 'Small Group Leader',
    desc: 'Prepare group discussion questions, life application, and prayer intercession.',
    icon: Layers,
  },
];

export default function OnboardingModal({ forceOpen = false, onClose, onComplete }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [translation, setTranslation] = useState<TranslationId>('web');
  const [studyPersona, setStudyPersona] = useState<'devotional' | 'theological' | 'pastoral' | 'group'>('devotional');
  const [geminiKey, setGeminiKey] = useState('');
  const [loadSampleWorkspace, setLoadSampleWorkspace] = useState(true);
  const [testingKey, setTestingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{ status: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem('bibledesk_onboarding_completed');
    if (forceOpen || !completed) {
      setIsOpen(true);
      const savedTrans = localStorage.getItem('bibledesk_default_translation') as TranslationId;
      if (savedTrans) setTranslation(savedTrans);
      const savedKey = localStorage.getItem('bibledesk_gemini_key');
      if (savedKey) setGeminiKey(savedKey);
    }
  }, [forceOpen]);

  async function handleTestKey() {
    if (!geminiKey.trim()) {
      setKeyFeedback({ status: 'error', text: 'Please paste your Google Gemini API key first.' });
      return;
    }
    setTestingKey(true);
    setKeyFeedback(null);
    try {
      const res = await fetch('/api/system/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_ai', geminiKey: geminiKey.trim() }),
      });
      const data = await res.json();
      if (data.success && data.status === 'connected') {
        setKeyFeedback({ status: 'success', text: '✓ Connected to Google Gemini successfully! 5D Study Assistant is ready.' });
      } else {
        setKeyFeedback({ status: 'error', text: data.message || 'Could not validate key. Please check for missing characters.' });
      }
    } catch {
      setKeyFeedback({ status: 'error', text: 'Network timeout testing key. You can still save it for later.' });
    } finally {
      setTestingKey(false);
    }
  }

  async function handleFinish() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bibledesk_onboarding_completed', 'true');
      localStorage.setItem('bibledesk_default_translation', translation);
      localStorage.setItem('bibledesk_study_persona', studyPersona);
      if (geminiKey.trim()) {
        localStorage.setItem('bibledesk_gemini_key', geminiKey.trim());
      }
    }

    // If user requested sample workspace, seed it
    if (loadSampleWorkspace) {
      try {
        fetch('/api/system/repair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'seed_sample_data' }),
        }).catch(() => {});
      } catch {
        // Continue seamlessly
      }
    }

    const prefs: UserOnboardingPreferences = {
      translation,
      studyPersona,
      geminiKey: geminiKey.trim() || undefined,
      themePreference: 'parchment',
      loadSampleWorkspace,
    };

    onComplete?.(prefs);
    setIsOpen(false);
    onClose?.();
  }

  function handleSkip() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bibledesk_onboarding_completed', 'true');
    }
    setIsOpen(false);
    onClose?.();
  }

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Welcome to BibleDesk">
      <div className={styles.modalCard}>
        {/* Progress Header */}
        <div className={styles.modalHeader}>
          <div className={styles.stepIndicators}>
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`${styles.stepDot} ${step === s ? styles.stepDotActive : step > s ? styles.stepDotDone : ''}`}
              />
            ))}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleSkip}
            aria-label="Skip onboarding and enter reader"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── STEP 1: Welcome & Mission ── */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <div className={styles.stepBadge}>
              <Sparkles size={14} />
              <span>Welcome to BibleDesk</span>
            </div>
            <h2 className={`${styles.stepTitle} text-serif`}>
              Open Scripture Study, Grounded in Truth
            </h2>
            <p className={styles.stepDescription}>
              BibleDesk is a local-first Bible platform engineered to keep God’s Word central,
              unhindered, and free forever.
            </p>

            <div className={styles.pillarList}>
              <div className={styles.pillarItem}>
                <div className={styles.pillarIcon}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <strong>100% Free &amp; Offline Bible Core</strong>
                  <p>Read 6 bundled translations and search concordance without an internet connection.</p>
                </div>
              </div>

              <div className={styles.pillarItem}>
                <div className={styles.pillarIcon}>
                  <Shield size={18} />
                </div>
                <div>
                  <strong>Private by Default</strong>
                  <p>Your notes and private prayer commitments stay on your device or in your private account.</p>
                </div>
              </div>

              <div className={styles.pillarItem}>
                <div className={styles.pillarIcon}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <strong>5-Dimension Theological Assistant</strong>
                  <p>AI that illuminates biblical, historical, linguistic, and practical evidence without dogmatic bias.</p>
                </div>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button type="button" onClick={handleSkip} className={styles.skipBtn}>
                Skip to Reader
              </button>
              <button type="button" onClick={() => setStep(2)} className={styles.primaryBtn}>
                <span>Personalize Study</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Translation & Study Persona ── */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.stepBadge}>
              <Compass size={14} />
              <span>Step 2 of 4 · Study Focus</span>
            </div>
            <h2 className={`${styles.stepTitle} text-serif`}>Choose Your Primary Translation</h2>
            <p className={styles.stepDescription}>
              Select the translation you prefer to read by default. You can change or compare side-by-side anytime.
            </p>

            <div className={styles.translationGrid}>
              {TRANSLATIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTranslation(t.id)}
                  className={`${styles.selectCard} ${translation === t.id ? styles.selectCardActive : ''}`}
                >
                  <div className={styles.selectCardCheck}>
                    {translation === t.id && <Check size={14} />}
                  </div>
                  <div className={styles.selectCardBody}>
                    <strong>{t.name}</strong>
                    <span>{t.desc}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className={styles.subHeading}>What describes your primary study focus?</div>
            <div className={styles.personaGrid}>
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setStudyPersona(p.id as any)}
                    className={`${styles.selectCard} ${studyPersona === p.id ? styles.selectCardActive : ''}`}
                  >
                    <div className={styles.personaIconBox}>
                      <Icon size={16} />
                    </div>
                    <div className={styles.selectCardBody}>
                      <strong>{p.title}</strong>
                      <span>{p.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={styles.actionRow}>
              <button type="button" onClick={() => setStep(1)} className={styles.secondaryBtn}>
                Back
              </button>
              <button type="button" onClick={() => setStep(3)} className={styles.primaryBtn}>
                <span>Next: AI Setup &amp; Workspace</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: AI Assistant Mode & Workspace Starter ── */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <div className={styles.stepBadge}>
              <Sparkles size={14} />
              <span>Step 3 of 4 · Assistant &amp; Workspace</span>
            </div>
            <h2 className={`${styles.stepTitle} text-serif`}>5-Dimension AI Study Assistant</h2>
            <p className={styles.stepDescription}>
              BibleDesk includes server AI answers, or you can supply your own free Google Gemini API key for unlimited personal study.
            </p>

            <div className={styles.byokBox}>
              <div className={styles.byokHeader}>
                <Key size={16} color="#b58414" />
                <strong>Optional: Connect Free Gemini Key (BYOK)</strong>
              </div>
              <p className={styles.byokDesc}>
                Get a free key from Google AI Studio (takes 30 seconds, no credit card required) for unlimited personal study:
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="password"
                  placeholder="AIzaSy... (Paste Gemini API key)"
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    setKeyFeedback(null);
                  }}
                  className={styles.keyInput}
                  style={{ marginBottom: 0 }}
                />
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey || !geminiKey.trim()}
                  className={styles.secondaryBtn}
                  style={{ padding: '0.4rem 0.85rem', whiteSpace: 'nowrap' }}
                >
                  {testingKey ? 'Testing...' : 'Test Key'}
                </button>
              </div>

              {keyFeedback && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: keyFeedback.status === 'success' ? '#065f46' : '#b91c1c',
                    marginTop: '4px',
                  }}
                >
                  {keyFeedback.text}
                </div>
              )}

              <span className={styles.keyHelp}>
                Your key stays strictly in your browser and is only sent with your direct questions.
              </span>
            </div>

            {/* Starter Study Workspace Toggle */}
            <div
              style={{
                background: 'rgba(107, 142, 123, 0.1)',
                border: '1px solid rgba(107, 142, 123, 0.25)',
                borderRadius: '0.65rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '1rem',
                cursor: 'pointer',
              }}
              onClick={() => setLoadSampleWorkspace(!loadSampleWorkspace)}
            >
              <input
                type="checkbox"
                checked={loadSampleWorkspace}
                onChange={(e) => setLoadSampleWorkspace(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Load Starter Study Workspace
                </strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Pre-loads sample personal notes, thematic study collections, and a reading plan so you can immediately see a working workspace.
                </p>
              </div>
            </div>

            <div className={styles.guaranteePill}>
              <Check size={15} color="#059669" />
              <span>Scripture reading, concordance search, Strong’s lexicons, and cross-references never require an API key.</span>
            </div>

            <div className={styles.actionRow}>
              <button type="button" onClick={() => setStep(2)} className={styles.secondaryBtn}>
                Back
              </button>
              <button type="button" onClick={() => setStep(4)} className={styles.primaryBtn}>
                <span>Next: Power Tips</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Power Shortcuts & Launch ── */}
        {step === 4 && (
          <div className={styles.stepContent}>
            <div className={styles.stepBadge}>
              <Command size={14} />
              <span>Step 4 of 4 · Ready to Study</span>
            </div>
            <h2 className={`${styles.stepTitle} text-serif`}>Power Shortcuts to Accelerate Study</h2>
            <p className={styles.stepDescription}>
              Here are quick navigation tips to make the most of your Study Desk:
            </p>

            <div className={styles.tipsList}>
              <div className={styles.tipItem}>
                <div className={styles.kbdBox}>
                  <kbd>Ctrl</kbd> + <kbd>K</kbd>
                </div>
                <div>
                  <strong>Quick Jump Modal</strong>
                  <p>Type any reference like &quot;John 3:16&quot;, &quot;Romans 8&quot;, or jump to any book instantly.</p>
                </div>
              </div>

              <div className={styles.tipItem}>
                <div className={styles.kbdBox}>
                  <kbd>/</kbd>
                </div>
                <div>
                  <strong>Concordance Keyword Search</strong>
                  <p>Search words across all 66 books instantly without network latency.</p>
                </div>
              </div>

              <div className={styles.tipItem}>
                <div className={styles.kbdBox}>
                  <kbd>Click Verse</kbd>
                </div>
                <div>
                  <strong>Lexicon &amp; Cross-References</strong>
                  <p>Click any verse number to open Strong’s roots, parallel translations, and TSK cross-references.</p>
                </div>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button type="button" onClick={() => setStep(3)} className={styles.secondaryBtn}>
                Back
              </button>
              <button type="button" onClick={handleFinish} className={styles.finishBtn}>
                <BookOpen size={18} />
                <span>Launch Study Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
