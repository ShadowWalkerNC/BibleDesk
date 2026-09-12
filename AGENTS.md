# AGENTS.md — BibleDesk

> **Extends:** `ShadowWalkerNC/.github/AGENTS.md` — all global rules apply unconditionally.  
> **Auto-loaded by:** Claude Code · GitHub Copilot · OpenAI Codex · Cursor · Windsurf  
> **Updated:** 2026-09-11

---

## Project Identity

```
Project:      BibleDesk
Description:  Bible-first study platform — local Scripture foundation,
              AI assistant for 5-dimension sourced answers
              Scripture · Historical · Original Language · Theological · Practical Application
Status:       in development
Phase:        Phase 0 — Local-first Bible foundation (security hardening; release verification pending)
```

---

## Tech Stack

```
Language:     TypeScript
Framework:    Next.js 16 (App Router) · React 19
Database:     Supabase (PostgreSQL + pgvector + RLS)
AI Engine:    Google Gemini (gemini-2.5-flash) — BYOK x-gemini-api-key or server fallback
Embeddings:   OpenAI text-embedding-3-small — server-only (pgvector RAG)
Bible data:   Local public domain modules (KJV, ASV, WEB, BBE, Darby, YLT) + Strong's Lexicons + TSK
Integrations: Discord Slash Bot & Webhook · WhatsApp Meta Cloud API · MCP Server · Sigil Webhook
Hosting:      Vercel preferred (Render also viable)
Desktop:      Electron wrapper in apps/desktop/
Extension:    Chrome Manifest V3 Side Panel in apps/extension/
```

---

## Interoperability & Network Compatibility

BibleDesk is a standalone, independent Bible intelligence node.
- Internal compatibility: Exposes `POST /api/v1/bible/answer` (HMAC-signed, Sigil-compatible)
- Exposes: `GET /api/v1/bible/answer` (health check)
- Auth contract: `x-bibledesk-signature: sha256=<HMAC>`
- Share URLs use `/share/[slug]` (8-char slug), not `/answer/...`

---

## Active Agents

```
Always active:   COHERENCE · SECURITY · DOCS
On-demand:       ARCHITECT · ENGINEER · AI · DATABASE · DEVOPS · UX · PRODUCT
```

---

## Project-Specific Rules

1. **API keys are server-only.** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in client bundles. Verify with `next build` before every deploy.
2. **Bible text is public domain only** unless a license review lands. Prefer local modules; bible-api.com is interim.
3. **All AI answers must be grounded.** Cite specific scripture references. Do not invent lexicon facts — use structured Strong’s/morphology data when claiming original-language detail.
4. **Rate limiting is non-negotiable.** Every API route that calls Claude (or other paid AI) must be gated by rate-limit middleware.
5. **5 Dimensions are locked** for assistant answers: Scripture · Historical · Original Language · Theological · Practical Application. Do not add or remove without a full UPA review.
6. **Sigil compatibility maintained** on `/api/v1/bible/answer` (HMAC pattern).
7. **Docs follow code.** Update `README.md`, `ARCHITECTURE.md`, and `TODO.md` every session that changes behavior. Keep phase labels consistent across all four docs (including this file).
8. **Bible-first UX.** Do not make the AI ask box the only hero. Reader/search are the product core; AI is assistant.
9. **Honest marketing.** Do not claim offline lexicon, Midvash ingest, or production deploy until those exist.
10. **Mobile UX adheres to Jakob's Law.** Mobile apps & responsive web experiences must align with standard platform conventions and user expectations (thumb-friendly bottom navigation/action sheets, standard touch targets >= 48px, predictable back navigation, standard search/keyboard inputs, safe area insets, and universally recognizable iconography). Do not create unorthodox UX patterns where standard mobile conventions exist.
<<<<<<< HEAD
11. **Local profiles are available only when Supabase is unconfigured.** When `isSupabaseConfigured()` returns false, Google/email flows may create a labeled device-only `bibledesk_local_user` and redirect to `/bible`. Configured authentication failures must display an error, never manufacture a local authenticated identity. Pending email confirmation must not imply a signed-in session. Local profiles never authorize server access. See `src/app/login/page.tsx`.
12. **Dispatch `storage` event after every auth state change.** After writing or removing `bibledesk_local_user` from `localStorage`, always call `window.dispatchEvent(new Event('storage'))`. This is the only mechanism that keeps `Header` and `Sidebar` user state in sync without a full page reload. All three files (`login/page.tsx`, `Header/Header.tsx`, `Sidebar/Sidebar.tsx`) must follow this pattern.
=======
11. **Auth always falls back to local session.** When `isSupabaseConfigured()` returns false (no real `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`), all auth flows — Google OAuth, email sign-up, email sign-in — must create a `bibledesk_local_user` in `localStorage` and redirect to `/bible`. Never throw an error or show a dead screen when Supabase is unconfigured. See `src/app/login/page.tsx` for the canonical `fallbackLocalLogin` helper pattern.
12. **Dispatch `storage` event after every auth state change.** After writing or removing `bibledesk_local_user` from `localStorage`, always call `window.dispatchEvent(new Event('storage'))`. This is the only mechanism that keeps the `Sidebar` user state in sync without a full page reload. The pattern lives in `src/app/login/page.tsx` (dispatch) and `src/components/Sidebar/Sidebar.tsx` (listen). (`src/components/Header/Header.tsx` was removed by A13 — its auth-state surface moved into the AppShell/Sidebar layout.)
>>>>>>> 4b0b33e5316e85d0307cdb3e79295aa959e17999

