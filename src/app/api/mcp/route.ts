/**
 * /api/mcp — BibleDesk HTTP MCP Server
 *
 * Implements the Model Context Protocol (MCP) over HTTP/JSON-RPC 2.0.
 * Usable from Claude Desktop via `mcp-remote`, Cursor, or any MCP client.
 *
 * Supported methods:
 *   tools/list  — returns the tool manifest
 *   tools/call  — executes a tool by name
 *
 * Authentication:
 *   Optional. Set MCP_SECRET in env. If set, requests must include:
 *     Authorization: Bearer <MCP_SECRET>
 *   If MCP_SECRET is unset, the endpoint is open (dev / internal use).
 *
 * Available tools:
 *   get_verse              — fetch a specific Bible verse
 *   search_scripture       — search verses by keyword
 *   get_concept_subgraph   — 1-hop theology graph around a concept
 *   get_answer_history     — recent BibleDesk answers from Supabase
 *   get_dimension          — one dimension from a stored answer
 *   ask_bible_question     — run the full 6-stage pipeline
 *
 * SERVER ONLY — all API keys stay server-side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPassage, fetchPassages } from '@/lib/bible';
import { getFullGraph, getSubgraph } from '@/lib/graph';
import { generateBibleAnswer } from '@/lib/claude';
import { TRANSLATIONS, type TranslationId } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ─── JSON-RPC helpers ──────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function ok(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function err(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });
}

// ─── Tool manifest ──────────────────────────────────────────────────────────────

const VALID_TRANSLATIONS = TRANSLATIONS.map((t) => t.id);

const TOOL_MANIFEST = [
  {
    name: 'get_verse',
    description: 'Fetch the text of a specific Bible verse or passage from bible-api.com. Returns the verse text, reference, and translation used.',
    inputSchema: {
      type: 'object',
      properties: {
        reference: {
          type: 'string',
          description: 'Bible reference, e.g. "John 3:16", "Romans 8:28-30", "Genesis 1:1"',
        },
        translation: {
          type: 'string',
          enum: VALID_TRANSLATIONS,
          description: 'Bible translation ID. Defaults to "web" (World English Bible).',
        },
      },
      required: ['reference'],
    },
  },
  {
    name: 'search_scripture',
    description: 'Search for Bible verses containing a keyword or phrase. Returns up to 10 matching verses with their references and text.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Word or phrase to search for, e.g. "love your enemies", "faith without works"',
        },
        translation: {
          type: 'string',
          enum: VALID_TRANSLATIONS,
          description: 'Bible translation ID. Defaults to "web".',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_concept_subgraph',
    description: 'Get the 1-hop theology knowledge graph around a concept node. Returns the node and all directly connected nodes and edges from the BibleDesk graph database.',
    inputSchema: {
      type: 'object',
      properties: {
        node_key: {
          type: 'string',
          description: 'The concept node key, e.g. "salvation", "grace", "covenant". Use snake_case.',
        },
        depth: {
          type: 'number',
          description: 'Hop depth. 1 = immediate neighbours (default). Max 2.',
        },
      },
      required: ['node_key'],
    },
  },
  {
    name: 'get_answer_history',
    description: 'Retrieve recent BibleDesk study answers from the database. Returns question, summary, confidence, and creation date for each answer.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of answers to return (1–50). Defaults to 10.',
        },
      },
    },
  },
  {
    name: 'get_dimension',
    description: 'Retrieve one specific dimension (scripture, historical, original_language, theological, or practical) from a stored BibleDesk answer by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        answer_id: {
          type: 'string',
          description: 'The UUID of the stored answer.',
        },
        dimension: {
          type: 'string',
          enum: ['scripture', 'historical', 'original_language', 'theological', 'practical'],
          description: 'Which dimension to retrieve.',
        },
      },
      required: ['answer_id', 'dimension'],
    },
  },
  {
    name: 'ask_bible_question',
    description: 'Run the full BibleDesk 6-stage pipeline on a Bible question. Returns a structured answer with five dimensions: scripture analysis, historical context, original language insights, theological perspectives, and practical application. This is the most powerful tool — use it when a thorough Bible study answer is needed.',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The Bible question to study, e.g. "What does the Bible say about forgiveness?"',
        },
        translation: {
          type: 'string',
          enum: VALID_TRANSLATIONS,
          description: 'Bible translation to use. Defaults to "web".',
        },
      },
      required: ['question'],
    },
  },
];

// ─── Supabase helpers (lazy, won’t crash if env vars missing) ──────────────────

async function querySupabase<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}/rest/v1/${path}${qs ? '?' + qs : ''}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T[]>;
}

// ─── Tool handlers ──────────────────────────────────────────────────────────────

async function handleGetVerse(args: Record<string, unknown>) {
  const reference = String(args.reference ?? '').trim();
  if (!reference) return { error: 'reference is required' };

  const translation = (VALID_TRANSLATIONS.includes(args.translation as TranslationId)
    ? args.translation
    : 'web') as TranslationId;

  const result = await fetchPassage(reference, translation);

  if (!result.text) {
    return { error: result.error ?? `Could not find verse: ${reference}` };
  }

  return {
    reference: result.reference,
    text: result.text,
    translation,
    verses: result.passage?.verses ?? [],
  };
}

async function handleSearchScripture(args: Record<string, unknown>) {
  const query = String(args.query ?? '').trim();
  if (!query || query.length < 2) return { error: 'query must be at least 2 characters' };

  const translation = (VALID_TRANSLATIONS.includes(args.translation as TranslationId)
    ? args.translation
    : 'web') as TranslationId;

  // bible-api.com supports passage search by keyword phrase
  const encoded = encodeURIComponent(query);
  const slug = translation;
  const url = `https://bible-api.com/${encoded}?translation=${slug}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { error: `Search failed (HTTP ${res.status})` };

    const data = await res.json();
    if (!data.verses?.length) return { results: [], query };

    // Return up to 10 verses
    const results = (data.verses as Array<{ book_name: string; chapter: number; verse: number; text: string }>)
      .slice(0, 10)
      .map((v) => ({
        reference: `${v.book_name} ${v.chapter}:${v.verse}`,
        text: v.text.trim(),
      }));

    return { query, translation, results, total: data.verses.length };
  } catch {
    return { error: 'Search request failed' };
  }
}

async function handleGetConceptSubgraph(args: Record<string, unknown>) {
  const nodeKey = String(args.node_key ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!nodeKey) return { error: 'node_key is required' };

  const depth = Math.min(2, Math.max(1, Number(args.depth ?? 1)));

  try {
    const data = depth === 1
      ? await getSubgraph(nodeKey)
      : await getFullGraph();

    if (!data) return { error: 'Graph data unavailable — Supabase may not be configured' };

    // Filter to the requested node and its immediate neighbours
    const { nodes, edges } = data;
    const rootNode = nodes.find((n) => n.key === nodeKey);
    if (!rootNode) return { error: `Concept node not found: ${nodeKey}`, available_hint: 'Use get_concept_subgraph with an exact concept key from the graph' };

    const connectedKeys = new Set<string>();
    connectedKeys.add(nodeKey);
    for (const edge of edges) {
      if (edge.source_key === nodeKey) connectedKeys.add(edge.target_key);
      if (edge.target_key === nodeKey) connectedKeys.add(edge.source_key);
    }

    const subNodes = nodes.filter((n) => connectedKeys.has(n.key));
    const subEdges = edges.filter(
      (e) => connectedKeys.has(e.source_key) && connectedKeys.has(e.target_key)
    );

    return {
      root: rootNode,
      nodes: subNodes,
      edges: subEdges,
      node_count: subNodes.length,
      edge_count: subEdges.length,
    };
  } catch {
    return { error: 'Failed to load graph data' };
  }
}

async function handleGetAnswerHistory(args: Record<string, unknown>) {
  const limit = Math.min(50, Math.max(1, Number(args.limit ?? 10)));

  const rows = await querySupabase<{
    id: string;
    question: string;
    summary: string;
    confidence: string;
    translation_used: string;
    status: string;
    created_at: string;
  }>('answers', {
    select: 'id,question,summary,confidence,translation_used,status,created_at',
    order: 'created_at.desc',
    limit: String(limit),
  });

  if (!rows) {
    return { error: 'Could not fetch answers — Supabase may not be configured' };
  }

  return { answers: rows, count: rows.length };
}

async function handleGetDimension(args: Record<string, unknown>) {
  const answerId = String(args.answer_id ?? '').trim();
  const dimension = String(args.dimension ?? '').trim();

  if (!answerId) return { error: 'answer_id is required' };

  const VALID_DIMS = ['scripture', 'historical', 'original_language', 'theological', 'practical'];
  if (!VALID_DIMS.includes(dimension)) {
    return { error: `dimension must be one of: ${VALID_DIMS.join(', ')}` };
  }

  const rows = await querySupabase<{ id: string; dimensions: Record<string, unknown> }>(
    'answers',
    { select: 'id,dimensions', 'id.eq': answerId, limit: '1' }
  );

  if (!rows || rows.length === 0) {
    return { error: `Answer not found: ${answerId}` };
  }

  const dimData = rows[0].dimensions?.[dimension];
  if (!dimData) return { error: `Dimension "${dimension}" not found on answer ${answerId}` };

  return { answer_id: answerId, dimension, data: dimData };
}

async function handleAskBibleQuestion(args: Record<string, unknown>) {
  const question = String(args.question ?? '').trim();
  if (!question || question.length < 5) {
    return { error: 'question must be at least 5 characters' };
  }

  const translation = (VALID_TRANSLATIONS.includes(args.translation as TranslationId)
    ? args.translation
    : 'web') as TranslationId;

  const answer = await generateBibleAnswer(question, { translation });

  return {
    id: answer.id,
    question: answer.question,
    summary: answer.summary,
    confidence: answer.confidence,
    translation_used: answer.translation_used,
    status: answer.status,
    disclaimer: answer.disclaimer,
    dimensions: answer.dimensions,
    share_url: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/share/${answer.id.slice(0, 8)}`
      : null,
  };
}

// ─── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ─ Auth (optional) ──────────────────────────────────────────────────────
  const secret = process.env.MCP_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
        { status: 401 }
      );
    }
  }

  // ─ Parse JSON-RPC ────────────────────────────────────────────────────
  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return err(null, -32700, 'Parse error');
  }

  if (body.jsonrpc !== '2.0' || !body.method) {
    return err(body.id ?? null, -32600, 'Invalid Request');
  }

  const { id, method, params = {} } = body;
  const args = (params.arguments ?? params) as Record<string, unknown>;

  // ─ Dispatch ──────────────────────────────────────────────────────────────
  try {
    if (method === 'tools/list') {
      return ok(id, { tools: TOOL_MANIFEST });
    }

    if (method === 'tools/call') {
      const toolName = String(params.name ?? '');
      let result: unknown;

      switch (toolName) {
        case 'get_verse':            result = await handleGetVerse(args);            break;
        case 'search_scripture':     result = await handleSearchScripture(args);     break;
        case 'get_concept_subgraph': result = await handleGetConceptSubgraph(args);  break;
        case 'get_answer_history':   result = await handleGetAnswerHistory(args);    break;
        case 'get_dimension':        result = await handleGetDimension(args);         break;
        case 'ask_bible_question':   result = await handleAskBibleQuestion(args);    break;
        default:
          return err(id, -32601, `Tool not found: ${toolName}`);
      }

      // MCP spec: tool results are wrapped in content array
      return ok(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: typeof result === 'object' && result !== null && 'error' in result,
      });
    }

    return err(id, -32601, `Method not found: ${method}`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    console.error('[mcp] unhandled error:', e);
    return err(id, -32603, message);
  }
}

// GET — health check + tool list for easy browser inspection
export async function GET() {
  return NextResponse.json({
    name: 'BibleDesk MCP Server',
    version: '1.0.0',
    protocol: 'MCP/JSON-RPC 2.0',
    tools: TOOL_MANIFEST.map((t) => ({ name: t.name, description: t.description })),
    usage: 'POST /api/mcp with JSON-RPC 2.0 payload',
  });
}
