'use client';

// BibleDesk Desktop — home page
// GraphView is the primary landing screen for the offline app.

import GraphView from '@/components/GraphView';
import type { GraphNode } from '@/lib/graph';
import { useState } from 'react';
import styles from './page.module.css';

export default function DesktopHomePage() {
  const [focusKey, setFocusKey] = useState<string | undefined>(undefined);

  function handleNodeClick(node: GraphNode) {
    setFocusKey(node.node_key);
  }

  return (
    <div className={styles.page}>
      <div className={styles.graphHeader}>
        <h2 className={`${styles.graphTitle} text-gradient`}>Knowledge Graph</h2>
        {focusKey && (
          <button className={styles.resetBtn} onClick={() => setFocusKey(undefined)}>
            ✕ Reset focus
          </button>
        )}
      </div>
      <GraphView nodeKey={focusKey} height={540} onNodeClick={handleNodeClick} />
    </div>
  );
}
