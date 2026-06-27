# BibleDesk — Architecture

> **Status:** Phase 1 — AI Study Core (MVP)
> **Last updated:** 2026-06-27
> **Stack:** Next.js 16 · TypeScript · Supabase · Anthropic Claude · bible-api.com

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Browser / PWA)                        │
│                                                                     │
│   Next.js React App (App Router)                                    │
│   ┌───────────────────────────────────────────────────────────┐     │
│   │  / (HomePage)                                             │     │
│   │  ├── SearchBar     — question input + translation select  │     │
│   │  ├── LoadingSkeleton — animated while Claude responds     │     │
│   │  └── DimensionPanel — 5-tab answer display + citations    │     │
│   └───────────────────────────────────────────────────────────┘     │
│                   │ fetch POST /api/ask                             │
│                   │ (no API key in browser)                         │
└───────────────────┼─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER LAYER                             │
│                                                                     │
│   src/app/api/ask/route.ts          (main endpoint)                 │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │  1. Parse & sanitize question (max 500 chars)           │       │
│   │  2. Hash IP → check rate_limits table (15/hr)          │       │
│   │  3. Call generateBibleAnswer() → Claude API            │       │
│   │  4. Save answer to Supabase (non-blocking)             │       │
│   │  5. Return structured BibleAnswer JSON                 │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│   src/app/api/v1/bible/answer/route.ts  (Sigil webhook)             │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │  1. Verify HMAC-SHA256 x-bibledesk-signature           │       │
│   │  2. Call generateBibleAnswer()                         │       │
│   │  3. Return compact JSON for Discord embeds             │       │
│   └─────────────────────────────────────────────────────────┘       │
└────────────────┬──────────────────────┬─────────────────────────────┘
                 │                      │
                 ▼                      ▼
   ┌─────────────────────┐   ┌─────────────────────────┐
   │    Anthropic API    │   │       Supabase           │
   │  claude-sonnet-4-5  │   │  PostgreSQL + RLS        │
   │                     │   │  ┌──────────────────┐    │
   │  System prompt:     │   │  │ answers table    │    │
   │  - 5-dimension JSON │   │  │ rate_limits table│    │
   │  - Grounded only    │   │  └──────────────────┘    │
   │  - Cite scripture   │   │                          │
   └─────────────────────┘   └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   SIGIL DISCORD BOT (separate repo)                 │
│                                                                     │
│   faith package: /bible /devotional /sermon /prayer                 │
│   ─────────────────────────────────────────────────────────────     │
│   Sigil → POST /api/v1/bible/answer (HMAC signed)                   │
│         ← compact answer JSON → Discord embed                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | SSR for SEO on public answer pages; Server Actions/Routes keep secrets server-side |
| **Language** | TypeScript 5 | Full type safety across client and server |
| **AI** | Anthropic Claude Sonnet 4.5 | Best quality/cost balance; structured JSON output; ~$0.01–0.03/question |
| **Bible Data** | bible-api.com | Free, no API key, public domain (KJV/WEB/ASV), clean JSON |
| **Database** | Supabase (PostgreSQL) | Managed, free tier, RLS built-in, Realtime for future phases |
| **Hosting** | Vercel (planned) | Best Next.js DX, free tier, edge functions |
| **PWA** | Web App Manifest | Installable on mobile without app stores |
| **Styling** | CSS Modules + CSS custom properties | Zero runtime cost, scoped styles, full design system control |

---

## 3. Directory Structure

```
BibleDesk/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ask/route.ts              ← POST: main AI endpoint (rate-limited)
│   │   │   └── v1/bible/answer/route.ts  ← POST: Sigil webhook (HMAC auth)
│   │   │                                  GET:  health check
│   │   ├── globals.css                   ← Design system tokens + global styles
│   │   ├── layout.tsx                    ← Root layout (metadata, fonts, PWA)
│   │   ├── page.tsx                      ← Homepage (client component, interactive)
│   │   └── page.module.css
│   │
│   ├── components/
│   │   ├── Header/
│   │   │   ├── Header.tsx                ← Sticky glass nav
│   │   │   └── Header.module.css
│   │   ├── SearchBar/
│   │   │   ├── SearchBar.tsx             ← Question input, translation selector, examples
│   │   │   └── SearchBar.module.css
│   │   ├── DimensionPanel/
│   │   │   ├── DimensionPanel.tsx        ← 5-tab answer display
│   │   │   └── DimensionPanel.module.css
│   │   └── LoadingState/
│   │       ├── LoadingState.tsx          ← Skeleton + error states
│   │       └── LoadingState.module.css
│   │
│   ├── lib/
│   │   ├── claude.ts                     ← Anthropic client + prompt (SERVER ONLY)
│   │   ├── bible.ts                      ← bible-api.com client
│   │   ├── supabase.ts                   ← Lazy-init DB client (server + browser)
│   │   └── rate-limit.ts                 ← IP-based rate limiting (15/hr)
│   │
│   └── types/
│       └── index.ts                      ← Shared TypeScript types
│
├── supabase/
│   └── schema.sql                        ← Run in Supabase SQL editor
│
├── public/
│   └── manifest.json                     ← PWA manifest
│
├── AGENTS.md                             ← AI agent rules (this project)
├── ARCHITECTURE.md                       ← This file
├── README.md                             ← User-facing docs
├── TODO.md                               ← Current work state
├── .env.example                          ← All env vars documented
└── next.config.ts                        ← Next.js config
```

---

## 4. Data Flow — Ask a Question

