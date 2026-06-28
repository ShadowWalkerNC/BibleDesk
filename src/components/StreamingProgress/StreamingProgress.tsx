'use client';

import styles from './StreamingProgress.module.css';
import type { StageProgress } from '@/hooks/useStreamingAsk';

const ALL_STAGES = [
  { stage: 1, name: 'Classifying question' },
  { stage: 2, name: 'Searching Scripture' },
  { stage: 3, name: 'Checking accuracy' },
  { stage: 4, name: 'Researching history' },
  { stage: 5, name: 'Synthesising theology' },
  { stage: 6, name: 'Assembling answer' },
];

interface Props {
  completedStages: StageProgress[];
}

export default function StreamingProgress({ completedStages }: Props) {
  const doneSet = new Set(completedStages.map((s) => s.stage));
  const activeStage = Math.min(
    ALL_STAGES.length,
    (completedStages.at(-1)?.stage ?? 0) + 1
  );
  const pct = Math.round((doneSet.size / ALL_STAGES.length) * 100);

  return (
    <div className={styles.root} role="status" aria-label="Study progress">
      <div className={styles.header}>
        <span className={styles.title}>Studying your question…</span>
        <span className={styles.pct}>{pct}%</span>
      </div>

      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>

      <ol className={styles.stages}>
        {ALL_STAGES.map(({ stage, name }) => {
          const done   = doneSet.has(stage);
          const active = !done && stage === activeStage;
          const done_ms = completedStages.find((s) => s.stage === stage)?.duration_ms;

          return (
            <li
              key={stage}
              className={[
                styles.stage,
                done   ? styles.done   : '',
                active ? styles.active : '',
              ].join(' ').trim()}
            >
              <span className={styles.dot} aria-hidden="true">
                {done ? '✓' : active ? '…' : stage}
              </span>
              <span className={styles.stageName}>{name}</span>
              {done && done_ms !== undefined && (
                <span className={styles.ms}>{(done_ms / 1000).toFixed(1)}s</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
