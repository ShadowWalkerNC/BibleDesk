# AGENTS.md — BibleDesk

> **Extends:** `ShadowWalkerNC/.github/AGENTS.md` — all global rules apply unconditionally.
> **Auto-loaded by:** Claude Code · GitHub Copilot · OpenAI Codex · Cursor · Windsurf
> **Updated:** 2026-06-27

---

## Project Identity

```
Project:      BibleDesk
Description:  Free AI-powered Bible study platform — 5-dimension sourced answers
              Scripture · Historical · Original Language · Theological · Practical Application
Status:       in development
Phase:        Phase 1 — AI Study Core (MVP)
```

---

## Tech Stack

```
Language:   TypeScript
Framework:  Next.js 15 (App Router) · React 19
Database:   Supabase (PostgreSQL + RLS)
AI:         Anthropic Claude (claude-sonnet-4-5) — server-only
Bible API:  bible-api.com (free, no key, public domain translations)
Hosting:    Vercel (planned)
PWA:        Yes — manifest.json, installable
```

---

## ShadowRealm Network

BibleDesk is a node in the ShadowRealm Network alongside Sigil.
- Exposes: `POST /api/v1/bible/answer` (HMAC-signed, Sigil-compatible)
- Exposes: `GET /api/v1/bible/answer` (health check)
- Integrates with: Sigil `faith` package (/bible /devotional /sermon /prayer)
- Auth contract: `x-bibledesk-signature: sha256=<HMAC>` matching Sigil webhook pattern

---

## Active Agents

```
Always active:   COHERENCE · SECURITY · DOCS
On-demand:       ARCHITECT · ENGINEER · AI · DATABASE · DEVOPS · UX · PRODUCT
```

---

## Project-Specific Rules

1. **API keys are server-only.** `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in client bundles. Verify with `next build` output before every deploy.
2. **Bible text is public domain only.** Only use bible-api.com public domain translations (KJV, WEB, ASV, etc.). No copyrighted translations without a license review.
3. **All AI answers must be grounded.** Claude must cite specific scripture references. Hallucination-free is the product promise.
4. **Rate limiting is non-negotiable.** Every API route that calls Claude must be gated by the rate-limit middleware.
5. **5 Dimensions are locked.** The five answer dimensions are: Scripture · Historical · Original Language · Theological · Practical Application. Do not add or remove without a full UPA review.
6. **Sigil compatibility maintained.** The `/api/v1/bible/answer` endpoint must maintain HMAC signature compatibility with Sigil's webhook pattern.
7. **Docs follow code.** README.md, ARCHITECTURE.md, and TODO.md must be updated every session that changes behavior.

---

## Current Phase Context

```
Phase goal:         Ship a working AI Bible study MVP
                    User asks question → gets 5-dimension AI answer with citations

Definition of done:
  ✓ Question input with translation selector
  ✓ 5-dimension tabbed answer display
  ✓ Scripture citations (bible-api.com)
  ✓ Rate limiting (15 questions/hour/IP)
  ✓ Supabase answer persistence
  ✓ Sigil webhook endpoint (/api/v1/bible/answer)
  ✓ PWA manifest
  ✓ Deployed to Vercel

Next phase:         Phase 2 — Bible Reader
                    Full chapter/verse browser, Strong's concordance,
                    classic commentaries, highlights/notes
```

---

## File Map

```
src/
  app/
    api/ask/route.ts          ← Main AI endpoint (POST, rate-limited)
    api/v1/bible/answer/      ← Sigil-compatible webhook
    page.tsx                  ← Homepage
    layout.tsx                ← Root layout + SEO
    globals.css               ← Design system tokens
  components/
    Header/                   ← Sticky nav
    SearchBar/                ← Question input + examples
    DimensionPanel/           ← 5-tab answer display
    LoadingState/             ← Skeleton + error states
  lib/
    claude.ts                 ← Anthropic client (SERVER ONLY)
    bible.ts                  ← bible-api.com client
    supabase.ts               ← DB client (server + browser)
    rate-limit.ts             ← IP rate limiting
  types/
    index.ts                  ← Shared TypeScript types
supabase/
  schema.sql                  ← Run in Supabase SQL editor
.env.example                  ← All env vars documented
public/
  manifest.json               ← PWA manifest
```

---

*Updated: 2026-06-27 | Extends: ShadowWalkerNC/.github/AGENTS.md | Repo: [BibleDesk](https://github.com/ShadowWalkerNC/BibleDesk)*