---

## Current Phase Context

```
Phase goal:     Local-first Bible foundation
                Read + search + compare installed public-domain text without bible-api.com

Already shipped (keep; do not rip out):
  ✓ AI 5-dimension pipeline + streaming
  ✓ Rate limiting, RAG, share pages, history
  ✓ /bible UI with 3-Column Study Desk workspace
  ✓ Graph, MCP, prayer, sermons, catechism/creeds/memory/plans
  ✓ Moderation UI, login wiring, Electron shell

Feature inventory (implementation does not establish release readiness):
  ✓ Module format + 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT)
  ✓ Local read + concordance search path
  ✓ Strong's Greek (5.5k) & Hebrew (8.6k) lexicon data + TSK cross-refs
  ✓ Quick Jump modal (Ctrl+K) & Chrome Extension MV3 side panel
  ✓ Modernized Bible-themed UI with clean Lucide icons across desktop & mobile
  ✓ Server Gemini AI Key Gating (strictly hidden; automatic access for signed-in accounts)
  ✓ Complete Authentication & Signup (Email/Password + Google OAuth + profile creation)
  ✓ Database RLS Hardening & user-scoped bookmarks (schema-v6.sql)
  ✓ Guest Data Auto-Merge (migrates guest bookmarks, notes, prayer lists on login)
  ✓ Multi-Channel Prayer Care Workflow (In-app rhythm, browser notifications, email digest)
  ✓ 1-Click Care Follow-ups (WhatsApp, Email, SMS, Clipboard) with encouraging templates
  ✓ Dynamic Workspace Panel Layout Controls (Left Hub, Focus Reader, Right Study Drawer)
  ✓ PrayerAtlas 2D Interactive Vector Global Prayer Map (D3 Natural Earth, category color-coding, approximate halos vs precise beacons, restricted shields, offline TopoJSON)
  ✓ Single-command packaging CLI (`npm run package:all`) & official brand icon suite
  ✓ Modal & Dialog CSS Hardening (zero-bleed solid opaque cards, 9990 z-index, dark backdrops)
  ✓ Marketing Showcase on `/` with 2 core personas (Individual Believers & Discipleship vs Churches, Ministries & Creators) & transparent pricing ($0 Free with 5 daily AI answers vs $4.99/mo Supporter tier; $0 for Churches forever)
  ✓ Universal & Inline Slash Commands (`/verse`, `/encourage`, `/pray`, `/strongs`, `/church`, `/sdk`, `/radio`, `/sermon`, `/slides`, `/catechism`)
  ✓ Words of Encouragement Hub (`/encourage`) with topical promises & kingdom creativity meditations
  ✓ 4-Tier Prayer Escalation System (Private → Circle → Church → Global Atlas) with schema-v8.sql
  ✓ Church Integration & Ministry Hub (`/church`) with prayer chain & 1-click embed widgets ($0 Free Forever)
  ✓ Official BibleDesk Client SDK (`src/lib/sdk.ts`) & Developer Platform (`/developers`) with REST & MCP docs
  ✓ Expanded Doctrinal RAG System (`src/lib/doctrinesData.ts`, `src/lib/rag.ts`) with 8 classical loci of Christian theology
  ✓ Multi-Tradition Catechisms & Confessions (`/catechism`) expanding Westminster & Heidelberg with Luther, 1689 Baptist, 39 Articles, and Assemblies of God
  ✓ Live Christian Worship Radio Dock (`LiveRadioPlayer.tsx`) with ambient sacred streams & 1-click K-LOVE/Air1 official station docks
  ✓ Church Live Sermon Theatre (`ChurchLivePlayer.tsx`, `/sermons`) with zero-cost YouTube Live & Facebook Live embeds
  ✓ 1-Click ProPresenter 7 Presentation Slide Exporter (`/sermons`) auto-chunking Scripture & sermon outlines for Sunday church projectors
  ✓ Christian Creator & Ministry Hub (`/creators`, `/c/[handle]`, `/@handle`, `schema-v9.sql`) with link-in-bio pages, embedded YouTube/Spotify worship media, Scripture of the Season, direct 0% platform fee patronage links (Patreon, BuyMeACoffee, Stripe), ministry prayer requests, and creator discovery directory
  ✓ Auth Local Fallback Hardening (2026-09-09): all sign-in/sign-up flows (Google OAuth, email, error path) fall back to instant bibledesk_local_user localStorage session when Supabase is unconfigured; storage event dispatched for sync-free Header/Sidebar update

Deploy (parallel):
  □ Apply supabase schemas v1→v9
  □ Env vars + host + smoke tests (see TODO.md)
```

