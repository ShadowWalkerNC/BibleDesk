# BibleDesk ✦

**Free AI-powered Bible study platform — 5-dimension sourced answers for churches, pastors, and anyone seeking truth.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
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
# Edit .env.local with your API keys

# Set up database
# Copy supabase/schema.sql into your Supabase SQL editor and run it

# Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

See [`.env.example`](.env.example) for all variables. Required for basic operation:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key — [get one here](https://console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |

---

## Architecture

```
BibleDesk (Next.js 16, App Router)
│
├── src/app/
│   ├── page.tsx                    ← Homepage (search + answer display)
│   ├── api/ask/route.ts            ← Main AI endpoint (POST, rate-limited)
│   └── api/v1/bible/answer/        ← Sigil Discord bot webhook
│
├── src/lib/
│   ├── claude.ts                   ← Anthropic client (SERVER ONLY)
│   ├── bible.ts                    ← bible-api.com client (free, no key)
│   ├── supabase.ts                 ← Database client
│   └── rate-limit.ts               ← 15 req/hour/IP limiting
│
└── src/components/
    ├── SearchBar/                  ← Question input
    └── DimensionPanel/             ← 5-tab answer display
```

### Bible API

BibleDesk uses [bible-api.com](https://bible-api.com) — completely free, no API key required, public domain translations (KJV, WEB, ASV).

### AI Model

Claude Sonnet 4.5 via Anthropic API. All API calls are server-side — the key never reaches the browser.

---

## Sigil Discord Integration

BibleDesk is a node in the [ShadowRealm Network](https://github.com/ShadowWalkerNC/Sigil) alongside the Sigil Discord bot.

**Endpoint:** `POST /api/v1/bible/answer`

Sigil's `faith` package (`/bible /devotional /sermon /prayer`) can call this endpoint to power AI-generated answers directly in Discord servers.

**Auth:** HMAC-SHA256 signature via `x-bibledesk-signature` header. Set `BIBLEDESK_WEBHOOK_SECRET` in both apps.

```bash
# In Sigil's .env:
BIBLEDESK_API_URL=https://your-bibledesk-url.vercel.app
BIBLEDESK_WEBHOOK_SECRET=your-shared-secret

# In BibleDesk's .env.local:
BIBLEDESK_WEBHOOK_SECRET=your-shared-secret
```

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1 — AI Study Core** | ✅ **In development** | Question → 5-dimension AI answer |
| **Phase 2 — Bible Reader** | 📋 Planned | Full chapter/verse browser, Strong's concordance, commentaries |
| **Phase 3 — Church Tools** | 📋 Planned | Reading plans, sermon prep, prayer boards, auth/accounts |
| **Phase 4 — Integrations** | 📋 Planned | Full Sigil/Discord integration, webhooks |
| **Phase 5 — SaaS** | 📋 Planned | Free + $5/mo personal + church packages |

---

## Security

- Anthropic API key is server-only — never in client bundle
- Supabase service key is server-only
- Rate limiting: 15 questions/hour/IP (IPs are hashed, never stored raw)
- Input sanitization on all user-supplied questions
- HMAC signature verification on Sigil webhook endpoint
- Supabase RLS on all tables

---

## Contributing

PRs welcome. See [AGENTS.md](AGENTS.md) for project rules and agent configuration.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built with ✦ for churches, pastors, youth groups, and seekers everywhere.*
