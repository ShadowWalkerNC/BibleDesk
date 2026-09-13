import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { fetchPassage } from '@/lib/bible';
import { getSubgraph } from '@/lib/graph';
import type { GraphNode } from '@/lib/graph';
import { getCanonicalGraph } from '@/lib/canonicalGraph';
import { generateBibleAnswer } from '@/lib/claude';
import { searchLocalBible, getLocalPassage } from '@/lib/bible-local';
import { getStrongsDefinition, getCrossReferences } from '@/lib/lexicon';
import { TRANSLATIONS, type TranslationId } from '@/types';
import { getAppUrl } from '@/lib/appUrl';
import { checkRateLimit, RateLimitNamespace } from '@/lib/rate-limit';

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

// ─── Fail-closed bearer auth + rate limiting ─────────────────────────────────

// SECURITY: MCP_SECRET is REQUIRED. If it is unset, or the presented bearer
// token does not match, EVERY request is refused (401). There is no dev-mode
// bypass and no unauthenticated access to any tool — a missing secret must
// never silently become an open endpoint.
function isAuthorized(req: NextRequest, secret: string | undefined): boolean {
  if (!secret) return false;
  const presented = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return presented.length === expected.length && crypto.timingSafeEqual(presented, expected);
}

function unauthorized(message: string) {
  return NextResponse.json(
    { success: false, error: message, code: 'unauthorized' },
    { status: 401 }
  );
}

