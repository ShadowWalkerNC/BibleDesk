# BibleDesk status

Updated: 2026-11-09. Verified at `main` commit `1bf0ef67edba0d493aba83e29ea4a6263d79bfee` (335 tracked files).

## Fresh verification (2026-11-09)

A full acceptance pass was run on a fresh clone of `main`:

- `npm install` — exit 0 (574 packages)
- `npm run typecheck` (`tsc --noEmit`) — exit 0
- `npm test` — exit 0, **33/33 tests passing** across the security-boundary, SDK, evidence, database, API, and E2E critical-path suites
- `npm run build` (`next build`) — exit 0; routes include `/bible`, `/prayer`, `/research`, `/pricing`, `/download`, `/developers`, `/mod`, `/system`, `/study-resources`, `/share/[slug]`

## Current ground truth

- **Database:** Railway PostgreSQL via Drizzle ORM (35 tables, `drizzle/` migrations), with an embedded PGlite fallback when `DATABASE_URL` is unset. Supabase is fully removed from `src/`; the legacy `supabase/` SQL chain is kept as a data-migration reference only.
- **Auth:** stateless JWT (`/api/auth/*`); `NEXTAUTH_SECRET` is accepted only as a legacy fallback for the JWT secret.
- **AI:** hosted answers run on Anthropic Claude (`claude-sonnet-4-5`). Signed-in users get 5 free AI answers/day; unlimited use is BYOK (a stored per-user Gemini or Claude key, or a guest Gemini key sent header-only). The research assistant uses Claude with a locally grounded fallback; it has no web-search tool.
- **Access model:** the hosted service is free — no paid tiers are sold. Tier definitions (`src/lib/tiers.ts`) and Stripe billing routes (`/api/billing/*`) ship in the repo for self-hosted deployments; plan activation on the hosted service runs in local/self-hosted mode.
- **Scope:** sermons, church suite, and creators hub remain archived under `archive/`; native shells (Android/Electron/Chrome extension) are parked there and build-from-source only. The knowledge-graph UI is active inside `/bible`. `/download` is an honest PWA / build-from-source page, not a storefront.

## Governance checkpoint

Portfolio phase P02; product milestones remain separate. [forge.project.json](forge.project.json) describes identity and source/configuration observations. [PORTFOLIO_HANDOFF.md](PORTFOLIO_HANDOFF.md) records scope and verification. [OPS_REPORT.md](OPS_REPORT.md) is a historical audit snapshot from August–September 2026 and describes the pre-migration application; do not use it as current state.
