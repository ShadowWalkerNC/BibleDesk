# BibleDesk ✦

**Bible-first study platform. AI is an assistant, not the product.**

BibleDesk helps churches, pastors, teachers, and individual readers study Scripture with a real reading foundation — then optionally use AI for explanation, comparison, and teaching help.

---

## Current Status (2026-08-23)

| | |
|---|---|
| **Active phase** | **Phase 0 — Local-first Bible foundation (Complete & Ready for Deploy)** |
| **What exists in code** | Centralized 3-Column Study Desk workspace (`/bible`), local 6-translation engine (KJV, ASV, WEB, BBE, Darby, YLT), Strong's Greek/Hebrew lexicons, TSK cross-references (29k+ verses), Quick Jump (Ctrl+K), Chrome Extension MV3 side panel (Parchment-themed), Lucide SVG icon design system (emoji-free), AI 5-dimension pipeline (+ streaming), RAG, knowledge graph, MCP, history/share, prayer, sermons, plans |
| **Bible data** | Fully local static public domain modules with zero network requirement for reading/search |
| **Deploy** | Production Next.js 16 build verified across all 29 routes (`0` type errors) |
| **Source of truth** | [TODO.md](TODO.md) for work · [ARCHITECTURE.md](ARCHITECTURE.md) for system design · [AGENTS.md](AGENTS.md) for agent rules |

Close stale GitHub issue [#1](https://github.com/ShadowWalkerNC/BibleDesk/issues/1) (obsolete “empty stub / reset” note).

---

## Vision

Someone can open BibleDesk, **read** Scripture, **search**, **compare** translations, study **Hebrew/Greek from real data**, save notes, and keep going **without internet**. The unified **Centralized 3-Column Study Desk** brings the reader, study hub (daily, plans, bookmarks), and 5-dimension AI assistant into one focused workspace.

---

## What’s Built Today

### Study surfaces
- `/bible` — Centralized 3-Column Study Desk (Left Hub: Daily/Plans/Bookmarks, Center: Scripture Reader with TTS & word study, Right: 5D AI, Concordance, Strong's, Cross-Refs & Notes)
- `/daily`, `/plans`, `/catechism`, `/creeds`, `/memory`
- `/bookmarks`, `/history`, `/graph`, `/share/[slug]`
- `apps/extension` — Chrome MV3 side panel extension with full Parchment theme & instant lookup

### AI assistant
- Homepage assistant + `POST /api/ask` / `/api/ask/stream`
- 5 dimensions: Scripture · Historical · Original Language · Theological · Practical Application
- Rate limit: 15 questions/hour/IP
- RAG over canonical answers (OpenAI embeddings + pgvector)

### Platform / network
- Sigil webhook: `POST /api/v1/bible/answer` (HMAC)
- HTTP MCP: `/api/mcp`
- Prayer board, sermon prep, moderation (`/mod`), login
- Electron app under `apps/desktop/`

### Temporary data dependency
| Source | Role | Limitation |
|---|---|---|
| bible-api.com | Current verse fetch | Online-only; not the long-term foundation |
| Gemini (`GEMINI_API_KEY`) | `/bible` study companion | Must not be sold as offline lexicon |
| Claude + OpenAI | Answers + embeddings | Server-only; optional when offline |

---

## Phase 0 Goal

Establish the Bible study foundation. The app should still be valuable if AI endpoints are removed.

| Area | Deliverable |
|---|---|
| Reading | Book/chapter/verse reader from **installed** public-domain modules |
| Search | Local full-text search |
| Compare | Side-by-side installed translations |
| Original language | Strong’s / lemma / morphology from **structured data** |
| Study tools | Notes, highlights, bookmarks, collections (local-first) |
| Offline | Installed modules work without internet |
| AI boundary | Assistant lives inside study views — not as the only product |

See staged roadmap in [TODO.md](TODO.md) (Stages 0A–0D).

---

## Data Sources (Phase 0 target)

### Primary text
| Dataset | Purpose |
|---|---|
| Midvash `bible-data` | Offline corpus (JSON/SQLite, OSIS IDs) |
| KJV / ASV / WEB (public domain) | Default install set |

### Language / lexicon
| Dataset | Purpose |
|---|---|
| OpenScriptures Hebrew Bible | Lemmas + morphology |
| OpenScriptures `strongs` | Strong’s dictionaries |

**Policy:** Do not advertise NIV/ESV/NLT (or other copyrighted editions) without a real license.

---

## Quick Start

```bash
cp .env.example .env.local
# Fill keys documented in .env.example

npm install
npm run dev
```

Apply Supabase SQL in order before enabling persistence/RAG/graph:

1. `supabase/schema.sql`
2. `supabase/schema-v2.sql`
3. `supabase/schema-v3.sql`
4. `supabase/schema-v4.sql`

```bash
npm run build   # production build
npm run lint
```

Desktop (optional):

```bash
npm run desktop:dev
```

---

## Environment Variables

All variables are documented in [`.env.example`](.env.example).

**Server-only (never expose to the browser):**
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GRAPH_WRITE_SECRET`, `IP_HASH_SALT`, `BIBLEDESK_WEBHOOK_SECRET`, `MCP_SECRET`, Discord webhook URLs.

**Public:**
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.

---

## Development Stages

| Stage | Goal | Status |
|---|---|---|
| **0** | Local Bible modules, search, compare | **Active** |
| **1** | Notes, highlights, bookmarks, plans (local-first) | Partial (UI exists; not offline-module-backed) |
| **2** | Lexicon-backed original language | Not started (AI placeholder today) |
| **3** | Offline hardening + sync | Not started |
| **4** | AI assistant grounded in local passage + lexicon | Pipeline exists; needs re-grounding on local data |
| **5** | Platform expansion (share, mod, Discord, SaaS) | Largely prototyped — polish after foundation |

---

## Guardrails

- Do not market features that are not implemented.
- Do not advertise copyrighted translations without licensing.
- Do not depend on AI for original-language claims.
- Do not treat bible-api.com as the permanent product foundation.
- Core study features that claim offline support must work offline.

---

## Working Product Definition

BibleDesk succeeds when someone can open it, read Scripture, search deeply, study Hebrew and Greek roots from real data, save notes, and continue without internet. The AI assistant improves that workflow — it is not mistaken for the workflow itself.

---

*Updated: 2026-08-09 · Repo: [ShadowWalkerNC/BibleDesk](https://github.com/ShadowWalkerNC/BibleDesk)*
