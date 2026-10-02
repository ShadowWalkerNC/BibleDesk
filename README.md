# BibleDesk ✦

**Open-source, local-first Bible study platform, Open REST API, and Model Context Protocol (MCP) engine.**

BibleDesk provides a completely free, open-source foundation for Scripture study with 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT), Strong's Greek & Hebrew lexicons, Treasury of Scripture Knowledge (TSK) cross-references, and a bidirectional Biblical Knowledge Graph.

The bundled Strong's dictionaries are real source data and accept direct number lookups. The current Bible modules do not yet contain word-by-word Greek/Hebrew tagging, so BibleDesk does not claim that an English word click identifies its underlying lemma. A properly licensed, attributed, verse-level source corpus is required before that interaction returns.

Use BibleDesk as a web app or installed PWA, or consume its **Open REST API & MCP Server** from external tools. Native desktop, Android, and Chrome extension shells are preserved under `archive/` and are not current releases. Scripture reading and local study data need no paid subscription; AI features require host configuration or a user-provided Gemini key.

---

## Current Status (2026-09-19)

| | |
|---|---|
| **Active phase** | **Phase 0 — Local-first Bible foundation** |
| **What exists in code** | Centralized Study Desk workspace (`/bible`) with 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT) for offline reading/search; Strong's Greek & Hebrew lexicons; TSK cross-references; optional 5-dimension AI study assistant; consent-based public Prayer Atlas; local private prayer commitments; authenticated Prayer Care with ICS, Google Calendar export, and reviewed Gmail draft creation; multi-tradition study resources; TypeScript SDK; REST API, MCP server, Stripe Customer Portal, and Obsidian vault exporter. |
| **MVP scope (2026-09-12)** | Discord & WhatsApp bots deleted; worship radio dock, graph explorer UI, and download storefront cut; sermons, church suite, and creators hub archived under `archive/`; native shells (Android/Electron/Chrome extension) parked under `archive/` — build from source, not offered as downloads. |
| **Bible data** | Fully local static public domain modules with zero network requirement for reading/search |
| **Open APIs & MCP** | Exposes `/api/mcp`, `/api/bible/search`, `/api/bible/chapter`, `/api/bible/lexicon`, `/api/cross-references`, `/api/commentary`, `/api/research`, `/api/notes`, `/api/collections`, `/api/search`, `/api/graph`, `/api/prayer`, `/api/daily`, `/api/export/obsidian`, `/api/billing/portal` |
| **Deploy & Build** | Next.js 16.3.5 production build, TypeScript typecheck, 32 automated tests (unit, database, API, and E2E critical path), environment doctor, and production dependency audit pass. |
| **Database & ORM** | PostgreSQL with Drizzle ORM. Dual-mode support: zero-config embedded PostgreSQL via WASM PGlite or external PostgreSQL connection string (`DATABASE_URL`). |
| **Source of truth** | [TODO.md](TODO.md) for work · [ARCHITECTURE.md](ARCHITECTURE.md) for system design · [DEPLOYMENT.md](DEPLOYMENT.md) for deployment · [OPS_REPORT.md](OPS_REPORT.md) for ops audit · [AGENTS.md](AGENTS.md) for agent rules |

---

## Core Pillars & Philosophy

### 1. Open Source & Zero-Paywall Bible Foundation
All primary Scripture reading, concordance keyword search, Strong's Greek/Hebrew lexical definitions, Treasury of Scripture Knowledge (TSK) cross-references, and concept navigation run **free** — with no paid API keys or closed cloud dependencies required. Stored and queryable directly in PostgreSQL via Drizzle ORM.

