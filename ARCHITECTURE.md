# BibleDesk — Architecture

> **Status:** Phase 1 complete → Phase 2 in progress (Pipeline + RAG + Moderation)
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
│   │  3. Generate embedding → vector search canonical_answers│       │
│   │  4. Run 6-stage pipeline (with RAG context if matched)  │       │
│   │  5. Auto-flag check → notify moderators if flagged      │       │
│   │  6. Save answer + embedding to Supabase                 │       │
│   │  7. Return structured BibleAnswer JSON                  │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│   src/app/api/v1/bible/answer/route.ts  (Sigil webhook)             │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │  1. Verify HMAC-SHA256 x-bibledesk-signature           │       │
│   │  2. Run pipeline                                        │       │
│   │  3. Return compact JSON for Discord embeds             │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│   src/app/api/mod/  (moderator routes — auth-gated)                 │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │  GET  /api/mod/queue     — pending flags                │       │
│   │  POST /api/mod/vote      — submit vote + correction     │       │
│   │  POST /api/mod/approve   — promote to canonical         │       │
│   │  POST /api/mod/invite    — invite a new moderator       │       │
│   └─────────────────────────────────────────────────────────┘       │
└────────────────┬──────────────────────┬─────────────────────────────┘
                 │                      │
                 ▼                      ▼
   ┌─────────────────────┐   ┌─────────────────────────────────┐
   │    Anthropic API    │   │           Supabase               │
   │  claude-sonnet-4-5  │   │  PostgreSQL + pgvector + RLS     │
   │                     │   │  ┌──────────────────────────┐    │
   │  6-stage pipeline   │   │  │ answers                  │    │
   │  RAG context inject │   │  │ rate_limits              │    │
   │  Scripture grounded │   │  │ canonical_answers + vec  │    │
   │                     │   │  │ flags                    │    │
   │  Embeddings API     │   │  │ moderation_votes         │    │
   │  (question vectors) │   │  │ moderators               │    │
   └─────────────────────┘   │  │ flagged_topics           │    │
                              │  └──────────────────────────┘    │
                              └─────────────────────────────────┘

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
| **AI** | Anthropic Claude Sonnet 4.5 | Best quality/cost balance; structured JSON output; ~$0.03–0.12/question (pipeline) |
| **Embeddings** | Anthropic Embeddings API | Question vectorization for RAG similarity search |
| **Bible Data** | bible-api.com | Free, no API key, public domain (KJV/WEB/ASV), clean JSON |
| **Database** | Supabase (PostgreSQL + pgvector) | Managed, free tier, RLS built-in, vector similarity search |
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
│   │   │   ├── mod/
│   │   │   │   ├── queue/route.ts        ← GET: pending moderation flags
│   │   │   │   ├── vote/route.ts         ← POST: submit vote + correction
│   │   │   │   ├── approve/route.ts      ← POST: promote to canonical answer
│   │   │   │   └── invite/route.ts       ← POST: invite a new moderator
│   │   │   └── v1/bible/answer/route.ts  ← POST: Sigil webhook (HMAC auth)
│   │   │                                   GET:  health check
│   │   ├── mod/                          ← Moderator dashboard UI (Phase 3)
│   │   │   ├── page.tsx                  ← Moderation queue view
│   │   │   └── page.module.css
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
│   │   ├── claude.ts                     ← Anthropic client — calls pipeline (SERVER ONLY)
│   │   ├── pipeline.ts                   ← 6-stage answer orchestrator (Phase 2)
│   │   ├── rag.ts                        ← Embedding generation + vector search (Phase 2)
│   │   ├── moderation.ts                 ← Flag detection, vote logic, canonical store (Phase 3)
│   │   ├── bible.ts                      ← bible-api.com client (Stage 2 of pipeline)
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
  3. Generate question embedding (Anthropic)
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

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Basic AI answer — 5 dimensions, rate limiting, Supabase storage, Sigil integration | ✅ Complete |
| **Phase 2** | 6-stage pipeline + real verse lookup via bible-api.com + RAG infrastructure (embeddings + pgvector) | 🔨 In Progress |
| **Phase 3** | Moderation system — invite-only auth, flag detection, voting UI at `/mod`, canonical answer store | 📋 Specced |
| **Phase 4** | RAG fully active; Sigil moderator notifications; answer share pages at `/answer/:slug` | 📋 Planned |
| **Phase 5** | Fine-tuning consideration once 1000+ canonical answers exist; SaaS tier evaluation | 🔭 Future |

---

*Architecture maintained by ShadowWalkerNC · Updated: 2026-06-27*
