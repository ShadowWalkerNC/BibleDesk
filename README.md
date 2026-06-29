# BibleDesk ✦

<!-- TODO: add live URL once deployed, e.g. > 🌐 **Live:** https://bibledesk.vercel.app -->

**Free AI-powered Bible study platform — ask any question, get 5-dimension sourced answers grounded in Scripture.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

---

## What is BibleDesk?

BibleDesk lets anyone ask any Bible question and receive a structured, multi-dimensional answer grounded in scripture — for free.

Unlike general AI tools, every BibleDesk answer is organized across **5 study dimensions**:

| Dimension | What it covers |
|---|---|
| 📖 **Scripture** | Direct verse analysis, cross-references, surrounding context |
| 🏛️ **Historical Context** | Cultural, political, social world of the time period |
| 🔤 **Original Language** | Hebrew/Greek word meanings, nuance, translation choices |
| ✝️ **Theological Meaning** | Church teaching, scholarly interpretation across traditions |
| 🌱 **Practical Application** | How this applies to life, family, church, and youth today |

Built for **churches, pastors, youth groups, and anyone** seeking deeper Bible understanding.

---

## Getting Started

### Prerequisites

- Node.js 20+
- [Supabase](https://supabase.com) project (free tier works)
- [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
git clone https://github.com/ShadowWalkerNC/BibleDesk
cd BibleDesk
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys (see Environment Variables below)

# Set up database — MANUAL STEP
# 1. Open your Supabase project → SQL Editor
# 2. Copy the contents of supabase/schema.sql and run it
# 3. This creates: answers, bookmarks, mod_queue, rate_limit tables with RLS enabled

# Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Manual Setup Steps

These steps are required before the app will function correctly. They cannot be automated.

### 1. Supabase Schema

Copy `supabase/schema.sql` into your Supabase project → **SQL Editor** and run it. This creates all required tables:

| Table | Purpose |
|---|---|
| `answers` | All AI-generated answers with `answer_json`, `share_slug`, `translation`, `created_at` |
| `bookmarks` | Saved answers — `answer_id`, `share_slug`, `question`, `created_at` |
| `mod_queue` | Moderation queue — flagged answers pending human review |
| `rate_limit` | Per-IP request tracking (IPs stored as hashed values only) |

> **RLS is enabled on all tables.** The app uses a service role key server-side and the anon key client-side. Do not disable RLS.

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key — [get one here](https://console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, never expose) |
| `MOD_SECRET` | Secret password to access the `/mod` moderator dashboard |
| `BIBLEDESK_WEBHOOK_SECRET` | Shared HMAC secret for Sigil Discord bot webhook auth |

### 3. Sigil Discord Integration (Optional)

If connecting to the [Sigil Discord bot](https://github.com/ShadowWalkerNC/Sigil):

```bash
# In Sigil's .env:
BIBLEDESK_API_URL=https://your-bibledesk-url.vercel.app
BIBLEDESK_WEBHOOK_SECRET=your-shared-secret

# In BibleDesk's .env.local:
BIBLEDESK_WEBHOOK_SECRET=your-shared-secret
```

Both values must match exactly. Sigil calls `POST /api/v1/bible/answer` using HMAC-SHA256 signatures via the `x-bibledesk-signature` header.

---

## Architecture

```
BibleDesk (Next.js 15, App Router)
│
├── src/app/
│   ├── page.tsx                      ← Homepage (search + answer display)
│   ├── history/                      ← /history — paginated, searchable answer history
│   ├── bookmarks/                    ← /bookmarks — saved answers (Supabase-backed)
│   ├── graph/                        ← /graph — knowledge graph visualization
│   ├── share/[slug]/                 ← /share/[slug] — SSR public share page
│   ├── mod/                          ← /mod — moderator dashboard (auth-protected)
│   └── api/
│       ├── ask/                      ← POST — main AI answer endpoint (rate-limited)
│       ├── history/                  ← GET — paginated history with search + confidence filter
│       ├── bookmarks/                ← GET / POST / DELETE — bookmark CRUD
│       ├── graph/                    ← GET — knowledge graph data
│       ├── export/                   ← GET — answer data export
│       ├── mod/                      ← GET / POST — moderation queue API
│       ├── mcp/                      ← POST — MCP external integration endpoint
│       └── v1/bible/answer/          ← POST — Sigil Discord bot webhook
│
├── src/lib/
│   ├── claude.ts                     ← Anthropic client (SERVER ONLY)
│   ├── bible.ts                      ← bible-api.com client (free, no key required)
│   ├── supabase.ts                   ← DB client (getServerClient / getBrowserClient)
│   ├── pipeline.ts                   ← 5-dimension answer generation pipeline
│   ├── graph.ts                      ← Knowledge graph builder
│   ├── rag.ts                        ← Vector similarity / RAG pipeline
│   ├── moderation.ts                 ← Content moderation logic
│   ├── rate-limit.ts                 ← 15 req/hour/IP (IPs hashed, never stored raw)
│   └── mod-auth.ts                   ← Moderator authentication
│
├── src/components/
│   ├── SearchBar/                    ← Question input + translation selector
│   ├── DimensionPanel/               ← 5-tab answer UI (Scripture, Historical, Language, Theological, Practical)
│   ├── GraphView/                    ← Knowledge graph visualization
│   ├── StreamingProgress/            ← Real-time loading stages during answer generation
│   ├── BookmarkButton/               ← ☆/★ toggle — saves answer to Supabase bookmarks
│   ├── RateLimitBar/                 ← Usage quota display
│   ├── Header/                       ← Site navigation
│   └── Toast/                        ← Notification system
│
└── src/hooks/
    └── useBookmarks.ts               ← Bookmark state management hook
```

### Bible API

BibleDesk uses [bible-api.com](https://bible-api.com) — completely free, no API key required, public domain translations (KJV, WEB, ASV). Multi-translation support (KJV, NIV, ESV, NASB, and more) is handled via the `SearchBar` translation selector.

### AI Model

Claude Sonnet 4.5 via Anthropic API. All API calls are server-side only — the key never reaches the browser. Answers are streamed in real time via the `useStreamingAsk` hook and `StreamingProgress` component.

### Answer Storage

Every answer is saved to Supabase with a unique `share_slug`, enabling:
- **Shareable permalinks** — `/share/[slug]` SSR page
- **Answer history** — `/history` with search and confidence filtering
- **Bookmarks** — users can star any answer; stored in the `bookmarks` table

---

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Homepage — ask a question, get a streamed 5-dimension answer |
| `/history` | Paginated, searchable answer history from Supabase |
| `/bookmarks` | Saved/starred answers, searchable and manageable |
| `/graph` | Knowledge graph — entity and concept linking across answers |
| `/share/[slug]` | Public SSR share page for any answered question |
| `/mod` | Moderator dashboard — auth-protected, review queue |

| API Route | Method(s) | Description |
|---|---|---|
| `/api/ask` | POST | Main AI answer endpoint (streaming, rate-limited) |
| `/api/history` | GET | Paginated history with search + confidence filter |
| `/api/bookmarks` | GET, POST, DELETE | Bookmark CRUD |
| `/api/graph` | GET | Knowledge graph data |
| `/api/export` | GET | Answer data export |
| `/api/mod` | GET, POST | Moderation queue |
| `/api/mcp` | POST | MCP external integration |
| `/api/v1/bible/answer` | POST | Sigil Discord bot webhook (HMAC-auth) |

---

## Sigil Discord Integration

BibleDesk is a node in the [ShadowRealm Network](https://github.com/ShadowWalkerNC/Sigil) alongside the Sigil Discord bot.

Sigil's `faith` package (`/bible`, `/devotional`, `/sermon`, `/prayer`) calls `POST /api/v1/bible/answer` to power AI-generated answers directly in Discord servers.

**Auth:** HMAC-SHA256 signature via `x-bibledesk-signature` header. See [Manual Setup Steps](#3-sigil-discord-integration-optional) above.

---

## Security

- Anthropic API key is server-only — never in client bundle
- Supabase service role key is server-only
- Rate limiting: 15 questions/hour/IP (IPs are hashed, never stored raw)
- Input sanitization on all user-supplied questions
- HMAC signature verification on Sigil webhook endpoint
- Supabase RLS enabled on all tables
- Moderator dashboard protected via `lib/mod-auth.ts`

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1 — AI Study Core** | ✅ **Complete** | Question → streaming 5-dimension AI answer, share slugs, history |
| **Phase 2 — Bookmarks & Graph** | 🔨 **In Progress** | Bookmark saved answers, knowledge graph, RAG pipeline |
| **Phase 3 — Moderation** | 🔨 **In Progress** | Mod dashboard, flagging, answer review queue |
| **Phase 4 — Scholar Layer** | 📋 Planned | Scholar viewpoints, radar chart, answer versioning, pgvector search |
| **Phase 5 — Church Tools** | 📋 Planned | Reading plans, sermon prep, prayer boards, user accounts |
| **Phase 6 — Public Launch** | 📋 Planned | BibleDesk.org marketing site, donations, church/seminary partnerships |

---

## Contributing

PRs welcome. See [AGENTS.md](AGENTS.md) for project rules and agent configuration.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built with ✦ for churches, pastors, youth groups, and seekers everywhere.*
