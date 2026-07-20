'use client';

import styles from './StreamingProgress.module.css';
import type { StageProgress } from '@/hooks/useStreamingAsk';

const ALL_STAGES = [
  {
    stage: 1,
    name: 'Classifying Question',
    desc: 'Identifying topic type, relevant testaments, doctrine area, and sensitivity level',
    color: 'var(--dim-scripture)',
  },
  {
    stage: 2,
    name: 'Searching Scripture',
    desc: 'Locating candidate verses in your selected translation using real Bible API calls',
    color: 'var(--dim-scripture)',
  },
  {
    stage: 3,
    name: 'Verifying Context',
    desc: 'Cross-checking that each verse is used in proper context — not proof-texted',
    color: 'var(--dim-historical)',
  },
  {
    stage: 4,
    name: 'Researching History',
    desc: 'Consulting Church Fathers, historical setting, cultural background, and orthodox tradition',
    color: 'var(--dim-historical)',
  },
  {
    stage: 5,
    name: 'Synthesising Theology',
    desc: 'Reasoning through doctrinal implications, tensions, and multiple perspectives',
    color: 'var(--dim-theological)',
  },
  {
    stage: 6,
    name: 'Assembling Answer',
    desc: 'Composing the 5-dimension study guide: Scripture, History, Language, Theology, Application',
    color: 'var(--dim-practical)',
  },
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
        <div>
          <span className={styles.title}>Analyzing your question…</span>
          <p className={styles.subtitle}>6-stage scholarly pipeline running</p>
        </div>
        <span className={styles.pct}>{pct}%</span>
      </div>

      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>

      <ol className={styles.stages}>
        {ALL_STAGES.map(({ stage, name, desc, color }) => {
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
              <span
                className={styles.dot}
                aria-hidden="true"
                style={done || active ? { borderColor: color } : {}}
              >
                {done ? '✓' : active ? '◌' : stage}
              </span>
              <div className={styles.stageInfo}>
                <span className={styles.stageName}>{name}</span>
                {(done || active) && (
                  <span className={styles.stageDesc}>{desc}</span>
                )}
              </div>
              {done && done_ms !== undefined && (
                <span className={styles.ms}>{(done_ms / 1000).toFixed(1)}s</span>
              )}
            </li>
          );
        })}
      </ol>

      <p className={styles.footer}>
        Scripture sourced from live Bible API · AI acts as a scholarly pastor, not an oracle
      </p>
    </div>
  );
}
