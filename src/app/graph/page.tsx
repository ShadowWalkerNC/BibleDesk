'use client';

// BibleDesk — /graph  (Knowledge Graph explorer page)

import { useState } from 'react';
import GraphView from '@/components/GraphView';
import type { GraphNode } from '@/lib/graph';
import styles from './page.module.css';

export default function GraphPage() {
  const [focusKey,  setFocusKey]  = useState<string | undefined>(undefined);
  const [search,    setSearch]    = useState('');
  const [lastNode,  setLastNode]  = useState<GraphNode | null>(null);

  function handleNodeClick(node: GraphNode) {
    setLastNode(node);
  }

  function handleFocus() {
    const key = search.trim();
    setFocusKey(key || undefined);
  }

  function handleReset() {
    setSearch('');
    setFocusKey(undefined);
    setLastNode(null);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={`${styles.title} text-gradient`}>Knowledge Graph</h1>
          <p className={styles.subtitle}>
            Explore the conceptual connections across every question and answer in BibleDesk.
          </p>
        </div>

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Focus on a concept… (e.g. grace, john-3-16)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFocus()}
          />
          <button className={styles.focusBtn} onClick={handleFocus}>
            Focus
          </button>
          {focusKey && (
            <button className={styles.resetBtn} onClick={handleReset}>
              ✕ Reset
            </button>
          )}
        </div>
      </header>

      <GraphView
        nodeKey={focusKey}
        height={580}
        className={styles.graph}
        onNodeClick={handleNodeClick}
      />

      {lastNode && (
        <section className={styles.lastSelected}>
          <span className={styles.lastSelectedLabel}>Last selected:</span>
          <strong>{lastNode.label}</strong>
          <span className={styles.lastSelectedMeta}>
            {lastNode.category}
            {lastNode.dimension ? ` · ${lastNode.dimension}` : ''}
          </span>
          <button
            className={styles.drillBtn}
            onClick={() => { setFocusKey(lastNode.node_key); setSearch(lastNode.node_key); }}
          >
            Drill into subgraph →
          </button>
        </section>
      )}
    </main>
  );
}