### 2. Evidence-Based 5-Dimension Research Assistant
When investigating difficult passages, claims, or interpretations, BibleDesk applies a rigorous, multi-factor confidence rating ($w_1=0.30$ Scripture, $w_2=0.20$ Original Language, $w_3=0.20$ Historical Setting, $w_4=0.15$ Theology, $w_5=0.15$ Traceability):
- 🔍 **Research Assistant (`/research` & `/bible` Tab)**: Backed by Anthropic Claude 3.5 Sonnet with web search tool capabilities. Formats findings across all 5 dimensions with real, clickable citations and transparent confidence derivation.
- 💾 **Personal Notes & Collections**: Organize insights with tagged personal study notes (`/api/notes`) and thematic study collections (`/api/collections`).
- 🔎 **Unified Full-Text Search (`/api/search`)**: Query scripture verses, 5-dimension commentary records, and personal study notes in one request.

### 3. Use BibleDesk as an Open API & MCP Server
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
  - `GET /api/cross-references?reference=John 1:1`
  - `GET /api/commentary?reference=John 1:1`
  - `POST /api/research` (Anthropic web-search grounded research)
  - `GET|POST|DELETE /api/notes` (Personal study notes)
  - `GET|POST /api/collections` (Thematic study collections)
  - `GET /api/search?q=beginning&type=all` (Unified search)
  - `GET /api/bible/search?query=light&translation=kjv`
  - `GET /api/bible/lexicon?strongs=G2889`
  - `GET /api/graph?nodeKey=grace`
  - `GET /api/daily`
- **Included 5D AI Study Assistant**: Users who sign in receive automatic access to the server-hosted Google Gemini assistant (`gemini-2.5-flash`, 5 free questions/day, then BYOK for unlimited) with zero API key configuration. Guests can also supply their own free Gemini key (BYOK).
- **Prayer Care**: Local private commitments support recurring rhythms and gratitude tracking. With Railway PostgreSQL (`DATABASE_URL`) and direct BibleDesk Google OAuth configured, signed-in users can export ICS/Calendar events and create an editable Gmail draft after explicit review. BibleDesk does not send Gmail messages automatically.

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

### Multi-Device Responsive Architecture
- **Desktop ($\ge 1024\text{px}$)**: Primary administrative workspace and scholarly research hub. Full-featured dashboards, bulk actions, system configuration, 3-column Study Desk workspace, and comprehensive prayer CRM.
- **Tablet ($768\text{px} - 1023\text{px}$)**: Adaptive touch oversight. 56px compact sidebar rail with slide-over drawer, 2-pane reader layout with 65–75ch reading line length, touch targets $\ge 48\text{px}$, and segmented controls.
- **Mobile Phone ($< 768\text{px}$)**: Fast operational day-to-day engine. Ergonomic thumb-zone bottom navigation rail, distraction-free reading canvas, Rapid Triage card deck in Moderation, and "Today's Prayers" checklist with 1-tap WhatsApp care sharing. Safe-area insets (`env(safe-area-inset-bottom)`) prevent UI clipping.

| Platform | Location / Artifact | Key Capabilities |
|---|---|---|
| **Web** | Root Web App (`/`) | Zero-install browser access. |
| **PWA** | `/download` | Install BibleDesk straight from Chrome, Safari, Edge, or Firefox — no downloads needed. |
| **Desktop App (Electron)** | `archive/desktop/` | Parked for the MVP — build from source yourself; no hosted installers offered. |
| **Android App (Capacitor)** | `archive/android/` | Parked for the MVP — build from source yourself; no APK downloads offered. |
| **Chrome Extension (MV3)** | `archive/extension/` | Parked for the MVP — build from source yourself. |
| **WhatsApp Sharing** | wa.me links | 1-click formatted verse/encouragement forwarder for small groups (no server bot). |
| **Obsidian Vault Exporter** | `/api/export/obsidian` | Generates structured Markdown vaults with `[[wikilinks]]` combining theological knowledge graph and personal verse notes into a downloadable `.zip`. |
| **Printable Study Sheets** | `/bible` (Study Sheet) | Formatted chapter study guides with cross-references, Strong's lexical notes, and print-ready CSS layout. |
| **System Diagnostics & Recovery** | `/system` | In-app health verification of 6 Bible translations, database, lexicons, AI engine, 1-click safe repairs, and complete JSON backup/restore. |

---

### Turnkey Reliability & Disaster Recovery

