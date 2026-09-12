# BibleDesk ✦

**Open-source, local-first Bible study platform, Open REST API, and Model Context Protocol (MCP) engine.**

BibleDesk provides a completely free, open-source foundation for Scripture study with 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT), Strong's Greek & Hebrew lexicons, Treasury of Scripture Knowledge (TSK) cross-references, and a bidirectional Biblical Knowledge Graph.

The entire app is designed so anyone can use BibleDesk directly as a standalone web/desktop/mobile app or consume it as an **Open REST API & MCP Server** for external AI agents (Claude Code, Cursor, Windsurf, LangChain, custom agents) — **no closed AI subscriptions or mandatory API keys required**.

---

| **Active phase** | **Phase 0 — Local-first Bible foundation & open multi-platform suite (security hardening; release verification pending)** |
| **What exists in code** | Christian Creator & Ministry Hub (`/creators`, `/c/[handle]`, `/@handle`, `schema-v9.sql`) empowering worship leaders, podcast hosts, writers, and Christian artists with reverent link-in-bio pages, embedded YouTube/Spotify media, Scripture of the Season, 0% platform fee direct patronage links (Patreon, BuyMeACoffee, Stripe), ministry prayer requests with 1-click intercession, and discovery directory; Universal Keyword & Cross-Referencing Engine (`src/lib/universalIndexer.ts`) interlinking Greek/Hebrew Strong's lemmas, Scripture passages, Community & Personal Prayers, Sermons, and Catechisms into a bidirectional network; Connected Knowledge Drawer (`ConnectedKnowledgeDrawer.tsx`) embedded in Bible Reader, Sermon Studio, and Prayer Care; Toggleable Multi-Layer Knowledge Graph (`GraphView.tsx`) synthesizing doctrines, verses, concepts, sermons, and prayers; Production share URL canonicalization (`https://bible-desk.vercel.app/share/[slug]`); Gemini API token budget optimizations; Marketing Showcase on `/` with 2 consolidated target pillars (Individual Believers & Discipleship vs Churches, Ministries & Creators) and transparent pricing ($0 for churches forever; $0 free with 5 server AI answers/day or unlimited BYOK; optional $4.99/mo supporter tier); Centralized 3-Column Study Desk workspace (`/bible`); Expanded Doctrinal RAG System (`src/lib/doctrinesData.ts`, `src/lib/rag.ts`) with 8 classical loci of theology; Multi-Tradition Catechisms & Confessions (`/catechism`) covering Westminster, Heidelberg, Luther's Small Catechism, 1689 Baptist, 39 Articles, and Assemblies of God 16 Truths; Live Worship Radio Dock (`LiveRadioPlayer.tsx`) with ambient sacred streams & 1-click K-LOVE/Air1 docks; Church Live Sermon Theatre (`ChurchLivePlayer.tsx`, `/sermons`) with YouTube/Facebook Live embeds; 1-Click ProPresenter 7 Presentation Slide Exporter; Church Ministry Hub (`/church`) with prayer chain, embed widgets, and Planning Center interop; Universal & Inline Slash Commands (`/creator`, `/verse`, `/encourage`, `/pray`, `/strongs`, `/church`, `/sdk`, `/radio`, `/sermon`, `/slides`, `/catechism`); Words of Encouragement Hub (`/encourage`); 4-tier prayer escalation system (Private → Circle → Church → Global Atlas); PrayerAtlas 2D vector global map (`/prayer`); official BibleDesk Client SDK (`src/lib/sdk.ts`, `packages/sdk`); Developer Platform (`/developers`); Jakob's Law mobile UX; local 6-translation engine (KJV, ASV, WEB, BBE, Darby, YLT); Strong's Greek/Hebrew lexicons; TSK cross-references; Quick Jump (Ctrl+K); Chrome Extension MV3 side panel; Discord & WhatsApp bots; Open MCP server (`/api/mcp`); Open REST APIs; bidirectional Biblical Knowledge Graph; multi-platform build suite (`npm run package:all`); Android APK (`apps/android`, Community Beta); Desktop Electron shell (`apps/desktop`); and dedicated `/download` install hub. |
=======
## Current Status (2026-09-12)

| | |
|---|---|
| **Active phase** | **MVP — Local-First Bible Foundation** |
| **What exists in code** | Centralized Study Desk workspace (`/bible`) with 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT) reading fully offline; Strong's Greek & Hebrew lexicons; Treasury of Scripture Knowledge (TSK) cross-references; 5-dimension AI study assistant (5 free server answers/day, unlimited with your own free Gemini key); public prayer board with 2D PrayerAtlas map (auth to post, Atlas shows only consenting rows, every post moderated); personal prayer circle (local-only, `src/lib/prayerCareLocal.ts`); multi-tradition catechisms & confessions with quiz recall; verse memory; words of encouragement hub; official TypeScript SDK (`packages/sdk`); Developer Platform (`/developers`); Open REST API & MCP server (`/api/mcp`, MCP_SECRET required). |
| **MVP scope (2026-09-12)** | Discord & WhatsApp bots deleted; worship radio dock, graph explorer UI, and download storefront cut; sermons, church suite, and creators hub archived under `archive/`; native shells (Android/Electron/Chrome extension) parked under `archive/` — build from source, not offered as downloads. |
>>>>>>> 36c3084028c541dd7e6325bbc5149ca64995adbb
| **Bible data** | Fully local static public domain modules with zero network requirement for reading/search |
| **Open APIs & MCP** | Exposes `/api/mcp`, `/api/bible/search`, `/api/bible/chapter`, `/api/bible/lexicon`, `/api/graph`, `/api/prayer`, `/api/daily` |
| **Deploy & Build** | Production Next.js 16 build verified across all 23 routes (`0` type errors) |
| **Source of truth** | [TODO.md](TODO.md) for work · [ARCHITECTURE.md](ARCHITECTURE.md) for system design · [OPS_REPORT.md](OPS_REPORT.md) for ops audit · [AGENTS.md](AGENTS.md) for agent rules |

