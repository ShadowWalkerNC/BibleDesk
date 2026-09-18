# BibleDesk release plan

> **Phase:** Phase 0 — local-first Bible foundation
> **Updated:** 2026-09-13

## Verified in the current branch

- [x] Six bundled public-domain translations read and search without a network connection.
- [x] Strong's Greek/Hebrew lexicons and TSK cross-references are bundled.
- [x] Study Desk, Study Resources, Prayer, Developers, Download, Login, Moderation, Pricing and share surfaces compile.
- [x] Five-dimension assistant, streaming, rate limiting, SDK, REST API, MCP and Sigil HMAC endpoint remain in scope.
- [x] Turnkey deployment suite ready: multi-stage Dockerfile, docker-compose.yml, and environment doctor (`npm run check:env`).
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
- [x] Next.js production build, TypeScript check and security boundary tests pass.
- [x] Production dependency audit reports zero known vulnerabilities.
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

- [ ] Reduce the remaining ESLint warnings in active code, especially hook dependency and unused-value warnings.
- [ ] Add live migration/RLS tests; mocked route tests are insufficient for the database boundary.
- [ ] Import and attribute a complete verse-level Greek and Hebrew tagging corpus before enabling clickable original-language words. Candidate sources are OSHB for the Hebrew Bible and an openly licensed tagged Greek New Testament; validate versification and Strong's alignment during ingestion.
- [ ] Add behavior tests for Google token refresh, revoked consent and duplicate Calendar/draft requests.
- [ ] Decide whether authenticated local prayer data should sync to Supabase; do not claim sync until implemented and tested.
- [ ] Add a service worker and cache policy before describing the whole PWA as offline. Bundled Scripture reading/search is the verified offline capability.
- [ ] Review public AI copy against observed grounding quality and keep citations framed as a requirement, not a guarantee.

## Parked scope

Sermons, church and creator suites; the graph explorer UI; worship radio; Discord and WhatsApp bots; and Android, Electron and Chrome extension packaging are preserved under `archive/`. They are not part of the current public web release. Reintroduce each only with its own security, UX and deployment review.

See [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries and [README.md](README.md) for setup.
