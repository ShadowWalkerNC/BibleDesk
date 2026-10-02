// BibleDesk — Knowledge Graph library
// Uses Railway PostgreSQL via Drizzle ORM (graph_nodes + graph_edges tables).
//
// Design follows graphify's extraction schema:
//   Node: { id, label, source_file, source_location }
//   Edge: { source, target, relation, confidence }
//
// Exports:
//   upsertNode(node)            — create or update a graph node
//   upsertEdge(edge)            — create or update a graph edge
//   writeGraphFromAnswer(...)   — extract + write nodes/edges from a BibleAnswer
//   getFullGraph()              — all nodes + edges (paginated, max 2000 each)
//   getSubgraph(nodeKey)        — 1-hop neighbourhood around a node
//   getNodeByKey(key)           — single node lookup

import { getDb } from '@/db';
import { graphNodes as graphNodesTable, graphEdges as graphEdgesTable } from '@/db/schema';
import type { GraphNode as GraphNodeRow, GraphEdge as GraphEdgeRow } from '@/db/schema';
import { eq, or, inArray, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { BibleAnswer } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NodeCategory =
  | 'concept' | 'doctrine' | 'person' | 'place'
  | 'book' | 'theme' | 'verse' | 'question' | 'sermon' | 'prayer';

export type NodeSourceType = 'question' | 'answer' | 'canonical' | 'obsidian' | 'sermon' | 'prayer';

export type EdgeRelation =
  | 'references' | 'quotes' | 'alludes_to'
  | 'supports' | 'contradicts' | 'qualifies' | 'fulfills'
  | 'related_to' | 'part_of' | 'leads_to' | 'contrasts_with'
  | 'calls' | 'imports' | 'uses'
  | 'preached_from' | 'prayed_with';

export type EdgeConfidence = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';

export interface GraphNode {
  id?:          string;
  node_key:     string;
  label:        string;
  description?: string;
  category:     NodeCategory;
  source_type:  NodeSourceType;
  source_id?:   string;
  dimension?:   string;
  scripture_ref?: string;
  strongs_num?:   string;
  catechism_ref?: string;
  encourage_category?: string;
  metadata?:    Record<string, unknown>;
}

export interface GraphEdge {
  id?:        string;
  source_id:  string;
  target_id:  string;
  relation:   EdgeRelation;
  confidence: EdgeConfidence;
  weight?:    number;
  label?:     string;
  metadata?:  Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
}

function clampWeight(w: number): number {
  return Math.max(0, Math.min(1, w));
}

// ─── Node operations ─────────────────────────────────────────────────────────

export async function upsertNode(node: GraphNode): Promise<GraphNode | null> {
  try {
    const db = await getDb();
    const key = toKey(node.node_key || node.label);
    const id = uuidv4();

    const rows = await db
      .insert(graphNodesTable)
      .values({
        id,
        nodeKey: key,
        label: node.label,
        description: node.description ?? null,
        category: node.category,
        sourceType: node.source_type,
        sourceId: node.source_id ?? null,
        dimension: node.dimension ?? null,
        metadata: node.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: graphNodesTable.nodeKey,
        set: {
          label: node.label,
          description: node.description ?? null,
          category: node.category,
          sourceType: node.source_type,
          sourceId: node.source_id ?? null,
          dimension: node.dimension ?? null,
          metadata: node.metadata ?? {},
        },
      })
      .returning();

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      node_key: r.nodeKey,
      label: r.label,
      description: r.description ?? undefined,
      category: r.category as NodeCategory,
      source_type: r.sourceType as NodeSourceType,
      source_id: r.sourceId ?? undefined,
      dimension: r.dimension ?? undefined,
      metadata: (r.metadata as Record<string, unknown>) ?? undefined,
    };
  } catch (err) {
    console.error('[graph] upsertNode error:', err);
    return null;
  }
}

export async function getNodeByKey(nodeKey: string): Promise<GraphNode | null> {
  try {
    const db = await getDb();
    const key = toKey(nodeKey);
    const rows = await db
      .select()
      .from(graphNodesTable)
      .where(eq(graphNodesTable.nodeKey, key))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      node_key: r.nodeKey,
      label: r.label,
      description: r.description ?? undefined,
      category: r.category as NodeCategory,
      source_type: r.sourceType as NodeSourceType,
      source_id: r.sourceId ?? undefined,
      dimension: r.dimension ?? undefined,
      metadata: (r.metadata as Record<string, unknown>) ?? undefined,
    };
  } catch (err) {
    console.error('[graph] getNodeByKey error:', err);
    return null;
  }
}

// ─── Edge operations ─────────────────────────────────────────────────────────

