# BibleDesk — Architecture

> **Status:** Phase 0 Complete & Multi-Platform Suite Deployed · Local Bible Foundation & Open MCP/API Engine  
> **Last updated:** 2026-08-30  
> **Stack:** Next.js 16 (App Router) · TypeScript 5 · Supabase · Google Gemini API · Model Context Protocol (MCP) · Shadcn UI · Three.js / R3F · Bundled Public Domain Modules · Strong's Greek/Hebrew Lexicons · Capacitor (Android) · Electron (Desktop)  
> **Work tracker:** [TODO.md](TODO.md) · **Ops Audit:** [OPS_REPORT.md](OPS_REPORT.md) · **Product Vision:** [README.md](README.md)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLIENT PLATFORMS (100% Free & Open Source)           │
│                                                                         │
│   Web & PWA (`/`) · Desktop Electron (`apps/desktop`) · Android (`apps/android`) │
│   Chrome Side Panel Extension (`apps/extension`) · Discord Bot · WhatsApp Bot  │
│                                                                         │
│   · AppShell Layout: Persistent Left Sidebar + Jakob's Law Mobile Rail/Sheet  │
│   · /bible · 3-Column Centralized Study Desk (product core)             │
│   · /download · Multi-Platform Installation Hub (PWA, Desktop, APK, Ext)│
│   · Shadcn UI + Lucide Icons + PrayerAtlas 2D Vector Map (`/prayer`)    │
│   · Bidirectional Biblical Knowledge Graph (`/graph`)                   │
└────────┬────────────────────────────────┬───────────────────────────────┘
         │ /api/bible/*, /api/graph       │ /api/mcp (JSON-RPC 2.0)
         ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    OPEN REST API & MCP SERVER LAYER                     │
│  Bible Reader: Local Static Modules (KJV, ASV, WEB, BBE, Darby, YLT)    │
│  Knowledge Graph: Semantic passages, Strong's lemmas & TSK cross-refs   │
│  MCP Server: /api/mcp for Claude Code, Cursor, Windsurf, custom agents  │
│  AI Engine: Google Gemini API (callGemini) powering 6-stage pipeline    │
│  Embeddings: OpenAI text-embedding-3-small for pgvector RAG (optional)  │
│  Discord Integration: /api/discord/interactions · /api/discord/webhook  │
│  WhatsApp Integration: /api/whatsapp/webhook (Meta Cloud API)           │
│  Sigil Network: /api/v1/bible/answer (HMAC-SHA256)                      │
└────────────────┬────────────────────────┬───────────────────────────────┘
                 ▼                        ▼
         Google Gemini (BYOK)         Supabase (PostgreSQL + pgvector)
```

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | SSR for SEO, dynamic APIs, and zero client key leaks |
| **Language** | TypeScript 5 | Full strict type safety across all 33 routes |
| **Open API & MCP** | Model Context Protocol (`/api/mcp`) + REST | Exposes Bible data, Strong's, and Knowledge Graph to external AI agents |
| **App Shell & Mobile** | Persistent Sidebar + Jakob's Law Bottom Rail & Drawer Sheet (`AppShell.tsx`, `Sidebar.tsx`) | Desktop-class workspace chrome and standard thumb-friendly mobile patterns |
| **UI Components** | Shadcn UI (`components/ui`) | Polymorphic `Button` and `Card` primitives |
| **3D & Animation** | Three.js + React Three Fiber (`@react-three/fiber`) | Interactive 3D Sacred Halo & Celestial Geometry Canvas |
| **Design System** | Reverent Bible Manuscript Parchment + Apple Liquid Glass | Cinzel display typography + Lora serif + SF Pro + vellum glass |
| **AI Answers & Pipeline** | Google Gemini API (`gemini-2.5-flash`) | Bring-Your-Own-Key (`x-gemini-api-key`) with server fallback |
| **Bible Data Engine** | Local Static JSON Modules | KJV, ASV, WEB, BBE, Darby, YLT (zero network needed) |
| **Lexicon & Cross-Refs** | Strong's Greek/Hebrew + TSK | 5.5k Greek + 8.6k Hebrew + 29k cross-references |
| **Multi-Platform Suite** | Web PWA + Electron + Capacitor Android + Chrome MV3 | Single-command unified package orchestrator (`npm run package:all`) |

---

## 3. Directory Structure

```
BibleDesk/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ask/route.ts              ← POST: AI endpoint (rate-limited, auth-gated)
│   │   │   ├── ask/stream/route.ts       ← SSE streaming ask (server Gemini key gated)
│   │   │   ├── bible/{chapter,search,study}/
│   │   │   ├── graph|history|bookmarks|daily|mcp|prayer|church|sermons/
│   │   │   ├── prayer/{circle,digest,escalate}/   ← Prayer Circle sync & 4-tier escalation
│   │   │   ├── export/obsidian/
│   │   │   ├── mod/{queue,vote,approve,invite}/
│   │   │   └── v1/bible/answer/          ← Sigil HMAC webhook + health
│   │   ├── bible|daily|plans|catechism|creeds|memory|prayer|encourage|church|developers|sermons/
│   │   ├── bookmarks|history|graph|share/[slug]|mod|login/
│   │   ├── page.tsx                      ← Homepage (Marketing Showcase or Study start)
│   │   ├── layout.tsx · globals.css · robots.ts · sitemap.ts
│   │   ├── components/                   ← Header, SearchBar, DimensionPanel,
│   │   │                                   SlashCommandPalette, MarketingShowcase, …
│   │   ├── hooks/                        ← useStreamingAsk, useBookmark
│   │   ├── lib/
│   │   │   ├── sdk.ts                    ← Official BibleDesk Client SDK
│   │   │   ├── bible.ts · encouragementData.ts
│   │   │   ├── claude.ts · pipeline.ts · rag.ts · gemini.ts
│   │   │   ├── graph.ts · moderation.ts · rate-limit.ts · supabase.ts
│   │   │   ├── auth.ts · syncGuestData.ts← Server auth validator & guest auto-merge
│   │   │   └── *Data.ts                  ← catechism/creeds/plans/memory datasets
│   │   └── types/                        ← index.ts · map.ts · prayerCare.ts · church.ts
├── apps/desktop/                         ← Electron shell
├── supabase/                             ← schema.sql → schema-v8.sql (+ rpc.sql)
├── public/                               ← manifest + icons + data/world-110m.json
├── AGENTS.md · ARCHITECTURE.md · README.md · TODO.md · .env.example
└── next.config.ts
```

---

## 4. Data Flow — Ask a Question (v2)

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
  2. Get client IP → checkRateLimit() → 429 if exceeded
  3. Generate question embedding (OpenAI text-embedding-3-small)
  4. Vector search canonical_answers (pgvector cosine similarity)
     ├── Exact match  → return canonical instantly (no Claude call)
     ├── Close match  → collect top 3 as RAG context
     └── No match     → proceed with no context
  5. Run 6-stage pipeline (with RAG context if available)
  6. Auto-flag check against flagged_topics keywords
     ├── FLAGGED → save flag, answer.status = 'under_review'
     │             notify moderators via Sigil webhook
     └── CLEAN   → answer.status = 'approved'
  7. Save answer + embedding to Supabase [non-blocking]
  8. Return { success: true, answer: BibleAnswer, flagged: bool }
       │
       ▼
DimensionPanel.tsx (client)
  renders: summary, 5 tabs, citations, key points
  shows "Under Review" badge if flagged: true
```

---

## 5. The 6-Stage Answer Pipeline

The pipeline replaces the single-shot Claude call. Each stage builds on the last, grounding the final answer in verified Scripture and historical Christian teaching. The AI acts as a **pastor presenting evidence** — not declaring the answer.

```
Question + RAG Context
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 1 — CLASSIFY                                      │
│  Identify: topic type, testament(s), book(s),            │
│  doctrine area, sensitivity level                        │
│  Output: routing metadata (feeds all later stages)       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 2 — SCRIPTURE SEARCH                              │
│  Fetch candidate verses from bible-api.com (real lookup) │
│  Claude selects most relevant from actual verse text     │
│  Output: verified verse list with full text              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 3 — SCRIPTURE ACCURACY CHECK                      │
│  Do these verses actually say what they appear to say?  │
│  Check context — is the passage being proof-texted?     │
│  Output: verified, contextualized verse set             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 4 — HISTORICAL & DOCTRINAL ANALYSIS              │
│  What do the Church Fathers say?                        │
│  What has orthodox Christianity consistently taught?    │
│  Flag honest denominational disagreements               │
│  Output: historical + doctrinal grounding               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 5 — PHILOSOPHICAL / THEOLOGICAL SYNTHESIS        │
│  Bring together Scripture + history + doctrine          │
│  Reason through tensions or apparent contradictions     │
│  Output: synthesized theological understanding          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stage 6 — FINAL ANSWER ASSEMBLY                        │
│  Compose 5-dimension BibleAnswer JSON                   │
│  Every claim traces back to a verified stage above      │
│  Confidence score reflects grounding quality            │
│  Present evidence — never declare the answer            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
                   BibleAnswer JSON
```

### Pipeline Principles

- **Scripture-first, always** — if a verse doesn't support a claim, the claim is dropped
- **No internet lookup** — Claude reasons from Scripture + internalized Church history; bible-api.com for verse text only
- **Pastor, not oracle** — present evidence and let the reader conclude
- **Honest uncertainty** — disputed topics surface multiple views; no tradition is silently favored
- **RAG-grounded** — approved moderator answers inject proven context into Stage 1

---

## 6. RAG System

Retrieval-Augmented Generation makes the pipeline progressively smarter as the canonical answer library grows.

### RAG Context Injection (Stage 1)

When similar approved answers exist, Claude receives:

```
VERIFIED MODERATOR-APPROVED CONTEXT:
The following answers were previously reviewed and approved
by human moderators (pastors and theologians). Use them as
grounding reference — do not contradict them without strong
scriptural justification.

[Similar Question 1]: ...
[Approved Answer Summary]: ...
[Scripture Used]: John 3:16, Romans 5:8...

[Similar Question 2]: ...
...

Answer the current question using the same standard of
scriptural grounding. Present the evidence; let the reader
draw their own conclusion.
```

### The Flywheel

```
More questions → more moderation → more canonical answers
→ better RAG context → better AI answers → more trust
→ more users → more questions → ...
```

### Long-Term Trajectory

| Timeframe | Canonical Answers | RAG Coverage |
|---|---|---|
| Day 1 | 0 | Cold start — no context |
| Month 1 | ~50 | ~20% of questions benefit |
| Month 6 | ~500 | ~60% of questions benefit |
| Year 1 | 2000+ | Near-encyclopedic; fine-tuning viable |

---

## 7. Moderation System

Human moderators — invited pastors and theologians — review flagged answers, vote on accuracy, and submit corrections backed by Scripture.

### Moderation Flow

```
Answer generated by pipeline
        │
        ├─── Auto-flag check ──────────────────────────────────┐
        │    (sensitive topic keyword detected OR user flags)   │
        │                                                       ▼
        │                                          Flag saved in DB
        │                                          answer.status = 'under_review'
        │                                          "Under Review" badge shown
        │                                          Moderators notified (Sigil)
        ▼                                                       │
Answer shown normally                          Moderators review queue at /mod
(status = 'approved')                                          │
                                               Each moderator can:
                                               ├── Vote: Accurate / Inaccurate
                                               ├── Submit correction + Scripture refs
                                               └── Write canonical answer text
                                                               │
                                               Threshold reached (3 votes)
                                                               │
                                                  ┌────────────┴────────────┐
                                                  ▼                         ▼
                                             APPROVED                  REJECTED
                                          stored as canonical      correction stored
                                          answer + embedding        shown in place of
                                          future questions          original answer
                                          served from cache
```

### Sensitive Topic Auto-Flag List (admin-editable)

- Creation / evolution
- Hell / eternal punishment
- Salvation / who is saved
- Women in ministry
- End times / eschatology
- LGBTQ+ and Scripture
- Divorce and remarriage
- Infant vs. believer baptism
- Catholic / Protestant / Orthodox disputes
- Any question containing "is it a sin to..."

---

## 8. Data Models

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
  status: 'approved' | 'under_review';  // NEW
  disclaimer?: string;
  created_at: string;
}

interface Dimension {
  title: string;
  content: string;       // 100-250 words — evidence-based, not declarative
  citations: string[];   // ["John 3:16", "Romans 8:28"] — verified in pipeline
  key_points: string[];  // 2-4 bullet highlights
}

// Pipeline internals
interface ClassificationResult {
  topic_type: string;
  testaments: string[];
  books: string[];
  doctrine_area: string;
  sensitivity_level: 'low' | 'medium' | 'high';
  auto_flag: boolean;
}

interface PipelineStage {
  stage: number;
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  duration_ms: number;
}
```

### Supabase Tables

```sql
-- Existing tables (unchanged)
answers (
  id UUID PRIMARY KEY,
  question TEXT,
  answer_json JSONB,
  translation VARCHAR(10),
  share_slug VARCHAR(16),
  status TEXT DEFAULT 'approved',    -- NEW: 'approved' | 'under_review'
  created_at TIMESTAMPTZ
)

rate_limits (
  ip_hash VARCHAR(64) PRIMARY KEY,
  count INT,
  window_start TIMESTAMPTZ
)

-- New: canonical approved answers with vector embeddings
canonical_answers (
  id              UUID PRIMARY KEY,
  question_hash   TEXT UNIQUE,       -- hash of normalized question
  question        TEXT,
  answer_json     JSONB,             -- approved BibleAnswer
  embedding       vector(1536),      -- pgvector: question embedding
  approved_by     UUID REFERENCES moderators(id),
  vote_count      INT DEFAULT 0,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)

-- Vector similarity index
CREATE INDEX canonical_answers_embedding_idx
  ON canonical_answers
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Invited moderators
moderators (
  id          UUID PRIMARY KEY,
  email       TEXT UNIQUE,
  name        TEXT,
  role        TEXT DEFAULT 'moderator',  -- 'moderator' | 'admin'
  invited_by  UUID REFERENCES moderators(id),
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ
)

-- Flags on answers requiring review
flags (
  id            UUID PRIMARY KEY,
  answer_id     UUID REFERENCES answers(id),
  question      TEXT,
  flag_type     TEXT,    -- 'auto' | 'user'
  flag_reason   TEXT,    -- topic category or user-submitted note
  status        TEXT DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at    TIMESTAMPTZ
)

-- Moderator votes on a flagged answer
moderation_votes (
  id              UUID PRIMARY KEY,
  flag_id         UUID REFERENCES flags(id),
  moderator_id    UUID REFERENCES moderators(id),
  vote            TEXT,        -- 'accurate' | 'inaccurate'
  correction      TEXT,        -- optional written correction
  scripture_refs  TEXT[],      -- Scripture backing the correction
  created_at      TIMESTAMPTZ,
  UNIQUE(flag_id, moderator_id)  -- one vote per moderator per flag
)

-- Admin-editable sensitive topic keywords
flagged_topics (
  id        UUID PRIMARY KEY,
  keyword   TEXT UNIQUE,
  category  TEXT,
  active    BOOLEAN DEFAULT true
)
```

---

## 9. Security Model

| Control | Implementation |
|---|---|
| **API key isolation** | `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `process.env` only — never in client bundle |
| **Rate limiting** | 15 questions/hour/IP — checked before every Claude call |
| **IP privacy** | IPs are SHA-256 hashed with a salt — raw IPs never stored |
| **Input validation** | Server-side: min 5 chars, max 500, whitespace-normalized |
| **Supabase RLS** | `answers`: public SELECT, service-role INSERT. `canonical_answers`, `flags`, `moderation_votes`, `moderators`: service-role only |
| **Moderator auth** | Supabase Auth (email, invite-only) — all `/api/mod/*` routes validate session before any data access |
| **Sigil webhook auth** | HMAC-SHA256 via `x-bibledesk-signature` header — timing-safe comparison |
| **Build verification** | `next build` must pass with zero secrets in client chunks before every deploy |

---

## 10. Cost Model

| Component | Cost per question |
|---|---|
| Embedding generation | ~$0.0001 |
| Vector search (Supabase pgvector) | ~$0.00 (included) |
| Pipeline — 3–4 Claude calls | ~$0.03–0.12 |
| RAG cache hit (canonical served) | ~$0.0001 (no Claude call) |
| **Typical total** | **~$0.03–0.12** |

Rate limit of 15/hr caps worst-case at ~$1.80/user/hr during development.

---

## 11. ShadowRealm Network Integration

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
    confidence,
    flagged: boolean
  }
```

### Sigil Faith Package Commands

| Command | Behavior with BibleDesk |
|---|---|
| `/bible` | Posts a daily verse — can call BibleDesk for enriched context |
| `/devotional` | Morning devotional — BibleDesk supplies 5-dimension depth |
| `/sermon` | Sermon notes — BibleDesk content posted to Discord channel |
| `/prayer` | Prayer requests — stored in Supabase, surfaced in Discord |

Sigil also receives **moderator notifications** when a flagged answer enters the review queue.

---

## 12. Design System

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

**Moderation UI:** "Under Review" badge in amber (`#e67e42`) with lock icon. Moderator dashboard inherits the same dark navy design system.

---

## 13. Phase Roadmap

Aligned with [TODO.md](TODO.md) and [README.md](README.md). Older “Phase 1–5 AI-first” labels are retired.

| Stage | Scope | Status |
|---|---|---|
| **0 — Local Bible foundation** | Module format, public-domain ingest, local read/search/compare, Strong's Greek/Hebrew lexicons, TSK cross-refs, Quick Jump modal, Chrome Extension MV3 | ✅ **Complete** |
| **1 — Study tools** | Notes, highlights, bookmarks, plans (local-first + sync) | ✅ Complete (localStorage + deep-linked plans) |
| **2 — Original language** | OpenScriptures + Strong’s dictionaries (5.5k Greek, 8.6k Hebrew), token word study & concordance | ✅ Complete (`/api/bible/lexicon` + offline data) |
| **3 — Offline + sync** | Bundled content packs (6 translations), offline personal data, Chrome side panel | ✅ Complete |
| **4 — AI assistant** | Passage-grounded assistant on local text + lexicon | ◐ Pipeline/RAG/streaming + lexicon integration |
| **5 — Platform** | Share, mod, MCP, Sigil, church tools, SaaS | ◐ Prototyped in-repo; polish after foundation |

### Built ahead of Stage 0 (keep)

- 6-stage pipeline, streaming ask, rate limits, RAG, share `/share/[slug]`
- `/bible` UI, graph, MCP, history, prayer, sermons, catechism/creeds/memory/plans
- Moderation APIs + `/mod`, login wiring, Electron desktop

### Explicit non-goals until Stage 0 exits

- Marketing “offline Strong’s” or Midvash modules
- Treating bible-api.com as permanent architecture
- SaaS monetization before foundation + deploy smoke tests

---

*Architecture maintained by ShadowWalkerNC · Updated: 2026-08-09*
