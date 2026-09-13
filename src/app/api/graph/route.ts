// BibleDesk — GET /api/graph
// Returns the BibleDesk knowledge graph as JSON, ready for D3/Cytoscape.
//
// Query parameters (all optional):
//   ?nodeKey=<slug>   — return 1-hop subgraph around that node (canonical)
//   ?node=<slug>      — legacy alias for ?nodeKey= (deprecated; prefer nodeKey)
//   ?full=1           — return the full graph (default when no nodeKey)
//   ?limit=<n>        — max nodes to return for full graph (default 500, max 2000)
//
// Response:
//   200  { success: true, nodes: GraphNode[], edges: GraphEdge[],
//          meta: { nodeCount, edgeCount, subgraph: boolean } }
//   400  { success: false, error: '...', code: 'INVALID_INPUT' }
//   404  { success: false, error: 'Unknown nodeKey.', code: 'NOT_FOUND' }
//   500  { success: false, error: '...', code: 'DB_ERROR' }
//
// Auth: public read (no auth required — graph data is non-sensitive).
//
// POST /api/graph
// Writes nodes + edges from a BibleAnswer into the graph.
// Auth-gated: requires service-role-equivalent internal secret header.
//
// Request body:
//   { answer: BibleAnswer, answerId: string }
//
// Response:
//   200  { success: true, nodes: number, edges: number }
//   400  { success: false, error: '...', code: 'INVALID_INPUT' }
//   401  { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
//   500  { success: false, error: '...', code: 'WRITE_FAILED' }

import { NextRequest, NextResponse } from 'next/server';
import {
  getFullGraph,
  getSubgraph,
  writeGraphFromAnswer,
  type GraphData,
} from '@/lib/graph';
import {
  getCanonicalGraph,
  getCanonicalSubgraph,
} from '@/lib/canonicalGraph';
import type { BibleAnswer } from '@/types';

const GRAPH_WRITE_SECRET = process.env.GRAPH_WRITE_SECRET;

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawNodeKey = searchParams.get('nodeKey')?.trim();
  const legacyNode = searchParams.get('node')?.trim();
  // Legacy alias: ?node=<slug> maps to ?nodeKey=<slug>. Log so callers migrate.
  const nodeKey = rawNodeKey || legacyNode || null;
  if (!rawNodeKey && legacyNode) {
    console.warn('[graph] deprecated ?node= query param used; use ?nodeKey=');
  }

  const limitParam = searchParams.get('limit');

  const limit = Math.min(
    Math.max(1, parseInt(limitParam ?? '500', 10) || 500),
    2000
  );

  if (nodeKey && nodeKey.length > 200) {
    return NextResponse.json(
      { success: false, error: 'nodeKey too long.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  try {
    let canonical = nodeKey ? getCanonicalSubgraph(nodeKey) : getCanonicalGraph();
    // getCanonicalSubgraph falls back to the full graph for unknown keys —
    // detect that here so we can return an honest 404 instead of wrong data.
    const canonicalHasKey =
      !nodeKey ||
      canonical.nodes.some(
        (n) => n.node_key?.toLowerCase() === nodeKey.toLowerCase()
      );
    if (nodeKey && !canonicalHasKey) {
      // Drop the full-graph fallback so DB-only keys merge cleanly below.
      canonical = { nodes: [], edges: [] };
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (!canonicalHasKey) {
        return NextResponse.json(
          { success: false, error: 'Unknown nodeKey.', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        nodes: canonical.nodes,
        edges: canonical.edges,
        meta: {
          nodeCount: canonical.nodes.length,
          edgeCount: canonical.edges.length,
          subgraph: !!nodeKey,
        },
      });
    }

    let dbGraph: GraphData;

    if (nodeKey) {
      dbGraph = await getSubgraph(nodeKey);
      // getSubgraph returns empty when the key is unknown to the DB too.
      if (!canonicalHasKey && dbGraph.nodes.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Unknown nodeKey.', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
    } else {
      dbGraph = await getFullGraph();
    }

    // Merge canonical dataset with dynamic DB nodes
    const nodeMap = new Map();
    for (const n of canonical.nodes) nodeMap.set(n.node_key, n);
    for (const n of dbGraph.nodes) nodeMap.set(n.node_key, n);

    const edgeMap = new Map();
    for (const e of canonical.edges) edgeMap.set(`${e.source_id}->${e.target_id}`, e);
    for (const e of dbGraph.edges) edgeMap.set(`${e.source_id}->${e.target_id}`, e);

    const mergedNodes = Array.from(nodeMap.values()).slice(0, limit);
    const mergedEdges = Array.from(edgeMap.values()).slice(0, limit);

    return NextResponse.json({
      success:  true,
      nodes:    mergedNodes,
      edges:    mergedEdges,
      meta: {
        nodeCount: mergedNodes.length,
        edgeCount: mergedEdges.length,
        subgraph:  !!nodeKey,
      },
    });
  } catch (err) {
    console.error('[graph] GET error, falling back to canonical graph:', err);
    const fallback = getCanonicalGraph();
    return NextResponse.json({
      success: true,
      nodes: fallback.nodes,
      edges: fallback.edges,
      meta: {
        nodeCount: fallback.nodes.length,
        edgeCount: fallback.edges.length,
        subgraph: false,
      },
    });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Internal-only: protected by a shared secret set in env vars
  const authHeader = req.headers.get('x-graph-write-secret');
  if (!GRAPH_WRITE_SECRET || authHeader !== GRAPH_WRITE_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let body: { answer?: BibleAnswer; answerId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  const { answer, answerId } = body;

  if (!answer || typeof answer !== 'object') {
    return NextResponse.json(
      { success: false, error: 'answer is required.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  if (!answerId || typeof answerId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'answerId is required.', code: 'INVALID_INPUT' },
      { status: 400 }
    );
  }

  try {
    const { nodes, edges } = await writeGraphFromAnswer(answer, answerId);
    return NextResponse.json({ success: true, nodes, edges });
  } catch (err) {
    console.error('[graph] POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to write graph.', code: 'WRITE_FAILED' },
      { status: 500 }
    );
  }
}
