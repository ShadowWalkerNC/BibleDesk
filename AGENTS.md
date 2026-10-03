# AGENTS.md — BibleDesk

> **Extends:** `ShadowWalkerNC/.github/AGENTS.md` — all global rules apply unconditionally.  
> **Auto-loaded by:** Claude Code · GitHub Copilot · OpenAI Codex · Cursor · Windsurf  
> **Updated:** 2026-09-19

---

## Project Identity

```
Project:      BibleDesk
Description:  Bible-first study platform — local Scripture foundation,
              AI assistant for 5-dimension sourced answers
              Scripture · Historical · Original Language · Theological · Practical Application
Status:       in development
Phase:        Phase 0 — Local-first Bible foundation
```

---

## Tech Stack

```
Language:     TypeScript
Framework:    Next.js 16 (App Router) · React 19
Database:     Railway PostgreSQL + pgvector (Drizzle ORM) · stateless JWT auth
AI Engine:    Google Gemini (gemini-2.5-flash) — BYOK x-gemini-api-key or server fallback
Embeddings:   OpenAI text-embedding-3-small — server-only (pgvector RAG)
Bible data:   Local public domain modules (KJV, ASV, WEB, BBE, Darby, YLT) + Strong's Lexicons + TSK
Integrations: MCP · Sigil · direct per-user Google OAuth for Prayer Care · wa.me sharing
Hosting:      Railway (https://bibledesk.up.railway.app) · Docker
Parked:       Android · Electron · Chrome extension · church/sermon/creator suites
```

---

## ShadowRealm Network

BibleDesk is a node in the ShadowRealm Network alongside Sigil.
- Exposes: `POST /api/v1/bible/answer` (HMAC-signed, Sigil-compatible)
- Exposes: `GET /api/v1/bible/answer` (health check)
- Integrates with: Sigil `faith` package (/bible /devotional /sermon /prayer)
- Auth contract: `x-bibledesk-signature: sha256=<HMAC>` matching Sigil webhook pattern
- Share URLs use `/share/[slug]` (8-char slug), not `/answer/...`

---

## Active Agents

```
Always active:   COHERENCE · SECURITY · DOCS
On-demand:       ARCHITECT · ENGINEER · AI · DATABASE · DEVOPS · UX · PRODUCT
```

---

## Project-Specific Rules

1. **API keys are server-only.** `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_TOKEN_ENCRYPTION_KEY` must NEVER appear in client bundles. Verify with `next build` before every deploy.
2. **Bible text is public domain only** unless a license review lands. Prefer local modules; bible-api.com is interim.
3. **All AI answers must be grounded.** Cite specific scripture references. Do not invent lexicon facts — use structured Strong’s/morphology data when claiming original-language detail.
4. **Rate limiting is non-negotiable.** Every API route that calls Claude (or other paid AI) must be gated by rate-limit middleware.
5. **5 Dimensions are locked** for assistant answers: Scripture · Historical · Original Language · Theological · Practical Application. Do not add or remove without a full UPA review.
6. **Sigil compatibility maintained** on `/api/v1/bible/answer` (HMAC pattern).
7. **Docs follow code.** Update `README.md`, `ARCHITECTURE.md`, and `TODO.md` every session that changes behavior. Keep phase labels consistent across all four docs (including this file).
8. **Bible-first UX.** Do not make the AI ask box the only hero. Reader/search are the product core; AI is assistant.
9. **Honest marketing.** Do not claim offline lexicon, Midvash ingest, or production deploy until those exist.
10. **Prayer Care ownership is server-derived.** Verify the JWT bearer token and use its subject user ID; never accept an owner/user ID from request JSON.
11. **Google exports use BibleDesk OAuth only.** Do not use Perplexity connector credentials in application code. Encrypt tokens at rest, keep `google_connections` server-only (no browser access), and never add an automatic Gmail send path.
12. **Human review precedes follow-up.** Gmail integration may create a draft only after explicit review. Recipient, subject, and message remain editable.

---

## Current Phase Context

```
Phase goal:     Local-first Bible foundation
                Read + search + compare installed public-domain text without bible-api.com

Active web MVP:
  ✓ AI 5-dimension pipeline + streaming
  ✓ Rate limiting, RAG, share pages
  ✓ /bible UI with 3-Column Study Desk workspace
  ✓ Study Resources hub, MCP, prayer, moderation and login

Active work (Phase 0 Complete):
  ✓ Module format + 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT)
  ✓ Local read + concordance search path
  ✓ Strong's Greek (5.5k) & Hebrew (8.6k) lexicon data + TSK cross-refs
  ✓ Quick Jump modal (Ctrl+K) & Chrome Extension MV3 side panel
  ✓ Modernized Bible-themed UI with clean Lucide icons across desktop & mobile
  ✓ Bring-Your-Own-Key (BYOK) Gemini API key setup with shared/free Bible guarantee
  ✓ Dynamic Workspace Panel Layout Controls (Left Hub, Distraction-Free Focus Reader, Right Study Drawer)
  ✓ PrayerAtlas 2D map with consent-gated public records
  ✓ Private Prayer Care first increment with Calendar/ICS and reviewed Gmail draft/compose exports
  ✓ Relational PostgreSQL database layer with Drizzle ORM and dual-mode embedded PGlite
  ✓ Five-dimension evidence model and transparent multi-factor confidence rating system
  ✓ Anthropic Claude 3.5 Sonnet research assistant with web search and verifiable citations
  ✓ Dedicated Research Assistant workbench (`/research`) and Study Desk tab (`/bible`)
  ✓ Pure Railway PostgreSQL via Drizzle (35 tables, `drizzle/0001_railway-migration`) + stateless JWT auth (`/api/auth/*`); Supabase dependency removed
  ✓ 33 automated tests passing across unit, database, API, security-boundary, and E2E critical path suites

Release gates:
  □ Apply and validate Drizzle migrations (`drizzle-kit migrate`) on Railway PostgreSQL + enable pgvector for RAG
  □ Verify server-side ownership checks with cross-user denial tests
  ✓ Deploy to Railway (https://bibledesk.up.railway.app) with unified Next.js API & database container
```

---

## File Map

```
src/
  app/
    page.tsx                     ← Homepage (Bible-first hero + assistant)
    bible/                       ← Reader UI
    bible|study-resources|prayer|developers|download|mod|login|share/
    api/
      ask/                       ← AI answer (+ stream/)
      bible/                     ← chapter, search, study
      ask|bible|graph|history|bookmarks|daily|mcp|mod|prayer|prayer-care|google|export/
      v1/bible/answer/           ← Sigil webhook
  components/                    ← Header, SearchBar, DimensionPanel, GraphView, …
  lib/
    bible.ts                     ← bible-api.com client (interim)
    claude.ts|pipeline.ts|rag.ts|gemini.ts|graph.ts|moderation.ts|…
  hooks/                         ← useStreamingAsk, useBookmark
  types/
archive/                         ← preserved non-MVP features and native shells
supabase/
  legacy SQL, kept as data-migration reference only
public/
  manifest.json, icon-*.png
TODO.md · README.md · ARCHITECTURE.md · .env.example
```

---

*Updated: 2026-09-30 | Extends: ShadowWalkerNC/.github/AGENTS.md | Repo: [BibleDesk](https://github.com/ShadowWalkerNC/BibleDesk)*

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
