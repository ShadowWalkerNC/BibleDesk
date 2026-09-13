# BibleDesk release plan

> **Phase:** Phase 0 — local-first Bible foundation
> **Updated:** 2026-09-13

## Verified in the current branch

- [x] Six bundled public-domain translations read and search without a network connection.
- [x] Strong's Greek/Hebrew lexicons and TSK cross-references are bundled.
- [x] Study Desk, Study Resources, Prayer, Developers, Download, Login, Moderation and share surfaces compile.
- [x] Five-dimension assistant, streaming, rate limiting, SDK, REST API, MCP and Sigil HMAC endpoint remain in scope.
- [x] Private local prayer commitments remain separate from consent-based public Atlas records.
- [x] Prayer Care API ownership is derived from verified Supabase sessions.
- [x] Google Calendar export and reviewed Gmail draft creation use direct per-user BibleDesk OAuth; Gmail has no send path.
- [x] Next.js production build, TypeScript check and security boundary tests pass.
- [x] Production dependency audit reports zero known vulnerabilities.
- [x] Active navigation, sitemap and homepage marketing reflect the web MVP.

## Required before a public production launch

- [ ] Create or select the production Supabase project.
- [ ] Apply `schema.sql` through `schema-v10-public-prayer.sql`, then `rpc.sql`, in order.
- [ ] Test both a fresh install and an upgrade of an existing schema.
- [ ] Verify owner-only RLS and service-role isolation, including cross-user denial cases for Prayer Care and `google_connections`.
- [ ] Configure the Vercel environment from `.env.example`; use a canonical HTTPS `NEXT_PUBLIC_APP_URL`.
- [ ] Configure the Google OAuth consent screen, client, callback URL, Calendar/Gmail APIs and token encryption key.
- [ ] Verify the production bundle does not expose server-only secrets.
- [ ] Run authenticated production smoke tests for login, Prayer Care CRUD, ICS, Calendar export, reviewed Gmail draft creation and Google disconnect.
- [ ] Run public smoke tests for Bible read/search, study resources, Atlas privacy, AI rate limiting, share pages, SDK/API docs, sitemap and robots.
- [ ] Confirm monitoring and rollback ownership before announcing availability.

## High-priority follow-up

- [ ] Reduce the remaining ESLint warnings in active code, especially hook dependency and unused-value warnings.
- [ ] Add live migration/RLS tests; mocked route tests are insufficient for the database boundary.
- [ ] Add behavior tests for Google token refresh, revoked consent and duplicate Calendar/draft requests.
- [ ] Decide whether authenticated local prayer data should sync to Supabase; do not claim sync until implemented and tested.
- [ ] Add a service worker and cache policy before describing the whole PWA as offline. Bundled Scripture reading/search is the verified offline capability.
- [ ] Review public AI copy against observed grounding quality and keep citations framed as a requirement, not a guarantee.

## Parked scope

Sermons, church and creator suites; the graph explorer UI; worship radio; Discord and WhatsApp bots; and Android, Electron and Chrome extension packaging are preserved under `archive/`. They are not part of the current public web release. Reintroduce each only with its own security, UX and deployment review.

See [ARCHITECTURE.md](ARCHITECTURE.md) for boundaries and [README.md](README.md) for setup.
