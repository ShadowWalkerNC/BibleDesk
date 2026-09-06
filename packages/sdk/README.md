# @bibledesk/sdk

Official isomorphic TypeScript/JavaScript client library for [BibleDesk](https://bible-desk.vercel.app) — the open-source, local-first Bible platform and Model Context Protocol (MCP) engine.

Zero API keys or authentication required for public domain Scripture reading, concordance search, and Strong's lexicons.

---

## Installation

```bash
npm install @bibledesk/sdk
# or
pnpm add @bibledesk/sdk
# or
yarn add @bibledesk/sdk
```

---

## Quickstart

```typescript
import { createBibleDeskClient } from '@bibledesk/sdk';

// Initialize client (defaults to https://bible-desk.vercel.app)
const bibledesk = createBibleDeskClient();

// 1. Read Chapter Text (KJV, ASV, WEB, BBE, Darby, YLT)
const chapter = await bibledesk.bible.getChapter({
  book: 'John',
  chapter: 3,
  translation: 'web',
});
console.log(chapter.reference);
console.log(chapter.verses[15].text); // "For God so loved the world..."

// 2. Strong's Greek / Hebrew Lexicon Lookup
const greekWord = await bibledesk.bible.getLexicon({ strongs: 'G2889' }); // Kosmos
console.log(greekWord.lemma, greekWord.transliteration, greekWord.definition);

// 3. Concordance Search
const results = await bibledesk.bible.search({
  query: 'light',
  translation: 'kjv',
  limit: 10,
});
console.log(results.matches);

// 4. Query Biblical Concept Knowledge Graph
const graph = await bibledesk.graph.query({ node: 'grace' });
console.log(graph.nodes, graph.edges);

// 5. Submit or Escalate Prayer Petition
await bibledesk.prayer.escalate({
  prayerId: 'prayer-uuid-123',
  targetLevel: 'church',
  urgencyLevel: 'urgent',
  isAnonymous: false,
});
```

---

## Model Context Protocol (MCP) Configuration

Generate setup configuration for AI agents:

```typescript
const claudeConfig = bibledesk.mcp.getSetupConfig('claude');
console.log(claudeConfig);
```

Or configure directly in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bibledesk": {
      "command": "npx",
      "args": ["-y", "@bibledesk/mcp-server"],
      "env": {
        "BIBLEDESK_URL": "https://bible-desk.vercel.app"
      }
    }
  }
}
```

---

## License

MIT © [BibleDesk Contributors](https://github.com/ShadowWalkerNC/BibleDesk)
