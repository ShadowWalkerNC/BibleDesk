'use client';

import {
  Share2,
  X,
  BookOpen
} from 'lucide-react';
import styles from './IntegrationsModal.module.css';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntegrationsModal({ isOpen, onClose }: IntegrationsModalProps) {
  if (!isOpen) return null;

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
              <h2 className={styles.title}>WhatsApp Sharing</h2>
              <p className={styles.subtitle}>Forward verses, studies, &amp; devotionals to WhatsApp chats &amp; study groups</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* WhatsApp click-to-chat sharing */}
        <div className={styles.tabBody}>
          <div className={styles.sectionHeader}>
            <strong>Instant 1-Click Click-to-Chat Share</strong>
            <p>Forward daily verses, sermon study outlines, or 5-dimension answers directly to WhatsApp study groups.</p>
          </div>

          <div className={styles.infoCard}>
            <BookOpen size={16} className={styles.infoCardIcon} />
            <div>
              <strong>Broadcast to Church Small Groups</strong>
              <p>Every study answer and daily devotional includes a pre-formatted WhatsApp share button formatted with bold titles and links.</p>
            </div>
          </div>
        </div>

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
