// BibleDesk — GET /api/export/obsidian
// Generates a downloadable .zip of Obsidian-ready Markdown files from the
// knowledge graph, following the claude-obsidian vault structure:
//   https://github.com/AgriciDaniel/claude-obsidian
//
// Each graph_node becomes a .md file with:
//   - YAML frontmatter  (id, node_key, category, dimension, source_type, created_at)
//   - A title heading
//   - A description paragraph
//   - A ## Connections section listing [[wikilinks]] to neighbour nodes
//     with the edge relation and confidence label inline
//
// Auth: requires x-graph-write-secret header (same secret as POST /api/graph)
//       so the export is not publicly accessible.
//
// Response:
//   200  application/zip  — vault.zip
//   401  { success: false, error: 'Unauthorized' }
//   500  { success: false, error: '...' }

import { NextRequest, NextResponse } from 'next/server';
import { getFullGraph } from '@/lib/graph';
import type { GraphNode, GraphEdge } from '@/lib/graph';

const GRAPH_WRITE_SECRET = process.env.GRAPH_WRITE_SECRET;

// ─── Markdown builder ────────────────────────────────────────────────────────

function buildFrontmatter(node: GraphNode): string {
  const lines = [
    '---',
    `id: "${node.id ?? ''}"`,
    `node_key: "${node.node_key}"`,
    `label: "${node.label.replace(/"/g, "'")}"`,
    `category: ${node.category}`,
    node.dimension  ? `dimension: ${node.dimension}`    : null,
    `source_type: ${node.source_type}`,
    node.source_id  ? `source_id: "${node.source_id}"`  : null,
    `tags: [bibledesk, ${node.category}${node.dimension ? ', ' + node.dimension : ''}]`,
    '---',
  ].filter(Boolean);
  return lines.join('\n');
}

function buildNoteBody(
  node:      GraphNode,
  edges:     GraphEdge[],
  nodeById:  Map<string, GraphNode>,
): string {
  const sections: string[] = [];

  sections.push(`# ${node.label}\n`);

  if (node.description) {
    sections.push(`${node.description}\n`);
  }

  // ── Connections ────────────────────────────────────────────────────────────
  const outgoing = edges.filter((e) => e.source_id === node.id);
  const incoming = edges.filter((e) => e.target_id === node.id);

  if (outgoing.length > 0 || incoming.length > 0) {
    sections.push(`## Connections\n`);

    if (outgoing.length > 0) {
      sections.push(`### References\n`);
      for (const e of outgoing) {
        const target = nodeById.get(e.target_id);
        if (!target) continue;
        const conf = e.confidence === 'EXTRACTED' ? '' : ` *(${e.confidence.toLowerCase()})*`;
        sections.push(`- [[${target.node_key}|${target.label}]] — ${e.relation}${conf}`);
      }
      sections.push('');
    }

    if (incoming.length > 0) {
      sections.push(`### Referenced by\n`);
      for (const e of incoming) {
        const source = nodeById.get(e.source_id);
        if (!source) continue;
        const conf = e.confidence === 'EXTRACTED' ? '' : ` *(${e.confidence.toLowerCase()})*`;
        sections.push(`- [[${source.node_key}|${source.label}]] — ${e.relation}${conf}`);
      }
      sections.push('');
    }
  }

  // ── Metadata footer ────────────────────────────────────────────────────────
  sections.push(`---\n*BibleDesk node · category: ${node.category}${node.dimension ? ' · ' + node.dimension : ''}*\n`);

  return sections.join('\n');
}

// ─── Minimal ZIP builder (no external deps) ──────────────────────────────────
// Produces a valid PKZIP archive using only the Node.js built-in zlib module.
// Each file is stored with DEFLATE compression via the built-in zlib.

import { deflateRawSync } from 'zlib';

