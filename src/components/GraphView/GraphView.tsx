'use client';

// BibleDesk — GraphView
// Interactive force-directed knowledge graph using D3.
// Renders nodes (concepts, verses, questions, doctrines) and typed edges.
//
// Props:
//   nodeKey?   — if provided, loads the 1-hop subgraph for that concept
//   height?    — canvas height in px (default 600)
//   className? — additional class names
//   onNodeClick(node) — called when the user clicks a node
//
// The component fetches /api/graph on mount (or when nodeKey changes).
// No D3 install needed beyond the existing Next.js bundle — D3 is loaded
// as a dynamic import so it doesn't bloat the initial JS bundle.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '@/lib/graph';
import styles from './GraphView.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface D3Node extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Edge {
  source: D3Node | string;
  target: D3Node | string;
  relation: string;
  confidence: string;
  weight: number;
}

interface GraphViewProps {
  nodeKey?:     string;
  height?:      number;
  className?:   string;
  onNodeClick?: (node: GraphNode) => void;
}

// ─── Category → colour mapping (matches BibleDesk design system) ─────────────

const CATEGORY_COLORS: Record<string, string> = {
  question:  '#f5c842',   // --gold-400
  concept:   '#4f9cf9',   // --dim-scripture
  verse:     '#34d399',   // --dim-theological
  doctrine:  '#a78bfa',   // --dim-language
  theme:     '#e67e42',   // --dim-historical
  person:    '#fb7185',   // --dim-practical
  place:     '#60a5fa',
  book:      '#fbbf24',
};

function nodeColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#9fa8d4';
}

// ─── Confidence → edge opacity ────────────────────────────────────────────────

const CONFIDENCE_OPACITY: Record<string, number> = {
  EXTRACTED: 0.85,
  INFERRED:  0.45,
  AMBIGUOUS: 0.22,
};

function edgeOpacity(confidence: string): number {
  return CONFIDENCE_OPACITY[confidence] ?? 0.4;
}

// ─── Node radius by category ──────────────────────────────────────────────────

const CATEGORY_RADIUS: Record<string, number> = {
  question: 14,
  doctrine: 12,
  concept:  10,
  verse:     7,
  theme:    10,
  person:    9,
  place:     9,
  book:     10,
};

