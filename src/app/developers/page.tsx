'use client';

import { useState } from 'react';
import {
  Code,
  Terminal,
  Cpu,
  GitBranch,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Network,
  Heart,
  Church,
  Shield,
  Layers,
} from 'lucide-react';
import styles from './page.module.css';

type DevTab = 'sdk' | 'rest' | 'mcp' | 'contribute';

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState<DevTab>('sdk');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const SDK_CODE_SNIPPET = `import { createBibleDeskClient } from '@bibledesk/sdk';

// Initialize isomorphic client (no key needed for public domain Scripture & lexicons)
const bibledesk = createBibleDeskClient({
  baseUrl: 'https://bibledesk.org',
});

// 1. Read Chapter Text (KJV, ASV, WEB, BBE, Darby, YLT)
const passage = await bibledesk.bible.getChapter({
  book: 'John',
  chapter: 3,
  translation: 'web',
});
console.log(passage.reference, passage.verses[15].text);

// 2. Strong's Greek / Hebrew Lexicon Lookup
const greekWord = await bibledesk.bible.getLexicon({ strongs: 'G2889' }); // Kosmos
console.log(greekWord.lemma, greekWord.definition);

// 3. Query Biblical Concept Knowledge Graph
const graphData = await bibledesk.graph.query({ node: 'grace' });
console.log(graphData.nodes, graphData.edges);

// 4. Church Prayer Chain Escalation
await bibledesk.prayer.escalate({
  prayerId: 'prayer-uuid-123',
  targetLevel: 'church',
  urgencyLevel: 'urgent',
  isAnonymous: false,
});`;

  const MCP_CLAUDE_CONFIG = `{
  "mcpServers": {
    "bibledesk": {
      "command": "npx",
      "args": ["-y", "@bibledesk/mcp-server"],
      "env": {
        "BIBLEDESK_URL": "https://bibledesk.org"
      }
    }
  }
}`;

  const MCP_CURSOR_CONFIG = `{
  "mcpServers": {
    "bibledesk": {
      "url": "https://bibledesk.org/api/mcp"
    }
  }
}`;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.badge}>
          <Terminal size={14} />
          <span>Developer Ecosystem &amp; Model Context Protocol</span>
        </div>
        <h1 className={styles.title}>BibleDesk Developer Platform</h1>
        <p className={styles.subtitle}>
          Build Christian applications, AI agents, church integrations, and research workflows with our open
          REST APIs, TypeScript SDK, and standard Model Context Protocol (MCP) server.
        </p>

        {/* Tab switcher */}
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'sdk' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('sdk')}
          >
            <Code size={16} />
            <span>TypeScript SDK</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'rest' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('rest')}
          >
            <Layers size={16} />
            <span>REST API Reference</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'mcp' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('mcp')}
          >
            <Cpu size={16} />
            <span>Model Context Protocol (MCP)</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'contribute' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('contribute')}
          >
            <GitBranch size={16} />
            <span>Open Source &amp; Contribute</span>
          </button>
        </div>
      </header>

      {/* ── TAB 1: TypeScript SDK ── */}
      {activeTab === 'sdk' && (
        <section className={styles.section} aria-label="TypeScript SDK Quickstart">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                <Code size={22} color="#b58414" />
                <span>Official Isomorphic TypeScript / JS SDK</span>
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: '#685e4c', fontSize: '0.92rem' }}>
                Zero-config client library works in browser environments, Node.js backends, Next.js server actions, and Cloudflare Workers.
              </p>
            </div>
            <a
              href="https://github.com/ShadowWalkerNC/BibleDesk"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.linkBtn}
            >
              <span>View Source on GitHub</span>
              <ExternalLink size={14} />
            </a>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.5rem 0 0.5rem', color: '#1e1913' }}>
            1. Installation
          </h3>
          <div className={styles.codeBlock}>
            <pre className={styles.codePre}>npm install @bibledesk/sdk</pre>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copyCode('npm install @bibledesk/sdk', 'install')}
            >
              {copiedKey === 'install' ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              <span>{copiedKey === 'install' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.75rem 0 0.5rem', color: '#1e1913' }}>
            2. Quickstart Usage
          </h3>
          <div className={styles.codeBlock}>
            <pre className={styles.codePre}>{SDK_CODE_SNIPPET}</pre>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copyCode(SDK_CODE_SNIPPET, 'sdk-sample')}
            >
              {copiedKey === 'sdk-sample' ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              <span>{copiedKey === 'sdk-sample' ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </section>
      )}

      {/* ── TAB 2: REST API Reference ── */}
      {activeTab === 'rest' && (
        <section className={styles.section} aria-label="REST API Reference">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                <Layers size={22} color="#b58414" />
                <span>Open REST API Endpoints</span>
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: '#685e4c', fontSize: '0.92rem' }}>
                Standard JSON endpoints with CORS enabled for all legitimate web apps.
              </p>
            </div>
          </div>

          <div className={styles.endpointGrid}>
            <div className={styles.endpointCard}>
              <div className={styles.endpointHeader}>
                <span className={styles.methodGet}>GET</span>
                <span className={styles.endpointPath}>/api/bible/chapter</span>
              </div>
              <p className={styles.endpointDesc}>
                Fetch an entire chapter with verses, book metadata, and translation notes. Supported translations: <code>web</code>, <code>kjv</code>, <code>asv</code>, <code>bbe</code>, <code>darby</code>, <code>ylt</code>.
              </p>
              <div className={styles.codeBlock} style={{ margin: 0 }}>
                <pre className={styles.codePre}>curl "https://bibledesk.org/api/bible/chapter?book=John&amp;chapter=3&amp;translation=web"</pre>
              </div>
            </div>

            <div className={styles.endpointCard}>
              <div className={styles.endpointHeader}>
                <span className={styles.methodGet}>GET</span>
                <span className={styles.endpointPath}>/api/bible/search</span>
              </div>
              <p className={styles.endpointDesc}>
                High-performance full-text search across all 31,102 verses of the Bible.
              </p>
              <div className={styles.codeBlock} style={{ margin: 0 }}>
                <pre className={styles.codePre}>curl "https://bibledesk.org/api/bible/search?q=grace&amp;translation=kjv&amp;limit=10"</pre>
              </div>
            </div>

            <div className={styles.endpointCard}>
              <div className={styles.endpointHeader}>
                <span className={styles.methodGet}>GET</span>
                <span className={styles.endpointPath}>/api/bible/lexicon</span>
              </div>
              <p className={styles.endpointDesc}>
                Retrieve OpenScriptures Strong's Greek (5,523 words) or Hebrew (8,674 words) lexical roots, morphology, and transliterations.
              </p>
              <div className={styles.codeBlock} style={{ margin: 0 }}>
                <pre className={styles.codePre}>curl "https://bibledesk.org/api/bible/lexicon?strongs=G2889"</pre>
              </div>
            </div>

            <div className={styles.endpointCard}>
              <div className={styles.endpointHeader}>
                <span className={styles.methodGet}>GET</span>
                <span className={styles.endpointPath}>/api/graph</span>
              </div>
              <p className={styles.endpointDesc}>
                Query the bidirectional Biblical Knowledge Graph connecting scripture verses, theological themes, and TSK cross-references.
              </p>
              <div className={styles.codeBlock} style={{ margin: 0 }}>
                <pre className={styles.codePre}>curl "https://bibledesk.org/api/graph?node=grace"</pre>
              </div>
            </div>

            <div className={styles.endpointCard}>
              <div className={styles.endpointHeader}>
                <span className={styles.methodPost}>POST</span>
                <span className={styles.endpointPath}>/api/prayer/escalate</span>
              </div>
              <p className={styles.endpointDesc}>
                Escalate a prayer request up the 4-tier privacy ladder (Private $\rightarrow$ Circle $\rightarrow$ Church $\rightarrow$ Global Atlas).
              </p>
              <div className={styles.codeBlock} style={{ margin: 0 }}>
                <pre className={styles.codePre}>
                  {`curl -X POST "https://bibledesk.org/api/prayer/escalate" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "prayerId": "id-123", "targetLevel": "church", "urgencyLevel": "urgent" }'`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 3: Model Context Protocol (MCP) ── */}
      {activeTab === 'mcp' && (
        <section className={styles.section} aria-label="Model Context Protocol Guide">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                <Cpu size={22} color="#b58414" />
                <span>Connect External AI Agents via MCP</span>
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: '#685e4c', fontSize: '0.92rem' }}>
                Connect Claude Desktop, Cursor, Windsurf, LangChain, or custom autonomous agents to BibleDesk's tools using the standard Model Context Protocol.
              </p>
            </div>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.5rem 0 0.5rem', color: '#1e1913' }}>
            Claude Desktop Setup (claude_desktop_config.json)
          </h3>
          <div className={styles.codeBlock}>
            <pre className={styles.codePre}>{MCP_CLAUDE_CONFIG}</pre>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copyCode(MCP_CLAUDE_CONFIG, 'claude-mcp')}
            >
              {copiedKey === 'claude-mcp' ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              <span>{copiedKey === 'claude-mcp' ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '1.75rem 0 0.5rem', color: '#1e1913' }}>
            Cursor &amp; Windsurf Setup (.cursor/mcp.json)
          </h3>
          <div className={styles.codeBlock}>
            <pre className={styles.codePre}>{MCP_CURSOR_CONFIG}</pre>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copyCode(MCP_CURSOR_CONFIG, 'cursor-mcp')}
            >
              {copiedKey === 'cursor-mcp' ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              <span>{copiedKey === 'cursor-mcp' ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          <div style={{ marginTop: '1.5rem', background: '#fbf9f4', borderLeft: '3px solid #b58414', padding: '1rem 1.25rem', borderRadius: '0 10px 10px 0', fontSize: '0.9rem', color: '#574c38', lineHeight: 1.55 }}>
            ✦ <strong>Exposed MCP Tools:</strong> <code>lookup_passage</code>, <code>search_bible</code>, <code>lookup_strongs</code>, <code>get_daily_verse</code>, <code>query_knowledge_graph</code>, and <code>list_community_prayers</code>.
          </div>
        </section>
      )}

      {/* ── TAB 4: Open Source & Contributing ── */}
      {activeTab === 'contribute' && (
        <section className={styles.section} aria-label="Open Source Guidelines">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                <GitBranch size={22} color="#b58414" />
                <span>Open Source &amp; Community Contributions</span>
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: '#685e4c', fontSize: '0.92rem' }}>
                BibleDesk is 100% open-source under the MIT license. Join scholars, developers, and pastors building the future of digital Scripture study.
              </p>
            </div>
          </div>

          <div className={styles.cardGrid}>
            <div className={styles.guideCard}>
              <div>
                <h3 className={styles.guideTitle}>1. Ingest Bible Translations</h3>
                <p className={styles.guideText}>
                  Help us package additional public-domain and open-license Bible translations (Spanish, French, Portuguese, Tagalog, Swahili) into our static JSON module format.
                </p>
              </div>
              <a
                href="https://github.com/ShadowWalkerNC/BibleDesk/blob/main/docs/TRANSLATIONS.md"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkBtn}
              >
                <span>Read Translation Guide</span>
                <ExternalLink size={14} />
              </a>
            </div>

            <div className={styles.guideCard}>
              <div>
                <h3 className={styles.guideTitle}>2. Lexicon &amp; Grammar Corrections</h3>
                <p className={styles.guideText}>
                  Contribute corrections to Strong’s definitions, Greek/Hebrew morphology tags, and Treasury of Scripture Knowledge (TSK) cross-reference links.
                </p>
              </div>
              <a
                href="https://github.com/ShadowWalkerNC/BibleDesk/issues"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkBtn}
              >
                <span>Submit Lexicon Issues</span>
                <ExternalLink size={14} />
              </a>
            </div>

            <div className={styles.guideCard}>
              <div>
                <h3 className={styles.guideTitle}>3. Church Embed Widgets</h3>
                <p className={styles.guideText}>
                  Build plugins and embed packages for church platforms like Subsplash, Church Community Builder, Planning Center, and WordPress.
                </p>
              </div>
              <a
                href="https://github.com/ShadowWalkerNC/BibleDesk/pulls"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkBtn}
              >
                <span>Open a Pull Request</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
