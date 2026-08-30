# BibleDesk — TODO

> **Current phase:** Phase 0 — Local-first Bible foundation (Complete)  
> **Last updated:** 2026-08-25  
> **Single source of truth** for work state. README = product vision. ARCHITECTURE = system design. AGENTS = agent rules.

---

## Status Snapshot

| Area | Reality |
|---|---|
| Product direction | Bible-first study platform; AI is an assistant layer |
| Codebase | Large feature surface already shipped in-repo (reader, AI pipeline, church tools) |
| Bible data | Still depends on **bible-api.com** (online). Local Midvash/OpenScriptures corpus **not** built |
| Original language | Reader “Strong’s / commentary” is **AI-assisted** (Gemini), not lexicon-backed offline data |
| Deploy | **Not live** — Supabase schemas + env vars + host still need production setup |
| Docs | Aligned as of 2026-08-09 (this file / README / ARCHITECTURE / AGENTS) |

**GitHub hygiene:** Close issue [#1 REPO RESET](https://github.com/ShadowWalkerNC/BibleDesk/issues/1) — it describes an empty stub from 2026-06-15 and is obsolete.

---

## 🔴 Deploy Checklist & Production Readiness

- [x] Full local 6-translation engine (KJV, ASV, WEB, BBE, Darby, YLT) with zero network dependency for text
- [x] OpenScriptures Strong's Greek/Hebrew lexicons + Treasury of Scripture Knowledge (TSK) cross-refs engine
- [x] Persistent App Shell & Sidebar navigation (Logos/Obsidian workspace feel, mobile bottom rail)
- [x] Focused Study Start screen (removed marketing hero, 3D canvas weight, and card grids)
- [x] Biblical prose reader typography (superscript verse numbers, generous serif line-height)
- [x] All 29 routes type-checked & verified in Next.js 16 production build (`next build`)
- [x] PWA manifest & Chrome MV3 side panel extension aligned
- [ ] **Deployment Steps (Execute on Vercel / Supabase Host)**:
  - [ ] Create Supabase project & run schemas in order: `schema.sql` → `schema-v2.sql` → `schema-v3.sql` → `schema-v4.sql`
  - [ ] Configure Environment Variables on Host (Vercel):
    - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (server-only)
    - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
    - `NEXT_PUBLIC_APP_URL` (production URL)
    - `IP_HASH_SALT`, `GRAPH_WRITE_SECRET`, `BIBLEDESK_WEBHOOK_SECRET`, `MCP_SECRET`
  - [ ] Trigger deployment build on Vercel & complete smoke tests (Rate limiting, RAG hit headers, share pages)

---

## Phase 0 — Local-first Bible foundation (ACTIVE)

> Goal: App remains useful if AI is unavailable. Scripture reading must not require a live third-party verse API.

### Stage 0A — Data modules
- [x] Define versioned Bible module package format
- [x] Ingest Midvash / public-domain corpora (KJV, ASV, WEB, BBE, Darby, YLT)
- [x] Normalize OSIS identifiers + canon ordering
- [x] Ship installable static modules (or bundled default set)

### Stage 0B — Reader + search (local)
- [x] Local chapter/verse read path (no bible-api.com for installed modules)
- [x] Local full-text search across installed translations
- [x] Translation switcher backed by installed modules
- [x] Side-by-side compare using local text

### Stage 0C — Original language (structured data)
- [x] Integrate OpenScriptures Greek & Hebrew Strong’s dictionaries (5,523 Greek + 8,674 Hebrew)
- [x] Treasury of Scripture Knowledge (TSK) cross references engine (29,336 indexed verses)
- [x] Concordance & lexicon endpoint (`/api/bible/lexicon`)
- [x] Keep Gemini/Claude study as optional assistant overlay only

### Stage 0D — Personal study (local-first)
- [x] Verse notes (localStorage in `/bible`)
- [x] Color highlights (localStorage in `/bible`)
- [x] Bookmarks API + `/bookmarks` page (Supabase; needs auth hardening)
- [ ] Offline-capable notes / highlights / bookmarks with later sync
- [ ] Verse collections
- [ ] Reading progress sync (plans UI exists with built-in plan data)

**Exit criteria:** Install BibleDesk → read + search Scripture offline without bible-api.com.

---

## Already Built (do not re-build)

### AI study core
- [x] Question input + translation selector (`SearchBar`)
- [x] 5-dimension answer display (`DimensionPanel`)
- [x] 6-stage pipeline (`pipeline.ts`) + Claude client
- [x] Streaming ask (`/api/ask/stream` + `useStreamingAsk`)
- [x] Rate limiting (15/hour/IP)
- [x] RAG embeddings via OpenAI `text-embedding-3-small` (`rag.ts`)
- [x] Answer persistence (Supabase)
- [x] Share pages (`/share/[slug]`) + OG metadata
- [x] Rate limit remaining UI (`RateLimitBar`)
- [x] Clipboard toast feedback

### Bible / study surfaces (online / hybrid today)
- [x] `/bible` reader UI (chapter nav, compare, notes, highlights, audio hooks)
- [x] AI study companion for selected verse (`/api/bible/study` via Gemini)
- [x] `/daily`, `/plans`, `/catechism`, `/creeds`, `/memory`
- [x] PWA manifest + icon placeholders (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`)
- [x] `robots.ts` + `sitemap.ts`

### Knowledge graph + desktop
- [x] `schema-v3` graph tables + `src/lib/graph.ts`
- [x] `/api/graph` + `/graph` D3 explorer
- [x] Obsidian zip export (`/api/export/obsidian`)
- [x] Electron desktop wrapper (`apps/desktop/`) + `public/icon.png`

### History, MCP, moderation
- [x] `/history` + `GET /api/history`
- [x] HTTP MCP server (`/api/mcp`) — `get_verse`, `search_scripture`, `get_concept_subgraph`, `get_answer_history`, `get_dimension`, `ask_bible_question`
- [x] Moderation APIs + `/mod` UI
- [x] Login / Supabase Auth wiring (`/login`)

### Church tools
- [x] Prayer board + atlas (`/prayer`, `/api/prayer`)
- [x] Sermon prep workspace (`/sermons`, `/api/sermons`)
- [x] schema-v4 profiles / verse_highlights / verse_notes (SQL ready; apply in Supabase)

---

## Next After Phase 0

### Operations Audit Action Items (2026-08-25)

#### Daily Reader Friction
- [ ] Auto-resume last read book/chapter position on `/bible` (store in `localStorage` & profile)
- [ ] Implement PWA ServiceWorker offline asset & route precaching
- [ ] Dual-write verse highlights & notes (`localStorage` + Supabase sync when authenticated)

#### Pastor & Preacher Friction
- [ ] Enable offline/guest draft fallback in Sermon Workspace (`/sermons`) without hard auth gate
- [ ] Add Markdown (`.md`) and HTML/PDF export options to Sermon Workspace
- [ ] Multi-passage scripture builder in e-Sword sidebar (select & pin multiple references across books)

#### Study Group & Church Friction
- [ ] Add category filters (Healing, Family, Missions, Praise) & Answered Praise toggle to `/prayer`
- [ ] Printable Small Group Study Guide exporter for 5D AI answer pages (`/share/[slug]`)

### MCP gaps
- [x] `get_cross_references(reference)` (via TSK engine)
- [x] `get_strongs_definition(strongsNumber)` (via Strong's Greek/Hebrew lexicons)
- [ ] `find_related_concepts(question)` — pgvector nearest graph nodes
- [ ] `add_graph_node(label, category, description)`
- [ ] `search_canonical_answers` / `store_canonical_answer`
- [ ] `export_vault_zip()` → download URL
- [ ] Local stdio MCP for Electron (`apps/desktop/mcp/server.js`)

### Platform
- [ ] Auth-scoped answer history
- [ ] Youth group simplified UI
- [ ] Church admin dashboard
- [ ] Deep Sigil integration (faith package calls BibleDesk; prayer/sermon sync; `/study` slash command)
- [ ] Stripe freemium tiers
- [ ] Dark/light mode toggle
- [ ] Replace AI Strong’s path with lexicon data (Phase 0C) then demote Gemini study to assistant-only

---

## Tech Debt (accurate)

- [ ] PWA icons are **placeholder** 70-byte PNGs — replace with real designed assets
- [ ] Electron icon is a placeholder — replace before desktop release
- [ ] Turbopack root warning suppressed in `next.config.ts` — may resurface
- [ ] Homepage / docs previously AI-first — product copy reoriented 2026-08-09; keep Bible-first
- [ ] Strong’s / commentary in `/bible` must not be marketed as offline lexicon until Phase 0C ships
- [ ] Footer and marketing must not claim API.Bible (we use bible-api.com + future local modules)

---

## Architecture Decisions Log (ADR)

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-27 | Next.js over Vite SPA | SSR needed for SEO on public answer pages |
| 2026-06-27 | bible-api.com over API.Bible | Free, no key — interim only until local modules |
| 2026-06-27 | Claude Sonnet 4.5 | Best quality/cost for structured JSON answers |
| 2026-06-27 | CSS Modules over Tailwind | Full design system control |
| 2026-06-27 | Lazy-init Supabase client | Prevents build-time failures when env vars missing |
| 2026-06-27 | HMAC for Sigil | Matches Sigil webhook pattern |
| 2026-06-28 | OpenAI embeddings for pgvector RAG | Anthropic has no embeddings API |
| 2026-06-28 | Zero-dep PKZIP for Obsidian export | No extra npm packages |
| 2026-06-28 | HTTP MCP over stdio (web) | Natural for hosted Next.js; mcp-remote bridges Claude Desktop |
| 2026-08-09 | Phase 0 is active north star | Bible-first / local-first; AI stays valuable but secondary |
| 2026-08-09 | Keep existing AI/church features | Do not delete; re-home under assistant/platform layers after foundation |

---

*Updated: 2026-08-09 | See [ARCHITECTURE.md](ARCHITECTURE.md) · [README.md](README.md)*
