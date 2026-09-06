'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader/PageHeader';
import {
  Network,
  Search,
  RefreshCw,
  Cpu,
  Database,
  BookOpen,
  ScrollText,
  Sparkles,
  Compass,
} from 'lucide-react';
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
      <PageHeader
        icon={Network}
        title="Biblical Knowledge Graph"
        subtitle="Bidirectional cross-reference network linking Scripture passages, Strong's Greek & Hebrew lemmas, and theological topics."
      />

      {/* Open API & MCP Info Banner */}
      <div className={styles.infoBanner}>
        <div className={styles.infoBadgeRow}>
          <span className={styles.infoBadge}><Database size={13} /> Open REST API (<code>/api/graph</code>)</span>
          <span className={styles.infoBadge}><Cpu size={13} /> Model Context Protocol (<code>/api/mcp</code>)</span>
        </div>
        <p className={styles.infoText}>
          The BibleDesk Knowledge Graph indexes verses, lexical roots (e.g. <code>G2889</code>, <code>H7225</code>), and Treasury of Scripture Knowledge (TSK) cross-references into an open graph. External AI agents and applications can traverse this network directly to index and retrieve biblical connections at high speed.
        </p>
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Focus on a concept or passage… (e.g. grace, john-3-16, G2889)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFocus()}
        />
        <button className={styles.focusBtn} onClick={handleFocus}>
          <Search size={15} />
          <span>Focus Node</span>
        </button>
        {focusKey && (
          <button className={styles.resetBtn} onClick={handleReset}>
            <RefreshCw size={14} />
            <span>Reset View</span>
          </button>
        )}
      </div>

      <GraphView
        nodeKey={focusKey}
        height={580}
        className={styles.graph}
        onNodeClick={handleNodeClick}
      />

      {lastNode && (
        <section className={styles.lastSelected}>
          <div className={styles.selectedHeader}>
            <div className={styles.selectedTitleRow}>
              <span className={styles.lastSelectedLabel}>Selected Concept:</span>
              <strong className={styles.selectedTitle}>{lastNode.label}</strong>
              <span className={styles.lastSelectedMeta}>
                {lastNode.category}
                {lastNode.dimension ? ` · ${lastNode.dimension}` : ''}
              </span>
            </div>
            {lastNode.description && (
              <p className={styles.selectedDesc}>{lastNode.description}</p>
            )}
          </div>

          <div className={styles.actionButtonGroup}>
            {(lastNode.strongs_num || lastNode.scripture_ref || lastNode.category === 'verse') && (
              <a
                className={styles.actionLink}
                href={
                  lastNode.strongs_num
                    ? `/bible?strongs=${encodeURIComponent(lastNode.strongs_num)}`
                    : `/bible?q=${encodeURIComponent(lastNode.scripture_ref || lastNode.label)}`
                }
              >
                <BookOpen size={14} />
                <span>Read in Bible ({lastNode.strongs_num || lastNode.scripture_ref || lastNode.label})</span>
              </a>
            )}

            {(lastNode.catechism_ref || lastNode.category === 'doctrine') && (
              <a className={styles.actionLink} href="/catechism">
                <ScrollText size={14} />
                <span>Explore in Catechism</span>
              </a>
            )}

            <a
              className={styles.actionLink}
              href={`/encourage?q=${encodeURIComponent(lastNode.label)}`}
            >
              <Sparkles size={14} />
              <span>Words of Encouragement</span>
            </a>

            <button
              type="button"
              className={styles.drillBtn}
              onClick={() => { setFocusKey(lastNode.node_key); setSearch(lastNode.node_key); }}
            >
              <Compass size={14} />
              <span>Drill into subgraph</span>
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
