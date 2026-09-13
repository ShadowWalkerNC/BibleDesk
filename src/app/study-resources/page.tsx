'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Scroll, Sparkles, Brain, LibraryBig } from 'lucide-react';
import { CatechismPanel } from './panels/CatechismPanel';
import { CreedsPanel } from './panels/CreedsPanel';
import { EncouragePanel } from './panels/EncouragePanel';
import { MemoryPanel } from './panels/MemoryPanel';
import styles from './page.module.css';

// BibleDesk — Study Resources hub (A12).
// Merges the former /catechism, /creeds, /encourage, /memory pages into one
// tabbed page. Deep links: /study-resources?tab=catechism|creeds|encourage|memory
const TABS = [
  { id: 'catechism', label: 'Catechism', icon: BookOpen },
  { id: 'creeds', label: 'Creeds', icon: Scroll },
  { id: 'encourage', label: 'Encouragement', icon: Sparkles },
  { id: 'memory', label: 'Verse Memory', icon: Brain },
] as const;

type TabId = (typeof TABS)[number]['id'];

const VALID_TABS: TabId[] = ['catechism', 'creeds', 'encourage', 'memory'];

function StudyResourcesContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initial: TabId = tabParam && (VALID_TABS as string[]).includes(tabParam) ? (tabParam as TabId) : 'catechism';
  const [activeTab, setActiveTab] = useState<TabId>(initial);

  return (
    <main id="main-content" className={styles.main}>
      <div className="container">
        <div className={styles.pageHeader}>
          <span className={styles.tag}>
            <LibraryBig size={13} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Study Library
          </span>
          <h1 className={`${styles.title} text-serif`}>Study Resources</h1>
          <p className={styles.subtitle}>
            Historic catechisms and creeds, biblical encouragement, and verse-memory tools — one library.
          </p>
        </div>

        <div className={styles.tabBar} role="tablist" aria-label="Study resources">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              className={`${styles.tabBtn} ${activeTab === id ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {label}
            </button>
          ))}
        </div>

        <div className={styles.tabPanel} role="tabpanel">
          {activeTab === 'catechism' && <CatechismPanel />}
          {activeTab === 'creeds' && <CreedsPanel />}
          {activeTab === 'encourage' && <EncouragePanel initialQuery={searchParams.get('q') ?? ''} />}
          {activeTab === 'memory' && <MemoryPanel />}
        </div>
      </div>
    </main>
  );
}

export default function StudyResourcesPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading study resources…</div>}>
      <StudyResourcesContent />
    </Suspense>
  );
}
