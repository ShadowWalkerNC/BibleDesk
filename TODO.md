# BibleDesk — TODO

> **Current phase:** Phase 2 — Knowledge Graph + RAG pipeline live
> **Last updated:** 2026-06-28
> **Session:** Steps 1-6 complete — schema-v3, graph.ts, /api/graph, GraphView, Obsidian export, Electron desktop

---

## 🔴 Known Gaps (fix before going live)

- [x] **Wire graph writer** — `writeGraphFromAnswer` wired inside `saveAnswer()` in `src/lib/supabase.ts` (non-blocking `.catch()`)
- [x] **Install openai package** — added `openai ^4.100.0` to `package.json` (run `npm install` locally)
- [x] **Add `OPENAI_API_KEY`** — add to `.env.local` and Render project settings *(manual step — key not stored in repo)*
- [x] **Apply schema-v3** — paste `supabase/schema-v3.sql` into Supabase SQL editor (after schema-v2) *(manual step)*
- [x] **Set `GRAPH_WRITE_SECRET`** — `openssl rand -hex 32` → add to env *(manual step)*

> ⚠️ **TODO NEXT SESSION — 4 manual steps still needed before deploy:**
> 1. Run `npm install` locally to lock `openai` into `package-lock.json`
> 2. Add `OPENAI_API_KEY` to `.env.local` and Render env vars
> 3. Apply `supabase/schema-v3.sql` in Supabase SQL editor
> 4. Generate + set `GRAPH_WRITE_SECRET` in Render env vars (`openssl rand -hex 32`)
>
> Once these are done → move on to 🟡 Deploy Blockers below.

---

## 🟡 Deploy Blockers (must do before first public URL)

- [ ] **Create Supabase project** — run `supabase/schema.sql` in SQL editor
- [ ] **Set environment variables** — copy `.env.example` → `.env.local`, fill all values
- [ ] **Generate IP hash salt** — `openssl rand -hex 16` → `IP_HASH_SALT`
- [ ] **Generate Sigil webhook secret** — `openssl rand -hex 32` → `BIBLEDESK_WEBHOOK_SECRET`
- [ ] **Deploy to Render** — Web Service, Node runtime, build: `npm install && npm run build`, start: `npm run start`
- [ ] **Set `NEXT_PUBLIC_APP_URL`** — to production Render URL
- [ ] **Upgrade Supabase to Pro** ($25/mo) — prevents project pause after 7 days inactivity
- [ ] **Verify build passes** on Render with real env vars
- [ ] **Test rate limiting** — confirm 429 fires after 15 requests/hour
- [ ] **Test RAG pipeline** — ask a question twice, confirm second hit returns `X-RAG-Hit: exact`

---

## ✅ Completed (Steps 1–6, 2026-06-28)

- [x] `supabase/schema-v3.sql` — `graph_nodes` + `graph_edges` tables, RLS, `get_node_subgraph` RPC
- [x] `src/lib/graph.ts` — 6 typed functions: upsertNode, upsertEdge, writeGraphFromAnswer, getFullGraph, getSubgraph, getNodeByKey
- [x] `src/app/api/graph/route.ts` — GET (full/subgraph) + POST (secret-protected write)
- [x] `src/components/GraphView/` — D3 force-directed viewer, zoom/pan, drag nodes, click-to-inspect, lazy D3 import
- [x] `src/app/graph/page.tsx` — /graph explorer page with concept focus + drill-in
- [x] `src/app/api/export/obsidian/route.ts` — Obsidian vault .zip export, zero external deps, PKZIP encoder
- [x] `apps/desktop/` — Electron wrapper: vault IPC (pick/read/write/reveal), graphify rebuild, sync indicator, DesktopShell top bar
- [x] Root `package.json` — workspaces + d3 + desktop:dev / desktop:dist scripts
- [x] `openai` added to `package.json` dependencies (^4.100.0)
- [x] `writeGraphFromAnswer` wired into `saveAnswer()` — fire-and-forget, non-blocking

---

## 🛠 Custom MCP Tools (to build)

### Bible lookup
- [ ] `get_verse(book, chapter, verse, translation)` — fetch a specific verse
- [ ] `search_scripture(query, translation)` — full-text search across verses
- [ ] `get_cross_references(reference)` — return known cross-references for a passage

### Graph tools
- [ ] `get_concept_subgraph(node_key)` — 1-hop graph around any concept (wraps /api/graph)
- [ ] `find_related_concepts(question)` — embed question, return nearest graph nodes via pgvector
- [ ] `add_graph_node(label, category, description)` — manually inject a node

### RAG / knowledge tools
- [ ] `search_canonical_answers(question)` — surface approved moderator answers
- [ ] `store_canonical_answer(question, answer)` — add approved answer to vector store

### Study tools
- [ ] `get_answer_history(limit)` — return recent BibleDesk answers from Supabase
- [ ] `export_vault_zip()` — trigger Obsidian export, return download URL
- [ ] `get_dimension(answer_id, dimension)` — pull one dimension from a stored answer

### MCP server implementation options
- [ ] **Next.js HTTP MCP server** — new `/api/mcp/route.ts` exposing tools as JSON-RPC (works on Render)
- [ ] **Local stdio MCP server** — `apps/desktop/mcp/server.js` for Electron app (no network needed)

---

## 🎨 Customizations & Enhancements

### High value, low effort
- [ ] **Shareable answer links** — `/share/[slug]` page (slug already saved by `saveAnswer()`)
- [ ] **Answer history page** — `/history` listing past questions with search/filter
- [ ] **Link /graph in Header nav** — graph page exists but has no nav link yet
- [ ] **Bible translation switcher UI** — backend accepts `translation` param, no frontend picker yet
- [ ] **Rate limit remaining in UI** — `X-RateLimit-Remaining` header returned by /api/ask, not shown
- [ ] **Toast on clipboard copy** — answer share button copies but gives no feedback