---

## File Map

```
src/
  app/
    page.tsx                     ← Homepage (Bible-first hero + assistant)
    bible/                       ← Reader UI
    daily|plans|catechism|creeds|memory|prayer|sermons|bookmarks|history|graph|mod|login|share/
    api/
      ask/                       ← AI answer (+ stream/)
      bible/                     ← chapter, search, study
      graph|history|bookmarks|daily|mcp|mod|prayer|sermons|export/
      v1/bible/answer/           ← Sigil webhook
  components/                    ← Header, SearchBar, DimensionPanel, GraphView, …
  lib/
    bible.ts                     ← bible-api.com client (interim)
    claude.ts|pipeline.ts|rag.ts|gemini.ts|graph.ts|moderation.ts|auth.ts|syncGuestData.ts
  hooks/                         ← useStreamingAsk, useBookmark
  types/
apps/desktop/                    ← Electron wrapper
supabase/
  schema.sql → schema-v6.sql     ← Apply in order
public/
  manifest.json, icon-*.png
TODO.md · README.md · ARCHITECTURE.md · .env.example
```

---

---

## Base44 Dev Environment

The app runs via `docker-compose.base44.yml` (Node 22 + Next.js 16 dev server, live reload).

**No external credentials are required to boot.** The app degrades gracefully:
- Bible data (6 translations, Strong's lexicons, TSK cross-refs) is local JSON in `src/data/` — reading/search works fully offline.
- Supabase clients are lazy-init with placeholder credentials (`src/lib/supabase.ts`); the browser client warns but boots, the server client throws only when an API route actually calls it.
- AI routes (Gemini/Claude/OpenAI) return offline fallback stubs when keys are unset.

**Optional secrets** (set via the Base44 secrets dashboard when needed for full functionality): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auth, bookmarks, prayer, history), `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` (AI features). See `.base44/environment.json`.

**Quirks:**
- `npm install` uses `--workspaces=false` to skip the Electron (`apps/desktop`) and Capacitor (`apps/android`) workspace builds, which are not needed for the web dev server and would pull large native deps.
- `next.config.ts` has `allowedDevOrigins` derived from `BASE44_PUBLIC_HOST_SUFFIX` so the preview origin can access dev assets/HMR — do not remove.
- `node_modules` is a named compose volume (not bind-mounted) to avoid host/native-module issues.

**Verify it works:** `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` → HTTP 200 with "BibleDesk" in the body.

*Updated: 2026-09-09 | Extends: ShadowWalkerNC/.github/AGENTS.md | Repo: [BibleDesk](https://github.com/ShadowWalkerNC/BibleDesk)*
