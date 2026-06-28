'use client';

import styles from './RateLimitBar.module.css';
import type { RateLimitInfo } from '@/hooks/useStreamingAsk';

interface Props {
  rateLimit: RateLimitInfo;
}

export default function RateLimitBar({ rateLimit }: Props) {
  const { remaining, limit } = rateLimit;
  const used    = limit - remaining;
  const pct     = Math.round((used / limit) * 100);
  const isAmber = remaining <= 5;
  const isRed   = remaining <= 2;

  const colorClass = isRed ? styles.red : isAmber ? styles.amber : styles.green;

  return (
    <div
      className={styles.root}
      role="status"
      aria-label={`${remaining} of ${limit} questions remaining this hour`}
    >
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`${styles.label} ${colorClass}`}>
        {remaining === 0
          ? 'Rate limit reached — resets in ~1 hour'
          : `${remaining} of ${limit} free questions remaining`}
      </span>
    </div>
  );
}
