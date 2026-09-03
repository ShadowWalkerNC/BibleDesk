# BibleDesk ✦

**Open-source, local-first Bible study platform, Open REST API, and Model Context Protocol (MCP) engine.**

BibleDesk provides a completely free, open-source foundation for Scripture study with 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT), Strong's Greek & Hebrew lexicons, Treasury of Scripture Knowledge (TSK) cross-references, and a bidirectional Biblical Knowledge Graph.

The entire app is designed so anyone can use BibleDesk directly as a standalone web/desktop/mobile app or consume it as an **Open REST API & MCP Server** for external AI agents (Claude Code, Cursor, Windsurf, LangChain, custom agents) — **no closed AI subscriptions or mandatory API keys required**.

---

## Current Status (2026-08-30)

| | |
|---|---|
| **Active phase** | **Phase 0 — Local-First Bible Foundation & Open Multi-Platform Suite** |
| **What exists in code** | Centralized 3-Column Study Desk workspace (`/bible`) with dynamic panel expand/collapse & distraction-free reading controls, Jakob's Law mobile UX (thumb-friendly bottom navigation rail, swipeable bottom sheet drawer for all 12 pages/tools, >= 48px touch targets, safe-area inset protection), PrayerAtlas 3D interactive global prayer map (`/prayer`) with country-level privacy & restricted region shields, official cross-platform brand icon assets, Shadcn UI component suite, Three.js & R3F interactive 3D Sacred Halo canvas, Reverent Bible Manuscript parchment theme with Cinzel display typography & Apple Liquid Glass materials, VisionOS 5-dimension segmented control bar, local 6-translation engine (KJV, ASV, WEB, BBE, Darby, YLT), Strong's Greek/Hebrew lexicons, TSK cross-references (29k+ verses), Quick Jump (Ctrl+K), Chrome Extension MV3 side panel, Discord & WhatsApp bots/webhooks, Open MCP server (`/api/mcp`), Open REST APIs, bidirectional Biblical Knowledge Graph, multi-platform build suite (`npm run package:all`), Android APK (`apps/android`), Desktop Electron shell (`apps/desktop`), and dedicated `/download` install hub. |
| **Bible data** | Fully local static public domain modules with zero network requirement for reading/search |
| **Open APIs & MCP** | Exposes `/api/mcp`, `/api/bible/search`, `/api/bible/chapter`, `/api/bible/lexicon`, `/api/graph`, `/api/daily` |
| **Deploy & Build** | Production Next.js 16 build verified across all 33 routes (`0` type errors) |
| **Source of truth** | [TODO.md](TODO.md) for work · [ARCHITECTURE.md](ARCHITECTURE.md) for system design · [OPS_REPORT.md](OPS_REPORT.md) for ops audit · [AGENTS.md](AGENTS.md) for agent rules |

---

## Core Pillars & Philosophy

### 1. Open Source & Zero-Paywall Bible Foundation
All primary Scripture reading, concordance keyword search, Strong's Greek/Hebrew lexical definitions, Treasury of Scripture Knowledge (TSK) cross-references, and concept navigation run **100% offline and free** without requiring any paid API keys or closed cloud dependencies.

### 2. Use BibleDesk as an Open API & MCP Server
BibleDesk is not just a UI; it is an open Bible intelligence engine:
- **Model Context Protocol (MCP)** (`POST /api/mcp`): External agents (Claude Code, Cursor, Windsurf, Sigil) can query BibleDesk tools (`lookup_passage`, `search_bible`, `lookup_strongs`, `get_daily_verse`, `query_knowledge_graph`).
- **Open REST Endpoints**:
  - `GET /api/bible/chapter?book=John&chapter=3&translation=web`
  - `GET /api/bible/search?q=light&translation=kjv`
  - `GET /api/bible/lexicon?strongs=G2889`
  - `GET /api/graph?node=grace`
  - `GET /api/daily`
- **Optional BYOK AI Assistant**: Users who wish to stream synthesized 5-dimension study answers can bring their own free Google Gemini key (`gemini-2.5-flash`) via the sidebar settings.

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

BibleDesk is packaged as a single unified ecosystem installable on any device:

| Platform | Location / Artifact | Key Capabilities |
|---|---|---|
| **Web & PWA** | Root Web App (`/download`) | Zero-install browser access + 1-click Progressive Web App (PWA) installation with offline caching. |
| **Desktop App (Electron)** | `apps/desktop/` | Native Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage`) app with local SQLite storage, Obsidian sync, and local graphify. |
| **Android App (Capacitor)** | `apps/android/` | Offline-ready Android build with touch Greek/Hebrew lexicons, dark parchment reading mode, and direct APK sideloading. |
| **Chrome Extension (MV3)** | `apps/extension/` | Manifest V3 Side Panel companion for reading Scripture and looking up Strong's terms while browsing any webpage. |
| **Discord Bot & Webhooks** | `/api/discord/*` | Ed25519-verified slash commands (`/ask`, `/daily`, `/bible`) and 1-click study embed broadcasting to Discord channels. |
| **WhatsApp Cloud API & Share** | `/api/whatsapp/*` | Meta Cloud API interactive bot (`daily`, `John 3:16`, `ask: ...`) and 1-click formatted chat forwarder for small groups. |
| **Obsidian Vault Exporter** | `/api/export/obsidian` | Generates structured Markdown vaults with `[[wikilinks]]` for local-first personal knowledge management. |

---

## Build & Packaging CLI

Assemble all platform distributions into a single `/dist` artifact folder with one command:

```bash
# Build & package all targets (Web, Desktop, Android, Chrome Extension)
npm run package:all

# Target-specific builds
npm run build:web        # Production Next.js SSR + PWA
npm run build:desktop    # Electron packages
npm run build:android    # Android assets & Capacitor workspace
npm run build:extension  # Pack Chrome extension ZIP
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
