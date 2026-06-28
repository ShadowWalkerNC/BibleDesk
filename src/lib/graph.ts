// BibleDesk — Knowledge Graph library
// Wraps Supabase graph_nodes + graph_edges tables.
//
// Design follows graphify's extraction schema:
//   Node: { id, label, source_file, source_location }
//   Edge: { source, target, relation, confidence }
// See: https://github.com/safishamsi/graphify/blob/main/ARCHITECTURE.md
//
// Exports:
//   upsertNode(node)            — create or update a graph node
//   upsertEdge(edge)            — create or update a graph edge
//   writeGraphFromAnswer(...)   — extract + write nodes/edges from a BibleAnswer
//   getFullGraph()              — all nodes + edges (paginated, max 2000 each)
//   getSubgraph(nodeKey)        — 1-hop neighbourhood around a node
//   getNodeByKey(key)           — single node lookup

import { getServerClient } from '@/lib/supabase';
import type { BibleAnswer } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NodeCategory =
  | 'concept' | 'doctrine' | 'person' | 'place'
  | 'book' | 'theme' | 'verse' | 'question';

export type NodeSourceType = 'question' | 'answer' | 'canonical' | 'obsidian';

export type EdgeRelation =
  | 'references' | 'quotes' | 'alludes_to'
  | 'supports' | 'contradicts' | 'qualifies' | 'fulfills'
  | 'related_to' | 'part_of' | 'leads_to' | 'contrasts_with'
  | 'calls' | 'imports' | 'uses';

export type EdgeConfidence = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';

export interface GraphNode {
  id?:          string;
  node_key:     string;          // stable slug
  label:        string;          // display name
  description?: string;
  category:     NodeCategory;
  source_type:  NodeSourceType;
  source_id?:   string;          // UUID of originating row
  dimension?:   string;
  metadata?:    Record<string, unknown>;
}

export interface GraphEdge {
  id?:        string;
  source_id:  string;            // graph_nodes.id
  target_id:  string;            // graph_nodes.id
  relation:   EdgeRelation;
  confidence: EdgeConfidence;
  weight?:    number;            // 0.0–1.0
  label?:     string;
  metadata?:  Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise a string to a stable slug. */
function toKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
}

/** Clamp weight to [0, 1]. */
function clampWeight(w: number): number {
  return Math.max(0, Math.min(1, w));
}

// ─── Node operations ─────────────────────────────────────────────────────────

/**
 * Upsert a graph node by node_key.
 * Returns the persisted node (with its UUID id).
 */