function nodeRadius(category: string): number {
  return CATEGORY_RADIUS[category] ?? 9;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GraphView({
  nodeKey,
  height = 600,
  className = '',
  onNodeClick,
}: GraphViewProps) {
  const svgRef   = useRef<SVGSVGElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  const [nodes,     setNodes]     = useState<GraphNode[]>([]);
  const [edges,     setEdges]     = useState<GraphEdge[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [selected,  setSelected]  = useState<GraphNode | null>(null);
  const [meta,      setMeta]      = useState<{ nodeCount: number; edgeCount: number; subgraph: boolean } | null>(null);

  // ── Fetch graph data ────────────────────────────────────────────────────────

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);

    const url = nodeKey
      ? `/api/graph?nodeKey=${encodeURIComponent(nodeKey)}`
      : `/api/graph?limit=500`;

    try {
      const res  = await fetch(url);
      const json = await res.json();

      if (!json.success) {
        setError(json.error ?? 'Failed to load graph.');
      } else {
        setNodes(json.nodes ?? []);
        setEdges(json.edges ?? []);
        setMeta(json.meta ?? null);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [nodeKey]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  // ── D3 simulation ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading || error || !svgRef.current || !wrapRef.current) return;
    if (nodes.length === 0) return;

    const width  = wrapRef.current.clientWidth || 800;
    const svgEl  = svgRef.current;

    // Lazy-import D3 so it's only loaded when the graph is shown
    import('d3').then((d3) => {
      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();

      svg
        .attr('width',  width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      // Arrow markers for directed edges
      const defs = svg.append('defs');
      ['EXTRACTED', 'INFERRED', 'AMBIGUOUS'].forEach((conf) => {
        defs.append('marker')
          .attr('id',          `arrow-${conf}`)
          .attr('viewBox',     '0 -5 10 10')
          .attr('refX',        18)
          .attr('refY',        0)
          .attr('markerWidth', 6)
          .attr('markerHeight',6)
          .attr('orient',      'auto')
          .append('path')
          .attr('d',    'M0,-5L10,0L0,5')
          .attr('fill', `rgba(159,168,212,${edgeOpacity(conf)})`);
      });

      // Zoomable container
      const g = svg.append('g').attr('class', 'graph-root');

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => g.attr('transform', event.transform));
      svg.call(zoom);

      // Build D3 node/edge arrays (clone to avoid mutation)
      const d3Nodes: D3Node[] = nodes.map((n) => ({ ...n }));
      const nodeById = new Map(d3Nodes.map((n) => [n.id!, n]));

      const d3Edges: D3Edge[] = edges
        .filter((e) => nodeById.has(e.source_id) && nodeById.has(e.target_id))
        .map((e) => ({
          source:     e.source_id,
          target:     e.target_id,
          relation:   e.relation,
          confidence: e.confidence,
          weight:     e.weight ?? 0.5,
        }));

      // Simulation
      const simulation = d3.forceSimulation<D3Node>(d3Nodes)
        .force('link', d3.forceLink<D3Node, D3Edge>(d3Edges)
          .id((d) => d.id!)
          .distance((e) => 80 + (1 - e.weight) * 60)
          .strength(0.5)
        )
        .force('charge', d3.forceManyBody().strength(-220))
        .force('center',  d3.forceCenter(width / 2, height / 2))
        .force('collide',  d3.forceCollide<D3Node>((d) => nodeRadius(d.category) + 6));

      // Edges
      const link = g.append('g').attr('class', 'links')
        .selectAll('line')
        .data(d3Edges)
        .join('line')
        .attr('stroke',        (e) => `rgba(159,168,212,${edgeOpacity(e.confidence)})`)
        .attr('stroke-width',  (e) => 1 + e.weight * 1.5)
        .attr('marker-end',    (e) => `url(#arrow-${e.confidence})`);

      // Node groups
      const node = g.append('g').attr('class', 'nodes')
        .selectAll<SVGGElement, D3Node>('g')
        .data(d3Nodes)
        .join('g')
        .attr('class', styles.nodeGroup)
        .call(
          d3.drag<SVGGElement, D3Node>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end',  (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null; d.fy = null;
            })
        )
        .on('click', (_event, d) => {
          setSelected(d as GraphNode);
          onNodeClick?.(d as GraphNode);
        });

      // Node circles
      node.append('circle')
        .attr('r',           (d) => nodeRadius(d.category))
        .attr('fill',        (d) => nodeColor(d.category))
        .attr('fill-opacity', 0.9)
        .attr('stroke',      (d) => nodeColor(d.category))
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.5);

      // Node labels
      node.append('text')
        .text((d) => d.label.slice(0, 28))
        .attr('dy',          '0.35em')
        .attr('x',           (d) => nodeRadius(d.category) + 5)
        .attr('font-size',   '11px')
        .attr('font-family', 'var(--font-sans)')
        .attr('fill',        'var(--text-secondary)')
        .attr('pointer-events', 'none');

      // Tooltip title on hover
      node.append('title').text((d) => [
        d.label,
        d.category,
        d.description ?? '',
      ].filter(Boolean).join(' · '));

      // Tick
      simulation.on('tick', () => {
        link
          .attr('x1', (e) => (e.source as D3Node).x ?? 0)
          .attr('y1', (e) => (e.source as D3Node).y ?? 0)
          .attr('x2', (e) => (e.target as D3Node).x ?? 0)
          .attr('y2', (e) => (e.target as D3Node).y ?? 0);

        node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

      return () => { simulation.stop(); };
    });
  }, [nodes, edges, loading, error, height, onNodeClick]);

  // ── Legend data ─────────────────────────────────────────────────────────────

  const legendItems = Object.entries(CATEGORY_COLORS);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`${styles.wrapper} ${className}`} ref={wrapRef}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>
          {nodeKey ? `Subgraph: ${nodeKey}` : 'Knowledge Graph'}
        </span>
        {meta && (
          <span className={styles.toolbarMeta}>
            {meta.nodeCount} nodes · {meta.edgeCount} edges
          </span>
        )}
        <button
          className={styles.refreshBtn}
          onClick={fetchGraph}
          disabled={loading}
          aria-label="Refresh graph"
        >
          {loading ? '⟳' : '↺'}
        </button>
      </div>

      {/* Canvas */}
      <div className={styles.canvas} style={{ height }}>
        {loading && (
          <div className={styles.stateOverlay}>
            <div className={styles.spinner} />
            <p>Loading graph…</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.stateOverlay}>
            <p className={styles.errorMsg}>{error}</p>
            <button className={styles.retryBtn} onClick={fetchGraph}>Retry</button>
          </div>
        )}

        {!loading && !error && nodes.length === 0 && (
          <div className={styles.stateOverlay}>
            <span className={styles.emptyIcon}>✦</span>
            <p>No concepts in the graph yet.</p>
            <p className={styles.emptyHint}>Ask a question to begin building the knowledge graph.</p>
          </div>
        )}

        {!loading && !error && nodes.length > 0 && (
          <svg ref={svgRef} className={styles.svg} />
        )}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {legendItems.map(([cat, color]) => (
          <span key={cat} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            {cat}
          </span>
        ))}
      </div>

      {/* Confidence key */}
      <div className={styles.confidenceKey}>
        {(['EXTRACTED', 'INFERRED', 'AMBIGUOUS'] as const).map((c) => (
          <span key={c} className={styles.confItem}>
            <span
              className={styles.confLine}
              style={{ opacity: edgeOpacity(c) }}
            />
            {c.toLowerCase()}
          </span>
        ))}
      </div>

      {/* Selected node panel */}
      {selected && (
        <aside className={styles.nodePanel}>
          <button
            className={styles.nodePanelClose}
            onClick={() => setSelected(null)}
            aria-label="Close"
          >
            ✕
          </button>
          <div
            className={styles.nodePanelDot}
            style={{ background: nodeColor(selected.category) }}
          />
          <h3 className={styles.nodePanelLabel}>{selected.label}</h3>
          <p className={styles.nodePanelMeta}>
            {selected.category}
            {selected.dimension ? ` · ${selected.dimension}` : ''}
          </p>
          {selected.description && (
            <p className={styles.nodePanelDesc}>{selected.description}</p>
          )}
          {selected.node_key && (
            <a
              className={styles.nodePanelLink}
              href={`/api/graph?nodeKey=${encodeURIComponent(selected.node_key)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View subgraph JSON ↗
            </a>
          )}
        </aside>
      )}
    </div>
  );
}