```
User types question
       │
       ▼
SearchBar.tsx (client)
  validates: length >= 5, <= 500 chars
  reads: selected translation
       │
       ▼ fetch POST /api/ask { question, translation }
       │
       ▼
src/app/api/ask/route.ts (server)
  1. Parse + sanitize question
  2. Get client IP from x-forwarded-for
  3. Hash IP → checkRateLimit() → Supabase rate_limits
     ├── if denied → 429 + resetAt timestamp
     └── if allowed → continue
  4. generateBibleAnswer(question, { translation })
     ├── Build grounded system prompt (5-dimension JSON schema)
     ├── Call Anthropic claude-sonnet-4-5
     ├── Parse JSON response
     └── Validate all 5 dimension keys present
  5. saveAnswer(answer) → Supabase answers table [non-blocking]
  6. Return { success: true, answer: BibleAnswer }
       │
       ▼
DimensionPanel.tsx (client)
  renders: summary, 5 tabs, citations, key points, share bar
```

---

## 5. Data Models

### `BibleAnswer` (TypeScript + Supabase JSONB)

```typescript
interface BibleAnswer {
  id: string;                    // UUID
  question: string;
  summary: string;               // 1-2 sentence overview
  dimensions: {
    scripture:         Dimension; // 📖 Direct verse analysis
    historical:        Dimension; // 🏛️ Cultural context
    original_language: Dimension; // 🔤 Hebrew/Greek
    theological:       Dimension; // ✝️ Church teaching
    practical:         Dimension; // 🌱 Life application
  };
  translation_used: 'web' | 'kjv' | 'asv';
  confidence: 'high' | 'medium' | 'low';
  disclaimer?: string;
  created_at: string;
}

interface Dimension {
  title: string;
  content: string;       // 100-250 words
  citations: string[];   // ["John 3:16", "Romans 8:28"]
  key_points: string[];  // 2-4 bullet highlights
}
```

### Supabase Tables

```sql
answers (
  id UUID PRIMARY KEY,
  question TEXT,
  answer_json JSONB,          -- full BibleAnswer object
  translation VARCHAR(10),
  share_slug VARCHAR(16),     -- short shareable URL slug
  created_at TIMESTAMPTZ
)

rate_limits (
  ip_hash VARCHAR(64) PRIMARY KEY,  -- SHA-256 hash, never raw IP
  count INT,
  window_start TIMESTAMPTZ          -- rolling 1-hour window
)
```

---

## 6. Security Model

| Control | Implementation |
|---|---|
| **API key isolation** | `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `process.env` only — never in client bundle |
| **Rate limiting** | 15 questions/hour/IP — checked before every Claude call |
| **IP privacy** | IPs are SHA-256 hashed with a salt — raw IPs never stored |
| **Input validation** | Server-side: min 5 chars, max 500, whitespace-normalized |
| **Supabase RLS** | `answers` table: public SELECT, service-role-only INSERT. `rate_limits`: service-role-only |
| **Sigil webhook auth** | HMAC-SHA256 via `x-bibledesk-signature` header — timing-safe comparison |
| **Build verification** | `next build` must pass with zero secrets in client chunks before every deploy |

---

## 7. ShadowRealm Network Integration

BibleDesk is a node in the ShadowRealm Network alongside [Sigil](https://github.com/ShadowWalkerNC/Sigil).

### Contract

```
BibleDesk exposes:
  POST /api/v1/bible/answer   ← Sigil calls this from faith package
  GET  /api/v1/bible/answer   ← Health check

Auth:
  Header: x-bibledesk-signature: sha256=<HMAC-SHA256>
  Secret: BIBLEDESK_WEBHOOK_SECRET (shared, set in both apps)

Request body:
  { question: string, translation?: string, guild_id?: string }

Response:
  {
    success: true,
    question, summary,
    dimensions: { [key]: { title, content (≤400 chars), citations } },
    share_url: "https://bibledesk.app/answer/<id>",
    confidence
  }
```

### Sigil Faith Package Commands

| Command | Behavior with BibleDesk |
|---|---|
| `/bible` | Posts a daily verse — can call BibleDesk for enriched context |
| `/devotional` | Morning devotional — BibleDesk supplies 5-dimension depth |
| `/sermon` | Sermon notes — BibleDesk content posted to Discord channel |
| `/prayer` | Prayer requests — stored in Supabase, surfaced in Discord |

---

## 8. Design System

**Palette:** Deep navy (`#06081a` → `#0b0f2e`) with warm gold accents (`#e8b320` → `#f5c842`).

**Typography:** `Inter` (sans-serif, UI) + `Lora` (serif, scripture quotes).

**Dimension accent colors:**

| Dimension | Color | Hex |
|---|---|---|
| Scripture | Blue | `#4f9cf9` |
| Historical | Amber | `#e67e42` |
| Original Language | Purple | `#a78bfa` |
| Theological | Green | `#34d399` |
| Practical | Rose | `#fb7185` |

**Effects:** Glassmorphism panels (`backdrop-filter: blur`), `fadeInUp` animations, gold glow pulse on loading.

---

## 9. Future Architecture (Phase 2+)

| Phase | Architecture additions |
|---|---|
| **Phase 2 — Bible Reader** | New `/bible/[book]/[chapter]` routes; Strong's concordance data (SQLite or Supabase); commentary text (public domain, stored in Supabase) |
| **Phase 3 — Church Tools** | Supabase Auth (email/OAuth); `users`, `notes`, `prayer_requests`, `reading_plans` tables; RLS per user |
| **Phase 4 — Full Sigil** | Bidirectional webhook; prayer request → Discord; sermon notes → Discord channel publish |
| **Phase 5 — SaaS** | Stripe subscriptions; `subscriptions` table; feature gates per plan tier |

---

*Architecture decisions are documented in the [UPA v2.0 implementation plan](https://github.com/ShadowWalkerNC/BibleDesk) · Updated: 2026-06-27*
