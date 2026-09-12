# Security batch 1 — 2026-09-11

Phase 0 — Local-first Bible foundation (security hardening; release verification pending).

## Implemented boundaries

- Sermon APIs verify bearer tokens and constrain operations to the verified owner. Forged owner IDs cannot select, alter, delete, or publish another user's sermon.
- Configured login errors and pending email confirmation do not create a local identity. Unconfigured mode provides an explicitly labeled local study profile; it has no server authority.
- Public prayer queries require approved, nondeleted, nonrestricted Atlas records and return selected public fields only. Anonymous names and approximate coordinates are redacted. Schema/query failures return unavailable rather than broadening access.
- Prayer submissions ignore caller-supplied ownership/publication status, enter moderation, and no longer automatically forward to Discord. Likes use an atomic function restricted to eligible public records.
- Escalation requires ownership. Restricted prayers cannot become public. Shared circles are unavailable, and church escalation requires the church administrator; team delivery is not implemented. Atlas escalation returns to pending review.
- Local prayer commitments are not automatically persisted public prayer records. Escalation of an unsynchronized local ID fails visibly; it does not claim publication.

## Validation

- `npm run test:security`: 9 passed. Tests execute actual route and login code with mocked Supabase and browser boundaries, including forged ownership, cross-user operations, privacy filtering, unavailable storage, and configured/unconfigured login. These are not live database or browser end-to-end tests.
- `npm run build`: exit 0, including TypeScript and static page generation. Sitemap answer generation skipped because the service-role key was absent. Build success alone does not prove secret isolation or production readiness.
- Focused ESLint: exit 1, 6 errors and 20 warnings. Errors: prayer page prefer-const, sermon page purity diagnostic, and four unescaped quotes in the escalation modal. Full lint and dependency audit were not rerun in this bounded batch.
- No database migration, deployment, push, or external message was performed. Docker's local database runtime was unavailable.

## Database rollout gate

1. Reconcile the actual database against the legacy schemas through v9 in a disposable or staging environment. The corrected v8 script targets `prayer_requests`; previous code incorrectly targeted `prayers`. Do not blindly replay historical scripts against production.
2. Review and apply `supabase/migrations/20260911130215_secure_prayer_visibility.sql` after its prerequisite tables/geographic columns exist. It adds missing ownership/visibility fields, revokes direct public/anon/authenticated access to `prayer_requests`, and grants server access plus the public-only likes function. Existing legacy data is not automatically made public or copied out of encrypted fields.
3. Verify direct Data API denial as anonymous and authenticated users, server feed filtering, two separate owners, restricted/deleted rows, pending moderation, concurrent likes, and compatibility with moderation and anonymous submission routes. Check privileges as well as RLS.
4. Confirm UI behavior against real sessions and the migrated database. Back up before production changes. The stricter application may return unavailable before migration; this is intentional. Do not restore unsafe direct grants merely to make a rollback appear functional.

## Remaining release work

This batch covers selected authentication, sermon, and prayer boundaries. Other APIs, moderation, integrations, grounded AI output, guest-data sync retention, durable rate limits, dependency findings, accessibility, and page-by-page live workflows still require assessment/remediation. Complete those gates and environment/secret checks before a Vercel preview and deployed smoke tests. No public-release claim is warranted yet.