function crc32(buf: Buffer): number {
  const table = CRC32_TABLE;
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function uint16LE(n: number): Buffer {
  const b = Buffer.allocUnsafe(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function uint32LE(n: number): Buffer {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

interface ZipEntry {
  name:       string;
  data:       Buffer;
  compressed: Buffer;
  crc:        number;
  offset:     number;
}

function buildZip(files: { name: string; content: string }[]): Buffer {
  const entries: ZipEntry[] = [];
  const localHeaders: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const data       = Buffer.from(f.content, 'utf8');
    const compressed = deflateRawSync(data, { level: 6 });
    const crc        = crc32(data);
    const nameBytes  = Buffer.from(f.name, 'utf8');

    // Local file header
    const localHeader = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),  // signature
      uint16LE(20),                            // version needed
      uint16LE(0x0800),                        // flags: UTF-8
      uint16LE(8),                             // compression: DEFLATE
      uint16LE(0), uint16LE(0),                // mod time/date
      uint32LE(crc),
      uint32LE(compressed.length),
      uint32LE(data.length),
      uint16LE(nameBytes.length),
      uint16LE(0),                             // extra field length
      nameBytes,
    ]);

    entries.push({ name: f.name, data, compressed, crc, offset });
    localHeaders.push(Buffer.concat([localHeader, compressed]));
    offset += localHeader.length + compressed.length;
  }

  // Central directory
  const centralDir: Buffer[] = [];
  for (const e of entries) {
    const nameBytes = Buffer.from(e.name, 'utf8');
    centralDir.push(Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),  // signature
      uint16LE(20), uint16LE(20),              // version made by / needed
      uint16LE(0x0800),                        // flags
      uint16LE(8),                             // DEFLATE
      uint16LE(0), uint16LE(0),                // mod time/date
      uint32LE(e.crc),
      uint32LE(e.compressed.length),
      uint32LE(e.data.length),
      uint16LE(nameBytes.length),
      uint16LE(0), uint16LE(0),                // extra, comment
      uint16LE(0), uint16LE(0),                // disk start, int attrs
      uint32LE(0),                             // ext attrs
      uint32LE(e.offset),
      nameBytes,
    ]));
  }

  const cdBuf = Buffer.concat(centralDir);
  const cdOffset = offset;

  // End of central directory record
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    uint16LE(0), uint16LE(0),
    uint16LE(entries.length), uint16LE(entries.length),
    uint32LE(cdBuf.length),
    uint32LE(cdOffset),
    uint16LE(0),
  ]);

  return Buffer.concat([...localHeaders, cdBuf, eocd]);
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-graph-write-secret');
  if (!GRAPH_WRITE_SECRET || authHeader !== GRAPH_WRITE_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const { nodes, edges } = await getFullGraph();
    const nodeById = new Map(nodes.map((n) => [n.id!, n]));

    const files: { name: string; content: string }[] = [
      {
        name:    'README.md',
        content: [
          '# BibleDesk Knowledge Vault',
          '',
          'This vault was exported from BibleDesk.',
          'Open in [Obsidian](https://obsidian.md) for full graph exploration.',
          '',
          `Exported: ${new Date().toISOString()}`,
          `Nodes: ${nodes.length} · Edges: ${edges.length}`,
          '',
          '## Structure',
          '- Each `.md` file is a concept, verse, doctrine, question, or theme.',
          '- `[[wikilinks]]` connect related nodes.',
          '- Use Obsidian Graph View to visualise the full network.',
        ].join('\n'),
      },
    ];

    for (const node of nodes) {
      const folder   = node.category;
      const filename = `${folder}/${node.node_key}.md`;
      const fm       = buildFrontmatter(node);
      const body     = buildNoteBody(node, edges, nodeById);
      files.push({ name: filename, content: `${fm}\n\n${body}` });
    }

    const zip = buildZip(files);
    const timestamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type':        'application/zip',
        'Content-Disposition': `attachment; filename="bibledesk-vault-${timestamp}.zip"`,
        'Content-Length':      String(zip.length),
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[export/obsidian] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Export failed.', code: 'EXPORT_FAILED' },
      { status: 500 }
    );
  }
}
