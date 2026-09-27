# BibleDesk release plan

> **Phase:** Phase 0 — local-first Bible foundation
> **Updated:** 2026-09-19

## Verified in the current branch

- [x] Six bundled public-domain translations read and search without a network connection.
- [x] Strong's Greek/Hebrew lexicons and TSK cross-references are bundled.
- [x] Study Desk, Study Resources, Prayer, Developers, Download, Login, Moderation, Pricing and share surfaces compile.
- [x] Five-dimension assistant, streaming, rate limiting, SDK, REST API, MCP and Sigil HMAC endpoint remain in scope.
- [x] Turnkey deployment suite ready: multi-stage Dockerfile, docker-compose.yml, railway.json, dedicated `/api/health` endpoint, and environment doctor (`npm run check:env`).
- [x] Railway cloud hosting compatibility: Next.js standalone output mode, dynamic `$PORT` binding, unified web/API server, and automatic `RAILWAY_PUBLIC_DOMAIN` origin detection.
- [x] Consolidated single-file database migration (`supabase/schema-init.sql`) bundles all 12 schemas into a 1-click execution.
- [x] First-run Onboarding Modal (`OnboardingModal.tsx`) personalizes translation, study persona, and AI mode.
- [x] Dual-tier Open Core & SaaS architecture established: 100% Free Core Scripture + Pro/Ministry Cloud Tiers (`src/lib/tiers.ts`, `/pricing`, `/api/billing/*`).
- [x] Stripe Customer Portal endpoint (`/api/billing/portal`) enables self-service subscription and billing management.
- [x] Pro & Ministry membership badges displayed dynamically in Header, Sidebar, and Mobile navigation.
- [x] Personal Obsidian Vault (.zip) export bundles user study notes and theological knowledge graph with Pro gating.
- [x] Printable passage study worksheet (`StudyGuideModal.tsx`) with `@media print` layout.
- [x] Turnkey self-hosted mode default (`NEXT_PUBLIC_SELF_HOSTED=true`) in Docker Compose grants all Pro capabilities out-of-the-box.
- [x] Personal verse notes cloud sync: real-time dual-write to Supabase `verse_notes` table with `localStorage` offline cache and auto-merge on login.
- [x] Isomorphic TypeScript client SDK (`@bibledesk/sdk`) builds cleanly to ESM and CJS with automated unit tests.
- [x] Private local prayer commitments remain separate from consent-based public Atlas records.
- [x] Prayer Care API ownership is derived from verified Supabase sessions.
- [x] Google Calendar export and reviewed Gmail draft creation use direct per-user BibleDesk OAuth; Gmail has no send path.
- [x] Relational PostgreSQL database tables and Drizzle ORM schema (`scripture_verses`, `cross_references`, `commentaries`, `study_notes`, `study_collections`, `collection_items`, `research_findings`).
- [x] Zero-config dual database runtime: embedded WASM PostgreSQL (`@electric-sql/pglite`) or external PostgreSQL (`DATABASE_URL`).
- [x] Seeding pipeline loads 910 scripture verses, 647 cross-references, 5-dimension commentaries, notes, and collections (`npm run db:seed`).
- [x] Multi-factor 5-dimension evidence and confidence scoring algorithm ($w_1=0.30, w_2=0.20, w_3=0.20, w_4=0.15, w_5=0.15$) with transparent factor breakdown and rating tiers (High/Moderate/Low).
- [x] Anthropic Claude 3.5 Sonnet research assistant endpoint (`POST /api/research`) with web search and verifiable, traceable citations.
- [x] Dedicated Research Assistant workbench (`/research`) and integrated Study Desk tab (`/bible` Research Tab).
- [x] Unified full-text search (`GET /api/search`) across scripture verses, 5-dimension commentary, and personal notes.
- [x] Personal study notes CRUD (`/api/notes`) and thematic study collections (`/api/collections`) persisted per user in PostgreSQL.
- [x] 32 automated tests passing with zero failures across unit, database, API, and end-to-end critical path suites (`npm test`).
- [x] Responsive Desktop, Tablet, and Mobile multi-device architecture with device-tailored UI/UX: Desktop admin workspace (dashboards, bulk actions, audit logs, 3-column desk), Tablet touch oversight (56px compact rail, 2-pane reader, 48px targets), and Mobile operational engine (bottom nav rail, distraction-free reading canvas, Rapid Triage moderation deck, Today's Prayers checklist).
- [x] Turnkey Guided Onboarding Flow (`OnboardingModal.tsx`): 4-step progressive wizard with sensible defaults, optional starter workspace auto-load, and real-time Gemini API key validation with plain-language status feedback.
- [x] System Health, Diagnostics & Recovery Hub (`/system` & `GET /api/system/diagnostics`): real-time diagnostic checks for 6 scripture modules, PostgreSQL/PGlite relational database, Strong's lexicons, TSK cross-references, AI service readiness, and cloud sync.
- [x] 1-Click Safe Maintenance & Repair Operations (`POST /api/system/repair`): single-click starter study data seeding, database index and table verification, and live AI connectivity diagnostics.
- [x] Complete Data Portability & Disaster Recovery: export full workspace JSON backup (notes, collections, prayer commitments, highlights, reading plans) and safe restore with preview confirmation dialog.
- [x] Commercial-Grade Plain Language & Purposeful Empty States: replaced vague labels and raw errors with action-oriented buttons ("Record Verification Vote", "Promote Answer to Canonical", "Investigate Question", "Save to Study Notes") and informative empty states with clear next actions across `/bible`, `/research`, `/prayer`, and `/mod`.
- [x] Real-world UAT inspection via Chrome DevTools Protocol across Desktop (1440×900), Tablet (820×1180), and Mobile (390×844) with 26 clean screenshots, 0 console errors, and comprehensive 31-step user testing checklist.
- [x] Responsive layout refinements: stacked mobile header actions on `/prayer`, neutral pulsing `Verifying...` status pills on `/system` to eliminate initial status flash, tablet flex-wrap for 5D preview tabs, and safe-area inset protection (`env(safe-area-inset-bottom)`) with Next.js dev indicator disabled (`devIndicators: false`) to safeguard mobile navigation.
- [x] Next.js 16.3.5 production build and TypeScript check exit 0 with clean page generation across 32 routes.
- [x] Active navigation, sitemap, and pricing marketing reflect the web MVP and SaaS tiers.

## Required before a public production launch

- [ ] Create or select the production Supabase project.
- [ ] Apply `supabase/schema-init.sql` in the Supabase SQL editor (consolidates all 12 schemas in 1 run).
- [ ] Test both a fresh install and an upgrade of an existing schema.
- [ ] Verify owner-only RLS and service-role isolation, including cross-user denial cases for Prayer Care and `google_connections`.
- [ ] Configure the Vercel or Docker environment from `.env.example`; use a canonical HTTPS `NEXT_PUBLIC_APP_URL`.
- [ ] Configure the Google OAuth consent screen, client, callback URL, Calendar/Gmail APIs and token encryption key.
- [ ] Verify the production bundle does not expose server-only secrets.
- [ ] Run authenticated production smoke tests for login, notes cloud sync, Prayer Care CRUD, ICS, Calendar export, reviewed Gmail draft creation and Google disconnect.
- [ ] Run public smoke tests for Bible read/search, study resources, Atlas privacy, AI rate limiting, share pages, SDK/API docs, sitemap and robots.
- [ ] Confirm monitoring and rollback ownership before announcing availability.

## High-priority follow-up

- [x] Reduce the remaining ESLint warnings in active code: achieved 0 errors, 0 warnings across all project code and scripts.
- [ ] Add live migration/RLS tests; mocked route tests are insufficient for the database boundary.
- [ ] Import and attribute a complete verse-level Greek and Hebrew tagging corpus before enabling clickable original-language words. Candidate sources are OSHB for the Hebrew Bible and an openly licensed tagged Greek New Testament; validate versification and Strong's alignment during ingestion.
- [ ] Add behavior tests for Google token refresh, revoked consent and duplicate Calendar/draft requests.
- [ ] Decide whether authenticated local prayer data should sync to Supabase; do not claim sync until implemented and tested.
- [ ] Add a service worker and cache policy before describing the whole PWA as offline. Bundled Scripture reading/search is the verified offline capability.
- [ ] Review public AI copy against observed grounding quality and keep citations framed as a requirement, not a guarantee.

## Parked scope

Sermons, church and creator suites; the graph explorer UI; worship radio; Discord and WhatsApp bots; and Android, Electron and Chrome extension packaging are preserved under `archive/`. They are not part of the current public web release. Reintroduce each only with its own security, UX and deployment review.

See [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries and [README.md](README.md) for setup.
