# BibleDesk — Supabase Schema (canonical chain)

Apply the files in this directory **in exactly this order** on a fresh project
(Supabase Dashboard → SQL Editor, or `psql -f` per file). Every file carries an
`Order: N` header comment matching this list.

| Order | File            | Contents |
|-------|-----------------|----------|
| 1     | `schema.sql`    | Base: answers, rate_limits, moderators, canonical_answers (pgvector), flagged_topics, flags, moderation_votes |
| 2     | `schema-v2.sql` | Moderation + RAG re-runnable patch; `match_canonical_answers` RPC |
| 3     | `schema-v3.sql` | Knowledge graph (graph_nodes/graph_edges); PrayerAtlas companion tables (missionary_profiles, prayer_engagements, prayer_updates) |
| 4     | `schema-v4.sql` | **Canonical `public.prayer_requests`** (public board shape); profiles, verse_highlights, verse_notes, sermon_notes; FKs for the v3 prayer tables |
| 5     | `schema-v5.sql` | Pastoral prayer care (notification preferences only — the prayer_contacts/commitments/checkins/followups circle tables were removed by C05; the circle is device-local) |
| 6     | `schema-v6.sql` | Bookmarks; RLS audit re-assertions |
| 7     | `schema-v7.sql` | Geo/privacy columns on `prayer_requests` (country_code, latitude/longitude, category, privacy_mode, is_restricted) |
| 8     | `schema-v8.sql` | Churches directory + church_members; 4-tier escalation columns on `prayer_requests` |
| 9     | `schema-v9.sql` | Creator profiles |
| 10    | `schema-v10-public-prayer.sql` | Public prayer hardening (B14): `is_public`, `consent_atlas`, `status`, `updated_at` on `prayer_requests`; owner-scoped RLS replacing the v4 permissive policies |
| 11    | `rpc.sql`       | RPC functions (`match_canonical_answers`); needs pgvector + `canonical_answers` |

## Rules (B04)

- `public.prayer_requests` has **one** definition, in `schema-v4.sql`. Later
  changes are explicit `ALTER TABLE` migrations (v7, v8). Never add a second
  `CREATE TABLE` for it.
- There is **no** `public.prayers` table. (v8 used to target it by mistake;
  fixed to `public.prayer_requests`.)
- All files are safe to re-run: `IF NOT EXISTS` / `DROP … IF EXISTS` /
  `DO $$` guards throughout. RLS *policy semantics* are owned by task B05 —
  do not change them here.

## Prerequisites

- pgvector (`vector` extension) must be available — enable it in the Supabase
  Dashboard (Database → Extensions) before file 1, or install it in Postgres.
- Files referencing `auth.users` (v4 profiles, v5/v6 user tables) require the
  Supabase-managed `auth` schema (present on real Supabase projects; absent in
  a bare `postgres` Docker image — see rehearsal notes).

## Policy changelog (B05 — RLS privacy repair)

B05 edited **RLS policies only**; table definitions are untouched. Every
policy below follows the existing `DROP POLICY IF EXISTS` → `CREATE POLICY`
pattern, so all files stay re-runnable.

| Table | Policy change | Why |
|-------|---------------|-----|
| `public.profiles` (v4) | `SELECT` narrowed: `auth.uid() = id` OR caller is a `profiles.role='admin'` row | Anonymous callers could read every profile. Owner-or-admin only now. (No app code reads profiles via anon key — safe.) |
| `public.churches` (v8) | `SELECT` narrowed: `auth.uid() = admin_user_id` | `contact_email`, `phone`, and `invite_code` were world-readable. Admin-of-that-church only. App directory reads go through `/api/church` (service role, bypasses RLS) — safe. |
| `answers` (base) | `SELECT`/`INSERT` now require `auth.role() = 'service_role'` (was `USING (true)`) | App reads/writes answers only via the server client (`src/lib/supabase.ts`); anonymous direct access removed. |
| `rate_limits` (base) | `FOR ALL` now requires `auth.role() = 'service_role'` (was open) | Was anon-writable/deletable. All access is via `getServerClient()` (`src/lib/rate-limit.ts`). |
| `moderators` (base) | Same narrowing | Table stores moderator contact emails. |
| `flags` / `moderation_votes` / `canonical_answers` / `flagged_topics` (base) | Write/`FOR ALL` policies now require `auth.role() = 'service_role'` (was `WITH CHECK (true)`) | Implemented the documented "service role only" intent; no app path uses these via anon key. Public reads (`canonical_answers`, active `flagged_topics`) unchanged by design. |
| `creator_profiles` (v9) | Added missing `DROP POLICY IF EXISTS` lines | Re-run idempotency fix only; semantics unchanged. |

Notes:
- The two dead `auth.role() = 'moderator'` policies that existed on
  `schema-v3.sql` (base commit) were **already deleted by B04's canonical
  cleanup** — zero `auth.role()`-moderator policies remain. The role itself is
  application-level (the `moderators` table, checked in `src/lib/mod-auth.ts`),
  not a Postgres role, so no role was wired.
- `/api/church` GET still returns `contact_email`/`phone`/`invite_code` to any
  HTTP caller via the service role — that's app-layer behavior, out of B05's
  schema-only scope. Flagged for a follow-up app task.
- B05 ran in this sandbox with **no Postgres available**, so B04's
  fresh-Postgres rehearsal could not be re-run. Policy statements were
  syntax/logic-reviewed against the already-applied B04 patterns; full RLS
  behavioral testing needs a live Supabase project.
