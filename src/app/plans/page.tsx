'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header/Header';
import { READING_PLANS, type ReadingPlan } from '@/lib/plansData';
import styles from './page.module.css';

export default function ReadingPlansPage() {
  const [activePlan, setActivePlan] = useState<ReadingPlan>(READING_PLANS[0]);
  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>({});

  // Load progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bibledesk_reading_plans');
      if (saved) setCompletedDays(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load plan progress', e);
    }
  }, []);

  const toggleDay = (planId: string, dayNum: number) => {
    const key = `${planId}-day-${dayNum}`;
    setCompletedDays((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('bibledesk_reading_plans', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save plan progress', e);
      }
      return next;
    });
  };

  // Calculate progress %
  const planCompletedCount = activePlan.days.filter((d) => completedDays[`${activePlan.id}-day-${d.day}`]).length;
  const progressPct = Math.round((planCompletedCount / Math.max(activePlan.days.length, 1)) * 100);

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className="container">

          {/* Header */}
          <div className={styles.pageHeader}>
            <span className={styles.tag}>✦ Daily Scripture Reading</span>
            <h1 className={`${styles.title} text-serif`}>Bible Reading Plans</h1>
            <p className={styles.subtitle}>
              Structured daily reading plans to help you read through the Bible, Gospels, and Psalms consistently.
            </p>
          </div>

          {/* Plan Selector */}
          <div className={styles.planSelector}>
            {READING_PLANS.map((plan) => (
              <button
                key={plan.id}
                className={`${styles.planBtn} ${activePlan.id === plan.id ? styles.planBtnActive : ''}`}
                onClick={() => setActivePlan(plan)}
              >
                <span className={styles.planBtnName}>{plan.name}</span>
                <span className={styles.planBtnMeta}>{plan.durationDays} Days • {plan.category}</span>
              </button>
            ))}
          </div>

          {/* Plan Card */}
          <div className={`${styles.planCard} glass-card`}>
            <div className={styles.planHeader}>
              <div>
                <h2 className={`${styles.planTitle} text-serif`}>{activePlan.name}</h2>
                <p className={styles.planDesc}>{activePlan.description}</p>
              </div>
              <div className={styles.progressBox}>
                <div className={styles.progressPct}>{progressPct}%</div>
                <div className={styles.progressLabel}>{planCompletedCount} / {activePlan.days.length} Days</div>
              </div>
            </div>

            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>

            {/* Days List */}
            <div className={styles.daysList}>
              {activePlan.days.map((d) => {
                const isDone = Boolean(completedDays[`${activePlan.id}-day-${d.day}`]);
                const firstPassage = d.passages[0] || 'John 1';
                const bookName = firstPassage.split(' ')[0];
                return (
                  <div
                    key={d.day}
                    className={`${styles.dayRow} ${isDone ? styles.dayRowDone : ''}`}
                    onClick={() => toggleDay(activePlan.id, d.day)}
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => {}}
                      className={styles.checkbox}
                    />
                    <span className={styles.dayNum}>Day {d.day}</span>
                    <span className={styles.dayTitle}>{d.title}</span>
                    <a
                      href={`/bible?book=${encodeURIComponent(bookName)}`}
                      className={styles.readLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Read →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