export async function upsertNode(node: GraphNode): Promise<GraphNode | null> {
  const svc = getServerClient();
  const key = toKey(node.node_key || node.label);

  const payload = {
    node_key:    key,
    label:       node.label,
    description: node.description ?? null,
    category:    node.category,
    source_type: node.source_type,
    source_id:   node.source_id ?? null,
    dimension:   node.dimension ?? null,
    metadata:    node.metadata ?? {},
  };

  const { data, error } = await svc
    .from('graph_nodes')
    .upsert(payload, { onConflict: 'node_key', ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    console.error('[graph] upsertNode error:', error.message);
    return null;
  }

  return data as GraphNode;
}

/**
 * Look up a node by its stable node_key.
 */
export async function getNodeByKey(nodeKey: string): Promise<GraphNode | null> {
  const svc = getServerClient();
  const key = toKey(nodeKey);

  const { data, error } = await svc
    .from('graph_nodes')
    .select('*')
    .eq('node_key', key)
    .single();

  if (error || !data) return null;
  return data as GraphNode;
}

// ─── Edge operations ─────────────────────────────────────────────────────────

/**
 * Upsert a graph edge by (source_id, target_id, relation).
 * Returns the persisted edge.
 */
export async function upsertEdge(edge: GraphEdge): Promise<GraphEdge | null> {
  const svc = getServerClient();

  const payload = {
    source_id:  edge.source_id,
    target_id:  edge.target_id,
    relation:   edge.relation,
    confidence: edge.confidence,
    weight:     clampWeight(edge.weight ?? 0.5),
    label:      edge.label ?? null,
    metadata:   edge.metadata ?? {},
  };

  const { data, error } = await svc
    .from('graph_edges')
    .upsert(payload, { onConflict: 'source_id,target_id,relation', ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    console.error('[graph] upsertEdge error:', error.message);
    return null;
  }

  return data as GraphEdge;
}

// ─── Batch write from a BibleAnswer ──────────────────────────────────────────

/**
 * Given a completed BibleAnswer, extract concept nodes from each dimension
 * and wire them together with INFERRED edges.
 *
 * Strategy (mirrors graphify's INFERRED second-pass logic):
 *   1. Create a "question" node for the question text.
 *   2. For each dimension answer, create a "concept" node keyed on the dimension.
 *   3. Link: question → dimension node  (relation: 'leads_to', INFERRED)
 *   4. Link: dimension nodes → each other  (relation: 'related_to', INFERRED)
 *   5. Extract scripture references from answer text → verse nodes.
 *   6. Link: verse node ← dimension node  (relation: 'references', EXTRACTED)
 */
export async function writeGraphFromAnswer(
  answer: BibleAnswer,
  answerId: string,
): Promise<{ nodes: number; edges: number }> {
  let nodeCount = 0;
  let edgeCount = 0;

  // 1. Question node
  const qNode = await upsertNode({
    node_key:    toKey(answer.question),
    label:       answer.question.slice(0, 128),
    description: `Biblical question: ${answer.question}`,
    category:    'question',
    source_type: 'question',
    source_id:   answerId,
  });
  if (qNode?.id) nodeCount++;

  const dimensionNodeIds: string[] = [];

  // 2–3. Dimension nodes + edges from question
  for (const dim of answer.dimensions ?? []) {
    const dimKey = toKey(dim.dimension);
    const dimNode = await upsertNode({
      node_key:    `${dimKey}-${toKey(answer.question).slice(0, 40)}`,
      label:       dim.dimension.charAt(0).toUpperCase() + dim.dimension.slice(1),
      description: dim.answer?.slice(0, 200),
      category:    'concept',
      source_type: 'answer',
      source_id:   answerId,
      dimension:   dim.dimension,
    });

    if (!dimNode?.id) continue;
    nodeCount++;
    dimensionNodeIds.push(dimNode.id);

    if (qNode?.id) {
      const e = await upsertEdge({
        source_id:  qNode.id,
        target_id:  dimNode.id,
        relation:   'leads_to',
        confidence: 'INFERRED',
        weight:     0.8,
      });
      if (e?.id) edgeCount++;
    }

    // 5–6. Scripture reference nodes
    const versePattern = /\b(\d?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s+\d+:\d+(?:-\d+)?)\b/g;
    const verseMatches = [...(dim.answer ?? '').matchAll(versePattern)];

    for (const match of verseMatches.slice(0, 8)) {
      const ref = match[1].trim();
      const verseNode = await upsertNode({
        node_key:    toKey(ref),
        label:       ref,
        category:    'verse',
        source_type: 'answer',
        source_id:   answerId,
        dimension:   dim.dimension,
      });
      if (!verseNode?.id) continue;
      nodeCount++;

      const ve = await upsertEdge({
        source_id:  dimNode.id,
        target_id:  verseNode.id,
        relation:   'references',
        confidence: 'EXTRACTED',
        weight:     1.0,
      });
      if (ve?.id) edgeCount++;
    }
  }

  // 4. Cross-link dimension nodes
  for (let i = 0; i < dimensionNodeIds.length; i++) {
    for (let j = i + 1; j < dimensionNodeIds.length; j++) {
      const e = await upsertEdge({
        source_id:  dimensionNodeIds[i],
        target_id:  dimensionNodeIds[j],
        relation:   'related_to',
        confidence: 'INFERRED',
        weight:     0.4,
      });
      if (e?.id) edgeCount++;
    }
  }

  return { nodes: nodeCount, edges: edgeCount };
}

// ─── Graph queries ────────────────────────────────────────────────────────────

/**
 * Returns the full graph (up to 2000 nodes and 2000 edges).
 * Used to build the initial /api/graph payload.
 */
export async function getFullGraph(): Promise<GraphData> {
  const svc = getServerClient();

  const [nodesRes, edgesRes] = await Promise.all([
    svc.from('graph_nodes').select('*').order('created_at', { ascending: false }).limit(2000),
    svc.from('graph_edges').select('*').order('created_at', { ascending: false }).limit(2000),
  ]);

  return {
    nodes: (nodesRes.data ?? []) as GraphNode[],
    edges: (edgesRes.data ?? []) as GraphEdge[],
  };
}

/**
 * Returns the 1-hop subgraph centred on a node_key.
 * Fetches the root node, all connecting edges, and the neighbour nodes.
 */
export async function getSubgraph(nodeKey: string): Promise<GraphData> {
  const svc = getServerClient();

  const root = await getNodeByKey(nodeKey);
  if (!root?.id) return { nodes: [], edges: [] };

  // All edges touching the root (source or target)
  const { data: edges } = await svc
    .from('graph_edges')
    .select('*')
    .or(`source_id.eq.${root.id},target_id.eq.${root.id}`)
    .limit(200);

  const typedEdges = (edges ?? []) as GraphEdge[];

  // Collect all neighbour IDs
  const neighbourIds = [
    ...new Set(
      typedEdges.flatMap((e) =>
        [e.source_id, e.target_id].filter((id) => id !== root.id)
      )
    ),
  ];

  let neighbours: GraphNode[] = [];
  if (neighbourIds.length > 0) {
    const { data: nData } = await svc
      .from('graph_nodes')
      .select('*')
      .in('id', neighbourIds);
    neighbours = (nData ?? []) as GraphNode[];
  }

  return {
    nodes: [root, ...neighbours],
    edges: typedEdges,
  };
}