function rateLimited(resetAt: Date) {
  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    { success: false, error: 'Too many requests', code: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

// ─── Tool manifest ──────────────────────────────────────────────────────────────

const VALID_TRANSLATIONS = TRANSLATIONS.map((t) => t.id);

const TOOL_MANIFEST = [
  {
    name: 'get_verse',
    description: 'Fetch the text of a specific Bible verse or passage from local Scripture modules. Returns the verse text, reference, and translation used.',
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
    description: 'Search for Bible verses containing a keyword or phrase across local Scripture modules. Returns matching verses with their references and text.',
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
    name: 'get_cross_references',
    description: 'Get curated cross-references from the Treasury of Scripture Knowledge (TSK) for a given verse reference.',
    inputSchema: {
      type: 'object',
      properties: {
        reference: {
          type: 'string',
          description: 'The verse reference, e.g. "John 3:16" or "Genesis 1:1"',
        },
        translation: {
          type: 'string',
          enum: VALID_TRANSLATIONS,
          description: 'Bible translation to populate verse text for.',
        },
      },
      required: ['reference'],
    },
  },
  {
    name: 'get_strongs_lexicon',
    description: 'Retrieve Strong\'s Greek or Hebrew lexicon entry (lemma, pronunciation, definition, KJV occurrences) by Strong\'s number tag (e.g. "G2889", "H7225").',
    inputSchema: {
      type: 'object',
      properties: {
        strongs_tag: {
          type: 'string',
          description: 'Strong\'s number with prefix (e.g. "G2889" for Greek, "H7225" for Hebrew).',
        },
      },
      required: ['strongs_tag'],
    },
  },
  {
    name: 'get_concept_subgraph',
    description: 'Get the neighbourhood subgraph around a concept node from the BibleDesk knowledge graph. Depth 1 = immediate neighbours (default); depth 2 = neighbours of neighbours (bounded, never the full graph).',
    inputSchema: {
      type: 'object',
      properties: {
        node_key: {
          type: 'string',
          description: 'The concept node key as a hyphenated lowercase slug, e.g. "theology-proper", "john-3-16".',
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
    description: 'Run the full BibleDesk 6-stage pipeline on a Bible question. Returns a structured answer with five dimensions: scripture analysis, historical context, original language insights, theological perspectives, and practical application.',
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

  const localRes = searchLocalBible(query, translation, 10);
  if (localRes && localRes.results.length > 0) {
    return {
      query,
      translation,
      results: localRes.results.map((r) => ({
        reference: r.reference,
        text: r.text,
      })),
      total: localRes.total,
      source: 'local',
    };
  }

  const encoded = encodeURIComponent(query);
  const url = `https://bible-api.com/${encoded}?translation=${translation}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { error: `Search failed (HTTP ${res.status})` };

    const data = await res.json();
    if (!data.verses?.length) return { results: [], query, total: 0 };

    const results = (data.verses as Array<{ book_name: string; chapter: number; verse: number; text: string }>)
      .slice(0, 10)
      .map((v) => ({
        reference: `${v.book_name} ${v.chapter}:${v.verse}`,
        text: v.text.trim(),
      }));

    return { query, translation, results, total: data.verses.length, source: 'remote' };
  } catch {
    return { error: 'Search request failed' };
  }
}

async function handleGetCrossReferences(args: Record<string, unknown>) {
  const reference = String(args.reference ?? '').trim();
  if (!reference) return { error: 'reference is required' };

  const translation = (VALID_TRANSLATIONS.includes(args.translation as TranslationId)
    ? args.translation
    : 'web') as TranslationId;

  const refs = getCrossReferences(reference);
  const enriched = refs.map((ref) => {
    const p = getLocalPassage(ref, translation);
    return {
      reference: ref,
      text: p?.text || '',
    };
  });

  return { reference, cross_references: enriched, total: enriched.length };
}

async function handleGetStrongsLexicon(args: Record<string, unknown>) {
  const tag = String(args.strongs_tag ?? '').trim();
  if (!tag) return { error: 'strongs_tag is required' };

  const def = getStrongsDefinition(tag);
  if (!def) return { error: `Strong's entry not found for "${tag}"` };

  return { strongs_tag: tag, definition: def };
}

async function handleGetConceptSubgraph(args: Record<string, unknown>) {
  // Graph node keys are hyphenated lowercase slugs (e.g. "theology-proper",
  // "john-3-16") — spaces in input are hyphenated, never underscored.
  const nodeKey = String(args.node_key ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!nodeKey) return { error: 'node_key is required' };

  const depth = Math.min(2, Math.max(1, Number(args.depth ?? 1)));

  // Dataset: the canonical static graph (bundled constant, not a DB fetch)
  // merged with a bounded 1-hop DB neighbourhood around the root node.
  // Depth 2 is traversed from this bounded data — the full graph is never fetched.
  const canonical = getCanonicalGraph();
  const nodeByKey = new Map<string, GraphNode>();
  for (const n of canonical.nodes) {
    if (n.node_key) nodeByKey.set(n.node_key.toLowerCase(), n);
  }
  const edgeList = [...canonical.edges];
  try {
    const db = await getSubgraph(nodeKey);
    for (const n of db.nodes) {
      if (n.node_key) nodeByKey.set(n.node_key.toLowerCase(), n);
    }
    edgeList.push(...db.edges);
  } catch {
    // DB unavailable — proceed with canonical data only.
  }

  const root = nodeByKey.get(nodeKey);
  if (!root) return { error: `Concept node not found: ${nodeKey}` };

  const nodeById = new Map<string, GraphNode>();
  for (const n of nodeByKey.values()) {
    const id = n.id ?? n.node_key;
    if (id) nodeById.set(String(id), n);
  }
  const edgePairs = edgeList.map((e) => ({
    s: String(e.source_id),
    t: String(e.target_id),
  }));

  // Bounded BFS from the root to the requested depth (max 2).
  const MAX_NODES = 250;
  const rootId = String(root.id ?? root.node_key);
  const visited = new Set<string>([rootId]);
  let frontier = [rootId];
  for (let d = 0; d < depth && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const { s, t } of edgePairs) {
        if (s === id && !visited.has(t)) {
          visited.add(t);
          next.push(t);
        } else if (t === id && !visited.has(s)) {
          visited.add(s);
          next.push(s);
        }
      }
      if (visited.size >= MAX_NODES) break;
    }
    frontier = next;
    if (visited.size >= MAX_NODES) break;
  }

  const subNodes = [...visited]
    .map((id) => nodeById.get(id))
    .filter((n): n is GraphNode => !!n);
  const subEdges = edgeList.filter(
    (e) => visited.has(String(e.source_id)) && visited.has(String(e.target_id))
  );

  return {
    root,
    nodes: subNodes,
    edges: subEdges,
    node_count: subNodes.length,
    edge_count: subEdges.length,
  };
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
    share_url: `${getAppUrl()}/share/${answer.id.slice(0, 8)}`,
  };
}

// ─── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = process.env.MCP_SECRET;
  if (!isAuthorized(req, secret)) {
    return unauthorized(
      secret ? 'Unauthorized' : 'MCP server is not configured (MCP_SECRET is unset)'
    );
  }

  // Per-secret rate budget (the limiter hashes the secret; raw value is never stored).
  const rate = await checkRateLimit(secret as string, {
    namespace: RateLimitNamespace.mcp,
    limit: 100,
  });
  if (!rate.allowed) {
    return rateLimited(rate.resetAt);
  }

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
        case 'get_cross_references': result = await handleGetCrossReferences(args);  break;
        case 'get_strongs_lexicon':  result = await handleGetStrongsLexicon(args);   break;
        case 'get_concept_subgraph': result = await handleGetConceptSubgraph(args);  break;
        case 'get_answer_history':   result = await handleGetAnswerHistory(args);    break;
        case 'get_dimension':        result = await handleGetDimension(args);         break;
        case 'ask_bible_question':   result = await handleAskBibleQuestion(args);    break;
        default:
          return err(id, -32601, `Tool not found: ${toolName}`);
      }

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

export async function GET(req: NextRequest) {
  // Fail-closed: the discovery endpoint is gated too — with MCP_SECRET unset,
  // every MCP request is refused.
  const secret = process.env.MCP_SECRET;
  if (!isAuthorized(req, secret)) {
    return unauthorized(
      secret ? 'Unauthorized' : 'MCP server is not configured (MCP_SECRET is unset)'
    );
  }
  return NextResponse.json({
    name: 'BibleDesk MCP Server',
    version: '1.0.0',
    protocol: 'MCP/JSON-RPC 2.0',
    tools: TOOL_MANIFEST.map((t) => ({ name: t.name, description: t.description })),
    usage: 'POST /api/mcp with JSON-RPC 2.0 payload',
  });
}