BibleDesk is engineered for non-technical users, pastors, and study leaders to operate with commercial confidence:
- 🚀 **Guided First-Run Onboarding**: 4-step wizard with sensible defaults, optional starter workspace pre-loading, and real-time Gemini API key validation with plain-language feedback.
- 🩺 **In-App Health & Diagnostics (`/system`)**: Real-time health cards verifying all 6 Scripture modules, PostgreSQL/PGlite connection and row counts, Strong's Greek/Hebrew lexicons, TSK cross-references, AI service readiness, and sync state.
- 🛠️ **1-Click Safe Repairs**: Single-click maintenance actions (`POST /api/system/repair`) to seed starter study notes and collections, verify database tables and indices, and ping AI connectivity.
- 💾 **Universal JSON Backup & Restore**: Export full workspace state (`bibledesk-complete-backup-[date].json`) bundling database notes and collections with browser storage (local prayer commitments, highlights, reading plan progress). Restores safely via a preview confirmation modal.
- 💬 **Commercial-Grade Plain Language**: Clear, action-oriented button copy ("Record Verification Vote", "Promote Answer to Canonical", "Investigate Question", "Save to Study Notes") and purposeful empty states that guide users on next steps.

## Turnkey Quick Start (1-Click Launchers)

BibleDesk provides out-of-the-box 1-click launchers that verify dependencies and launch immediately:

- **Windows**: Double-click `Launch-BibleDesk.bat` (or run `.\Launch-BibleDesk.ps1` in PowerShell).
- **macOS / Linux**: Run `./Launch-BibleDesk.sh`.
- **Docker**: Run `docker compose up -d` for an instant self-hosted production container.

---

## Developer Quick Start (CLI)

```bash
# 1. Clone repository
git clone https://github.com/ShadowWalkerNC/BibleDesk.git
cd BibleDesk

# 2. Install dependencies
npm install

# 3. Run Environment Doctor
npm run check:env

# 4. Start local development server
npm run dev
```

Visit `http://localhost:3000` to open the Study Desk.

---

## Production Deployment & Database Setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions:
- **Database Migrations**: [`drizzle/`](drizzle/) holds the versioned Drizzle migrations (`0000` + `0001_railway-migration`, 35 tables), applied automatically by the Docker CMD via `drizzle-kit migrate`, or manually with `npm run db:migrate`.
- **Railway**: 1-click deployment via `railway.json` and production `Dockerfile` (healthcheck `/api/health`, dynamic `$PORT` handling, unified Next.js API & web server).
- **Docker**: Production-ready multi-stage container (`Dockerfile` & `docker-compose.yml`).
- **Vercel**: Deploy with canonical HTTPS `NEXT_PUBLIC_APP_URL`.

---

## SaaS Membership & Open-Source Self-Hosting

BibleDesk balances open-source Kingdom stewardship with sustainable SaaS operations:

1. **100% Free & Open-Source Core**:
   - Bundled public-domain Bibles (KJV, ASV, WEB, BBE, Darby, YLT), Strong's lexicons, TSK cross-references, and local notes are **never paywalled**.
   - Unlimited AI queries with your own free Google Gemini API key (BYOK).
2. **Pro & Ministry SaaS Tiers** (`/pricing`):
   - For users who prefer a turnkey cloud experience without managing API keys or infrastructure.
   - Includes hosted AI quotas (250–1,000 answers/day), real-time cloud sync for verse notes, 1-click Obsidian Markdown vault (.zip) downloads, and printable PDF study guides.
   - Self-service billing via Stripe Customer Portal (`POST /api/billing/portal`).
3. **Open Self-Hosting Guarantee**:
   - Churches, ministries, and self-hosters running their own instances can set `NEXT_PUBLIC_SELF_HOSTED=true` (enabled by default in `docker-compose.yml`) to unlock all Pro capabilities for their community without any subscription or Stripe account.

---

## License

BibleDesk is free and open-source software licensed under the **MIT License**. All bundled Bible texts (KJV, ASV, WEB, BBE, Darby, YLT) and Strong's Lexicons are in the **Public Domain**.