### Medium effort
- [ ] **Streaming answers** — switch /api/ask to `ReadableStream` so answer appears word-by-word
- [ ] **Bookmarks** — save favourite answers to localStorage or Supabase `bookmarks` table
- [ ] **Dark/light mode toggle** — design system uses CSS vars, single class swap on `<html>`
- [ ] **PWA icons** — `icon-192.png` and `icon-512.png` in `/public` (currently 404)
- [ ] **`robots.txt` + `sitemap.xml`** — SEO basics

### Larger features
- [ ] **User accounts** — Supabase Auth (Google/email) to tie answers, bookmarks, graph to a user
- [ ] **Moderation dashboard UI** — proper `/mod` frontend (route exists, no UI)
- [ ] **Mobile PWA** — `next-pwa` wrapper + manifest for iOS/Android install
- [ ] **Devotional mode** — daily verse + auto-generated 5-dimension study note via Render cron
- [ ] **Electron desktop icon** — `apps/desktop/public/icon.png` referenced in main.js but not yet created

---

## Phase 2 — Bible Reader

> **Goal:** Full e-Sword-style Bible reading experience in the browser
> **Estimated effort:** 4–6 weeks

- [ ] `/bible` — chapter/verse navigation (book → chapter → verse)
- [ ] Side-by-side translation comparison (WEB vs KJV)
- [ ] Cross-reference panel (links between related passages)
- [ ] Strong's concordance — click a word → see Hebrew/Greek definition
- [ ] Classic commentaries — Matthew Henry, Adam Clarke (public domain text)
- [ ] Personal highlights + bookmarks (requires auth)
- [ ] Personal notes per verse (requires auth)
- [ ] Reading plans (personal + group)

---

## Phase 3 — Church Tools & Auth

> **Goal:** Full church/ministry platform with accounts and team features
> **Estimated effort:** 4–6 weeks

- [ ] Supabase Auth — email/password + Google OAuth
- [ ] User profiles (name, church, denomination)
- [ ] Saved question history (requires auth)
- [ ] Prayer request board — submit + browse open requests
- [ ] Prayer request → Discord (via Sigil `/prayer`)
- [ ] Sermon notes workspace — rich text, Bible verse links
- [ ] Sermon notes → Discord (via Sigil `/sermon`)
- [ ] Youth group view — simplified UI mode
- [ ] Church admin dashboard — manage team members

---

## Phase 4 — Full Sigil/Discord Integration

> **Goal:** BibleDesk and Sigil work as a unified church platform
> **Estimated effort:** 2–4 weeks

- [ ] Upgrade Sigil `faith` package — `/bible` calls BibleDesk AI endpoint
- [ ] Prayer request sync — Discord prayer → BibleDesk DB + vice versa
- [ ] Sermon publish flow — BibleDesk → Discord channel post
- [ ] Devotional scheduler — daily auto-post using BibleDesk content
- [ ] Discord slash command for question shortcut (`/study <question>`)

---

## Phase 5 — SaaS / Monetization

> **Goal:** Sustainable freemium platform with church packages
> **Estimated effort:** 4–6 weeks

- [ ] Stripe integration — subscription management
- [ ] Free tier: 15 questions/day (anonymous or logged in)
- [ ] Personal tier ($5/mo): unlimited AI questions + history + notes
- [ ] Church package ($XX/mo): team seats + admin + Discord + sermon tools
- [ ] Usage dashboard — questions used, billing, plan management
- [ ] Invoicing for church accounts

---

## Tech Debt & Known Issues

- [x] `openai` package added to `package.json` — run `npm install`
- [x] `writeGraphFromAnswer` wired in `saveAnswer` — graph tables will now populate
- [ ] No `/graph` link in Header nav
- [ ] No Electron desktop icon (`apps/desktop/public/icon.png` missing)
- [ ] Turbopack root warning — suppressed in `next.config.ts`, may resurface after Node upgrade
- [ ] No PWA icons yet — `icon-192.png` 404 in dev logs

---

## Architecture Decisions Log (ADR)

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-27 | Next.js over Vite SPA | SSR needed for SEO on public answer pages |
| 2026-06-27 | bible-api.com over API.Bible | Free, no key, simpler — right for Phase 1 |
| 2026-06-27 | Claude Sonnet 4.5 | Best quality/cost for structured JSON answers |
| 2026-06-27 | Anonymous-first | Auth adds scope — ship MVP first, add auth in Phase 3 |
| 2026-06-27 | CSS Modules over Tailwind | Full design system control, no runtime overhead |
| 2026-06-27 | Lazy-init Supabase client | Prevents build-time failures when env vars not set |
| 2026-06-27 | HMAC over Bearer token for Sigil | Matches existing Sigil webhook pattern, tamper-proof |
| 2026-06-28 | pgvector RAG via OpenAI embeddings | Anthropic has no embeddings API; text-embedding-3-small is standard |
| 2026-06-28 | Zero-dep PKZIP for Obsidian export | No extra npm packages; Node.js zlib built-in sufficient |
| 2026-06-28 | Render + Supabase Pro stack | Render Web Service ($7) + Supabase Pro ($25) = always-on with pgvector |
| 2026-06-28 | Electron contextBridge IPC | Security best practice; no nodeIntegration in renderer |

---

*Updated: 2026-06-28 | See [ARCHITECTURE.md](ARCHITECTURE.md) for system design details*