---

## Core Pillars & Philosophy

### 1. Open Source & Zero-Paywall Bible Foundation
All primary Scripture reading, concordance keyword search, Strong's Greek/Hebrew lexical definitions, Treasury of Scripture Knowledge (TSK) cross-references, and concept navigation run **free** — with no paid API keys or closed cloud dependencies required.

### 2. Use BibleDesk as an Open API & MCP Server
- **Official Client SDK (`@bibledesk/sdk`)**: Open-source isomorphic TypeScript/JavaScript client library installable via npm (`packages/sdk`) for Node.js, Web, React Native, and autonomous AI agents:
  ```bash
  npm install @bibledesk/sdk
  ```
  ```typescript
  import { createBibleDeskClient } from '@bibledesk/sdk';
  const client = createBibleDeskClient();
  const chapter = await client.bible.getChapter({ book: 'John', chapter: 3 });
  ```
- **Model Context Protocol (MCP)** (`POST /api/mcp`): External agents (Claude Code, Cursor, Windsurf, Sigil) can query BibleDesk tools (`get_verse`, `search_scripture`, `get_cross_references`, `get_strongs_lexicon`, `get_concept_subgraph`, `get_answer_history`, `get_dimension`, `ask_bible_question`).
- **Open REST Endpoints**:
  - `GET /api/bible/chapter?book=John&chapter=3&translation=web`
  - `GET /api/bible/search?query=light&translation=kjv`
  - `GET /api/bible/lexicon?strongs=G2889`
  - `GET /api/graph?nodeKey=grace`
  - `GET /api/daily`
- **Included 5D AI Study Assistant**: Users who sign in receive automatic access to the server-hosted Google Gemini assistant (`gemini-2.5-flash`, 5 free questions/day, then BYOK for unlimited) with zero API key configuration. Guests can also supply their own free Gemini key (BYOK).
- **Pastoral Prayer Care Workflow & Reminders**: Personal prayer circle (local-only, no server sync) with daily/weekly recurrence, browser push reminders, automated email digest (`/api/prayer/digest`), and 1-click follow-up messaging (WhatsApp, Email, SMS, Clipboard).

### 3. Bidirectional Biblical Knowledge Graph
The Concept Graph indexes verses, lexical roots (e.g. `G2889`, `H7225`), TSK cross-references, and theological topics into an open semantic network. Users and external AI agents can traverse this graph to discover linked passages and themes instantly without slow, expensive RAG recalculations.

### 4. Structured 5-Dimension Study Framework
When exploring complex theological questions, BibleDesk structures insights across 5 clear, complementary lenses:
- 📖 **Biblical Foundation**: Primary text, chapter narrative flow, and direct textual evidence.
- 🏛️ **Historical Setting**: Ancient Near East & Greco-Roman era, cultural customs, authorship, and original audience.
- 📜 **Original Languages**: Strong's Greek & Hebrew lemmas, root definitions, morphology, and transliterations.
- ⚖️ **Systematic Theology**: Doctrinal coherence, biblical covenants, and historic church consensus.
- 💡 **Life Application**: Practical modern reflection, spiritual formation, pastoral guidance, and discipleship.

---

## Multi-Platform Distribution Suite

BibleDesk is a web app first — install it as a PWA from your browser (see `/download` for honest install docs).

| Platform | Location / Artifact | Key Capabilities |
|---|---|---|
| **Web** | Root Web App (`/`) | Zero-install browser access. |
| **PWA** | `/download` | Install BibleDesk straight from Chrome, Safari, Edge, or Firefox — no downloads needed. |
| **Desktop App (Electron)** | `archive/desktop/` | Parked for the MVP — build from source yourself; no hosted installers offered. |
| **Android App (Capacitor)** | `archive/android/` | Parked for the MVP — build from source yourself; no APK downloads offered. |
| **Chrome Extension (MV3)** | `archive/extension/` | Parked for the MVP — build from source yourself. |
| **WhatsApp Sharing** | wa.me links | 1-click formatted verse/encouragement forwarder for small groups (no server bot). |
| **Obsidian Vault Exporter** | `/api/export/obsidian` | Generates structured Markdown vaults with `[[wikilinks]]` for local-first personal knowledge management. |

---

## Build & Packaging CLI

Native packaging (Android, desktop, Chrome extension) is parked for the MVP — the npm scripts exit with a pointer to `archive/*/PARKED.md`. Build the web app normally:

```bash
npm run build          # Production Next.js build
```

---

## Quick Start (Development)

```bash
# 1. Clone repository
git clone https://github.com/ShadowWalkerNC/BibleDesk.git
cd BibleDesk

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:3000` to open the Study Desk.

---

## License

BibleDesk is free and open-source software licensed under the **MIT License**. All bundled Bible texts (KJV, ASV, WEB, BBE, Darby, YLT) and Strong's Lexicons are in the **Public Domain**.