export async function upsertEdge(edge: GraphEdge): Promise<GraphEdge | null> {
  try {
    const db = await getDb();
    const id = uuidv4();

    const rows = await db
      .insert(graphEdgesTable)
      .values({
        id,
        sourceId: edge.source_id,
        targetId: edge.target_id,
        relation: edge.relation,
        confidence: edge.confidence,
        weight: clampWeight(edge.weight ?? 0.5),
        label: edge.label ?? null,
        metadata: edge.metadata ?? {},
      })
      .onConflictDoUpdate({
        target: [graphEdgesTable.sourceId, graphEdgesTable.targetId, graphEdgesTable.relation],
        set: {
          confidence: edge.confidence,
          weight: clampWeight(edge.weight ?? 0.5),
          label: edge.label ?? null,
          metadata: edge.metadata ?? {},
        },
      })
      .returning();

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      source_id: r.sourceId,
      target_id: r.targetId,
      relation: r.relation as EdgeRelation,
      confidence: r.confidence as EdgeConfidence,
      weight: r.weight ?? undefined,
      label: r.label ?? undefined,
      metadata: (r.metadata as Record<string, unknown>) ?? undefined,
    };
  } catch (err) {
    console.error('[graph] upsertEdge error:', err);
    return null;
  }
}

// ─── Batch write from a BibleAnswer ──────────────────────────────────────────

export async function writeGraphFromAnswer(
  answer: BibleAnswer,
  answerId: string,
): Promise<{ nodes: number; edges: number }> {
  let nodeCount = 0;
  let edgeCount = 0;

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

  for (const [dimKey, dim] of Object.entries(answer.dimensions ?? {})) {
    const dimNode = await upsertNode({
      node_key:    `${dimKey}-${toKey(answer.question).slice(0, 40)}`,
      label:       dim.title,
      description: dim.content?.slice(0, 200),
      category:    'concept',
      source_type: 'answer',
      source_id:   answerId,
      dimension:   dimKey,
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

    const versePattern = /\b(\d?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s+\d+:\d+(?:-\d+)?)\b/g;
    const verseMatches = [...(dim.content ?? '').matchAll(versePattern)];

    for (const match of verseMatches.slice(0, 8)) {
      const ref = match[1].trim();
      const verseNode = await upsertNode({
        node_key:    toKey(ref),
        label:       ref,
        category:    'verse',
        source_type: 'answer',
        source_id:   answerId,
        dimension:   dimKey,
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

export async function getFullGraph(): Promise<GraphData> {
  try {
    const db = await getDb();
    const [nodeRows, edgeRows] = await Promise.all([
      db.select().from(graphNodesTable).orderBy(desc(graphNodesTable.createdAt)).limit(2000),
      db.select().from(graphEdgesTable).orderBy(desc(graphEdgesTable.createdAt)).limit(2000),
    ]);

    return {
      nodes: nodeRows.map((r: GraphNodeRow) => ({
        id: r.id,
        node_key: r.nodeKey,
        label: r.label,
        description: r.description ?? undefined,
        category: r.category as NodeCategory,
        source_type: r.sourceType as NodeSourceType,
        source_id: r.sourceId ?? undefined,
        dimension: r.dimension ?? undefined,
        metadata: (r.metadata as Record<string, unknown>) ?? undefined,
      })),
      edges: edgeRows.map((r: GraphEdgeRow) => ({
        id: r.id,
        source_id: r.sourceId,
        target_id: r.targetId,
        relation: r.relation as EdgeRelation,
        confidence: r.confidence as EdgeConfidence,
        weight: r.weight ?? undefined,
        label: r.label ?? undefined,
        metadata: (r.metadata as Record<string, unknown>) ?? undefined,
      })),
    };
  } catch (err) {
    console.error('[graph] getFullGraph error:', err);
    return { nodes: [], edges: [] };
  }
}

export async function getSubgraph(nodeKey: string): Promise<GraphData> {
  try {
    const db = await getDb();
    const root = await getNodeByKey(nodeKey);
    if (!root?.id) return { nodes: [], edges: [] };

    const edgeRows = await db
      .select()
      .from(graphEdgesTable)
      .where(
        or(
          eq(graphEdgesTable.sourceId, root.id),
          eq(graphEdgesTable.targetId, root.id)
        )
      )
      .limit(200);

    const typedEdges: GraphEdge[] = edgeRows.map((r: GraphEdgeRow) => ({
      id: r.id,
      source_id: r.sourceId,
      target_id: r.targetId,
      relation: r.relation as EdgeRelation,
      confidence: r.confidence as EdgeConfidence,
      weight: r.weight ?? undefined,
      label: r.label ?? undefined,
      metadata: (r.metadata as Record<string, unknown>) ?? undefined,
    }));

    const neighbourIds = [
      ...new Set(
        typedEdges.flatMap((e) =>
          [e.source_id, e.target_id].filter((id) => id !== root.id)
        )
      ),
    ];

    let neighbours: GraphNode[] = [];
    if (neighbourIds.length > 0) {
      const nRows = await db
        .select()
        .from(graphNodesTable)
        .where(inArray(graphNodesTable.id, neighbourIds));
      neighbours = nRows.map((r: GraphNodeRow) => ({
        id: r.id,
        node_key: r.nodeKey,
        label: r.label,
        description: r.description ?? undefined,
        category: r.category as NodeCategory,
        source_type: r.sourceType as NodeSourceType,
        source_id: r.sourceId ?? undefined,
        dimension: r.dimension ?? undefined,
        metadata: (r.metadata as Record<string, unknown>) ?? undefined,
      }));
    }

    return { nodes: [root, ...neighbours], edges: typedEdges };
  } catch (err) {
    console.error('[graph] getSubgraph error:', err);
    return { nodes: [], edges: [] };
  }
}
