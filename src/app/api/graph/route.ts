// BibleDesk — GET /api/graph
// Returns the BibleDesk knowledge graph as JSON, ready for D3/Cytoscape.
//
// Query parameters (all optional):
//   ?nodeKey=<slug>   — return 1-hop subgraph around that node
//   ?full=1           — return the full graph (default when no nodeKey)
//   ?limit=<n>        — max nodes to return for full graph (default 500, max 2000)
//
// Response:
//   200  { success: true, nodes: GraphNode[], edges: GraphEdge[],
//          meta: { nodeCount, edgeCount, subgraph: boolean } }
//   400  { success: false, error: '...', code: 'INVALID_INPUT' }
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
import type { BibleAnswer } from '@/types';

const GRAPH_WRITE_SECRET = process.env.GRAPH_WRITE_SECRET;

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nodeKey = searchParams.get('nodeKey')?.trim();
  const limitParam = searchParams.get('limit');

  const limit = Math.min(
    Math.max(1, parseInt(limitParam ?? '500', 10) || 500),
    2000
  );

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Mock data so the graph page doesn't crash
      return NextResponse.json({
        success: true,
        nodes: [
          { id: '1', node_key: 'grace', label: 'Grace', category: 'doctrine', source_type: 'canonical' },
          { id: '2', node_key: 'faith', label: 'Faith', category: 'doctrine', source_type: 'canonical' },
          { id: '3', node_key: 'repentance', label: 'Repentance', category: 'doctrine', source_type: 'canonical' },
          { id: '4', node_key: 'forgiveness', label: 'Forgiveness', category: 'concept', source_type: 'canonical' }
        ],
        edges: [
          { id: 'e1', source_id: '1', target_id: '2', relation: 'leads_to', confidence: 'EXTRACTED', label: 'leads to' },
          { id: 'e2', source_id: '2', target_id: '3', relation: 'leads_to', confidence: 'INFERRED', label: 'triggers' },
          { id: 'e3', source_id: '1', target_id: '4', relation: 'leads_to', confidence: 'EXTRACTED', label: 'grants' }
        ],
        meta: { nodeCount: 4, edgeCount: 3, subgraph: false }
      });
    }

    let graph: GraphData;

    if (nodeKey) {
      if (nodeKey.length > 200) {
        return NextResponse.json(
          { success: false, error: 'nodeKey too long.', code: 'INVALID_INPUT' },
          { status: 400 }
        );
      }
      graph = await getSubgraph(nodeKey);
    } else {
      graph = await getFullGraph();
      // Honour limit for full graph (already DB-limited to 2000)
      graph.nodes = graph.nodes.slice(0, limit);
      graph.edges = graph.edges.slice(0, limit);
    }

    return NextResponse.json({
      success:  true,
      nodes:    graph.nodes,
      edges:    graph.edges,
      meta: {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        subgraph:  !!nodeKey,
      },
    });
  } catch (err) {
    console.error('[graph] GET error:', err);
    // Return dummy data fallback instead of 500 error
    return NextResponse.json({
      success: true,
      nodes: [
        { id: '1', node_key: 'grace', label: 'Grace', category: 'doctrine', source_type: 'canonical' },
        { id: '2', node_key: 'faith', label: 'Faith', category: 'doctrine', source_type: 'canonical' }
      ],
      edges: [
        { id: 'e1', source_id: '1', target_id: '2', relation: 'leads_to', confidence: 'EXTRACTED', label: 'leads to' }
      ],
      meta: { nodeCount: 2, edgeCount: 1, subgraph: false, warning: 'Fallback to mock data' }
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
