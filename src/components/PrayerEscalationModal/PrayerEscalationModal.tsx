'use client';

import { useState } from 'react';
import {
  X,
  TrendingUp,
  Lock,
  Users,
  Church,
  Globe,
  ShieldCheck,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { PrayerEscalationLevel, PrayerUrgencyLevel } from '@/types/prayerCare';
import { SAMPLE_CHURCHES } from '@/types/church';
import styles from './PrayerEscalationModal.module.css';

interface PrayerEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  prayer: {
    id: string;
    title: string;
    text: string;
    escalation_level?: PrayerEscalationLevel;
    urgency_level?: PrayerUrgencyLevel;
  } | null;
  onEscalate: (data: {
    prayerId: string;
    targetLevel: PrayerEscalationLevel;
    urgencyLevel: PrayerUrgencyLevel;
    isAnonymous: boolean;
    churchId?: string;
    updateNote?: string;
  }) => void;
}

const TIERS: {
  level: PrayerEscalationLevel;
  title: string;
  description: string;
  icon: typeof Lock;
}[] = [
  {
    level: 'private',
    title: 'Tier 1: Private Journal',
    description: 'Only you see this prayer. Stored locally/encrypted in personal journal.',
    icon: Lock,
  },
  {
    level: 'circle',
    title: 'Tier 2: Prayer Circle',
    description: 'Shared with your invited trusted intercessors & family prayer partners.',
    icon: Users,
  },
  {
    level: 'church',
    title: 'Tier 3: Church Pastoral Chain',
    description: 'Escalated to your verified local church pastoral team for corporate intercession.',
    icon: Church,
  },
  {
    level: 'atlas',
    title: 'Tier 4: Global PrayerAtlas',
    description: 'Broadcast to believers worldwide on the 2D PrayerAtlas (with approximate halo or pin).',
    icon: Globe,
  },
];

export default function PrayerEscalationModal({
  isOpen,
  onClose,
  prayer,
  onEscalate,
}: PrayerEscalationModalProps) {
  if (!isOpen || !prayer) return null;

  const [selectedLevel, setSelectedLevel] = useState<PrayerEscalationLevel>(
    prayer.escalation_level === 'private' ? 'circle' : (prayer.escalation_level || 'circle')
  );
  const [selectedUrgency, setSelectedUrgency] = useState<PrayerUrgencyLevel>(
    prayer.urgency_level || 'normal'
  );
  const [selectedChurchId, setSelectedChurchId] = useState<string>(SAMPLE_CHURCHES[0].id);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [updateNote, setUpdateNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onEscalate({
      prayerId: prayer.id,
      targetLevel: selectedLevel,
      urgencyLevel: selectedUrgency,
      isAnonymous,
      churchId: selectedLevel === 'church' ? selectedChurchId : undefined,
      updateNote: updateNote.trim() || undefined,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <TrendingUp size={22} className={styles.headerIcon} />
            <h2 className={styles.title}>Escalate Prayer Intercession</h2>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.body}>
          {/* Summary of current prayer */}
          <div className={styles.prayerSummary}>
            <div className={styles.prayerSummaryTitle}>{prayer.title}</div>
            <div className={styles.prayerSummaryText}>
              "{prayer.text.length > 120 ? prayer.text.slice(0, 117) + '...' : prayer.text}"
            </div>
          </div>

          {/* 4-Tier Ladder */}
          <div className={styles.ladderSection}>
            <span className={styles.sectionLabel}>Select Escalation Level</span>
            {TIERS.map(tier => {
              const Icon = tier.icon;
              const isActive = selectedLevel === tier.level;
              return (
                <div
                  key={tier.level}
                  className={`${styles.tierCard} ${isActive ? styles.tierCardActive : ''}`}
                  onClick={() => setSelectedLevel(tier.level)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.tierIconBox}>
                    <Icon size={18} />
                  </div>
                  <div className={styles.tierContent}>
                    <div className={styles.tierTitle}>{tier.title}</div>
                    <div className={styles.tierDesc}>{tier.description}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Church selector if tier 3 */}
          {selectedLevel === 'church' && (
            <div className={styles.ladderSection}>
              <span className={styles.sectionLabel}>Select Affiliated Church</span>
              <select
                className={styles.textarea}
                style={{ minHeight: '44px' }}
                value={selectedChurchId}
                onChange={e => setSelectedChurchId(e.target.value)}
              >
                {SAMPLE_CHURCHES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city}, {c.country})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Urgency selection */}
          <div className={styles.ladderSection}>
            <span className={styles.sectionLabel}>Urgency Priority</span>
            <div className={styles.urgencyRow}>
              {(['low', 'normal', 'urgent', 'crisis'] as PrayerUrgencyLevel[]).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={`${styles.urgencyBtn} ${selectedUrgency === lvl ? styles.urgencyBtnActive : ''}`}
                  onClick={() => setSelectedUrgency(lvl)}
                >
                  {lvl === 'crisis' && '⚠️ '}
                  {lvl.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Anonymity toggle */}
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
            />
            <span>Anonymize Request (Hide my name; post as "A Brother/Sister in Christ")</span>
          </label>

          {/* Optional update note */}
          <div className={styles.ladderSection}>
            <span className={styles.sectionLabel}>Optional Situation Update Note</span>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Surgery moved up to tomorrow morning, please pray for the medical team..."
              value={updateNote}
              onChange={e => setUpdateNote(e.target.value)}
            />
          </div>

          <footer className={styles.footer} style={{ margin: '0 -1.75rem -1.5rem', padding: '1rem 1.75rem' }}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              <Send size={16} />
              <span>Confirm Escalation</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
