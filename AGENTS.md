# AGENTS.md — BibleDesk

> **Extends:** `ShadowWalkerNC/.github/AGENTS.md` — all global rules apply unconditionally.  
> **Auto-loaded by:** Claude Code · GitHub Copilot · OpenAI Codex · Cursor · Windsurf  
> **Updated:** 2026-08-09

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

Active work (Phase 0 Complete):
  ✓ Module format + 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT)
  ✓ Local read + concordance search path
  ✓ Strong's Greek (5.5k) & Hebrew (8.6k) lexicon data + TSK cross-refs
  ✓ Quick Jump modal (Ctrl+K) & Chrome Extension MV3 side panel
  ✓ Modernized Bible-themed UI with clean Lucide icons across desktop & mobile
  ✓ Bring-Your-Own-Key (BYOK) Gemini API key setup with shared/free Bible guarantee
  ✓ Discord bot slash commands & webhook channel dispatcher
  ✓ Meta WhatsApp Business Cloud API webhook & Click-to-Chat sharing
  ✓ Dynamic Workspace Panel Layout Controls (Left Hub, Distraction-Free Focus Reader, Right Study Drawer)
  ✓ PrayerAtlas 3D Interactive Global Prayer Map with country-level privacy & restricted region shields
  ✓ Single-command packaging CLI (`npm run package:all`) & official multi-resolution brand icon suite

Deploy (parallel):
  □ Apply supabase schemas v1→v5
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
    claude.ts|pipeline.ts|rag.ts|gemini.ts|graph.ts|moderation.ts|…
  hooks/                         ← useStreamingAsk, useBookmark
  types/
apps/desktop/                    ← Electron wrapper
supabase/
  schema.sql → schema-v4.sql     ← Apply in order
public/
  manifest.json, icon-*.png
TODO.md · README.md · ARCHITECTURE.md · .env.example
```

---

*Updated: 2026-08-09 | Extends: ShadowWalkerNC/.github/AGENTS.md | Repo: [BibleDesk](https://github.com/ShadowWalkerNC/BibleDesk)*
