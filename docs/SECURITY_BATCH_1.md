# Security batch 1 — 2026-09-11

Phase 0 — Local-first Bible foundation (security hardening; release verification pending).

## Implemented boundaries

- Sermons were archived from the active application by the 2026-09-12 MVP reduction; their former route is not part of the release surface.
- Configured login errors and pending email confirmation do not create a local identity. Unconfigured mode provides an explicitly labeled local study profile; it has no server authority.
- Public prayer queries require approved, nondeleted, nonrestricted Atlas records and return selected public fields only. Anonymous names and approximate coordinates are redacted. Schema/query failures return unavailable rather than broadening access.
- Prayer submissions ignore caller-supplied ownership/publication status, enter moderation, and no longer automatically forward to Discord. Likes use an atomic function restricted to eligible public records.
- Local Prayer Circle tiers remain on-device. Atlas submission requires a verified session and explicit consent, creates a separate pending `prayer_requests` record, and does not claim publication before moderation. Church delivery is not implemented.
- Private Prayer Care contacts and commitments use authenticated, owner-derived server routes. Per-user Google OAuth tokens are encrypted in a service-role-only table; Calendar export is explicit and Gmail integration creates reviewed drafts only.

## Validation

- `npm run test:security`: 7 passed for active prayer/authentication boundaries. Archived sermon tests were removed with the route they targeted. These are mocked boundary tests, not live database or browser end-to-end tests.
- `npm run typecheck`: exit 0 after stale generated route metadata was isolated.
- `npm run build`: exit 0 across 27 active routes on Next.js 16.3.5, including TypeScript and static generation. Sitemap answer generation skipped because the service-role key was absent.
- Full ESLint: exit 0 with 53 warnings. Archived code and the QA recording utility are excluded from the active-app lint gate.
- `npm audit --omit=dev`: 0 vulnerabilities after updating Next.js from 16.2.9 to 16.3.5 and applying compatible transitive dependency updates.
- No database migration, deployment, push, or external message was performed. Docker's local database runtime was unavailable.

## Database rollout gate

1. Reconcile the actual database against the legacy schemas through v9 in a disposable or staging environment. The corrected v8 script targets `prayer_requests`; previous code incorrectly targeted `prayers`. Do not blindly replay historical scripts against production.
2. Review and apply `supabase/migrations/20260911130215_secure_prayer_visibility.sql` after its prerequisite tables/geographic columns exist. It adds missing ownership/visibility fields, revokes direct public/anon/authenticated access to `prayer_requests`, and grants server access plus the public-only likes function. Existing legacy data is not automatically made public or copied out of encrypted fields.
3. Verify direct Data API denial as anonymous and authenticated users, server feed filtering, two separate owners, restricted/deleted rows, pending moderation, concurrent likes, and compatibility with moderation and anonymous submission routes. Check privileges as well as RLS.
4. Confirm UI behavior against real sessions and the migrated database. Back up before production changes. The stricter application may return unavailable before migration; this is intentional. Do not restore unsafe direct grants merely to make a rollback appear functional.

## Remaining release work

This batch covers selected authentication, sermon, and prayer boundaries. Other APIs, moderation, integrations, grounded AI output, guest-data sync retention, durable rate limits, dependency findings, accessibility, and page-by-page live workflows still require assessment/remediation. Complete those gates and environment/secret checks before a Vercel preview and deployed smoke tests. No public-release claim is warranted yet.
