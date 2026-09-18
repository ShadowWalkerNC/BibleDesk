# BibleDesk Architecture

> **Status:** Phase 0 — local-first Bible foundation
> **Updated:** 2026-09-13

BibleDesk is a Next.js 16 and React 19 web application. Its product center is the bundled public-domain Bible reader and search experience. AI, Supabase-backed accounts, public prayer, and Google Prayer Care exports are optional server capabilities.

## Active product surfaces

| Surface | Purpose |
|---|---|
| `/` | Public overview for signed-out visitors; study launcher and optional 5-dimension assistant for signed-in users |
| `/bible` | Local chapter reading, translation compare, search, notes, highlights, lexicon and cross-reference study |
| `/study-resources` | Plans, daily reading, memory, catechisms, creeds and encouragement in one hub |
| `/prayer` | Local private commitments and the consent-based public Prayer Atlas |
| `/developers` | REST API, SDK and MCP documentation |
| `/download` | PWA installation guidance and accurate status of parked native shells |
| `/pricing` | Transparent Kingdom-first pricing and Pro SaaS membership tiers |
| `/login` | Supabase authentication, with a local profile only when Supabase is intentionally unconfigured |
| `/mod` | Server-authorized moderation UI |
| `/share/[slug]` | Public shared study answers |

Sermons, church tools, creator pages, the graph explorer UI, radio, Discord and WhatsApp bots, and native wrappers are outside the web MVP. Preserved work lives under `archive/`. Direct `wa.me` sharing remains a client-side convenience.

## Runtime layers

```text
Browser / installed PWA
  ├─ bundled Bible modules, Strong's lexicons and TSK data
  ├─ local notes, highlights and private prayer commitments
  └─ authenticated requests with a Supabase access token

Next.js server routes
  ├─ Bible, daily, graph, export (Obsidian with personal notes), and MCP APIs
  ├─ Stripe checkout, portal, and webhook billing lifecycle
  ├─ rate-limited Gemini/AI answer pipeline
  ├─ owner-scoped Prayer Care APIs
  ├─ consent-gated public prayer submission
  └─ moderation and HMAC-protected Sigil endpoint

External services when configured
  ├─ Supabase Postgres/Auth/pgvector
  ├─ Google Gemini and OpenAI embeddings
  ├─ Stripe for subscription billing & Customer Portal
  └─ Google OAuth for Calendar events and Gmail draft creation
```

## Security boundaries

- Server keys never enter the browser bundle.
- Paid AI routes are rate limited. AI output must preserve the five dimensions and cite Scripture.
- Prayer Care derives ownership from a verified Supabase bearer token. Request JSON cannot select an owner.
- Public Atlas submission requires explicit consent and creates a pending moderation record. Private local commitments are not published by escalation alone.
- Google tokens are encrypted at rest in `google_connections`, which is accessed only with the service role.
- Gmail export requires a reviewed request and creates an editable draft. There is no automatic send path.
- Billing portal (`/api/billing/portal`) derives customer identity solely from verified Supabase sessions.
- Obsidian export with personal notes verifies Pro/Ministry tier or `NEXT_PUBLIC_SELF_HOSTED=true` before inclusion.
- `/api/v1/bible/answer` retains the Sigil-compatible HMAC contract.

## Data and migrations

For turnkey deployment on a fresh Supabase project, execute the consolidated initialization script in one step:

`supabase/schema-init.sql`

Alternatively, the sequential canonical migration chain can be run in order:

`schema.sql` → `schema-v2.sql` → `schema-v3.sql` → `schema-v4.sql` → `schema-v5.sql` → `schema-v6.sql` → `schema-v7.sql` → `schema-v8.sql` → `schema-v9.sql` → `schema-v10-public-prayer.sql` → `rpc.sql` → `migrations/20260918_saas_subscriptions.sql`

The repository build and mocked boundary tests do not prove these migrations against a live database. A fresh-schema run, existing-schema upgrade run, RLS verification, and cross-user denial test are release gates.

## Deployment model

BibleDesk supports both Vercel cloud hosting and turnkey Docker containerization (`Dockerfile` and `docker-compose.yml`):
- Run `docker compose up -d` for an instant self-hosted production container (`NEXT_PUBLIC_SELF_HOSTED=true` by default, unlocking all Pro features for self-hosted instances).
- Run `npm run check:env` to validate environment variables, keys, and database connectivity.
- Vercel is the primary hosted web target. `NEXT_PUBLIC_APP_URL` must be the canonical HTTPS origin so metadata, OAuth callbacks, sitemap URLs and share links agree.

Native Android, Electron and Chrome extension packages are parked under `archive/` and are not advertised as downloadable releases.

## Key directories

```text
src/app/                 active pages and route handlers
src/components/          product UI and navigation
src/lib/bibleModules/    bundled public-domain Scripture modules
src/lib/data/            Strong's and TSK data
packages/sdk/            TypeScript/JavaScript client SDK
supabase/                ordered schema and RPC SQL
archive/                 preserved, non-MVP product work
public/                  PWA manifest and static assets
```

See [README.md](README.md) for setup and [TODO.md](TODO.md) for the current release gates.
