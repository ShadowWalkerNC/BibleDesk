# Archive: church suite

**Archived:** 2026-09-12 · **Task:** A05-archive-church-suite

## Why archived (cut P5)

The church hub shipped as a demo facade, not a working feature (master §4 P0-C5):

- Member invite links pointed at a nonexistent `/church/join` route (404).
- The embed widget pointed at a nonexistent `/embed/church` route (404).
- "Congregation prayer chain" was per-browser `localStorage`, not shared data.
- Planning Center "interoperability" was one marketing sentence with zero code behind it.
- The `church_members` table was DDL-only; `admin_user_id` was never populated;
  churches self-registered with hardcoded `is_verified: true`.

Shipping this would misrepresent the product. The code was moved here instead of
deleted, and all nav entries, slash commands, and marketing claims pointing at
`/church` were removed from the app (see `git log` for the A05 commit).

## ADR note

The 2026-08-09 ADR said "do not delete church features." The owner approved cut
P5 **and** resolved the church ADR conflict in favor of archiving. Archiving
satisfies the ADR literally: nothing was deleted — the code survives in
`archive/church/` with full git history (`git mv` preserves renames).

## Revival condition

Restore this suite only when ALL of the following are true:

1. Church data is Supabase-wired (real `church_members` rows, populated
   `admin_user_id`, verified churches — no hardcoded `is_verified: true`).
2. Every fix recipe in doc 14 §1.7–1.8 is applied (`/church/join` and
   `/embed/church` routes exist or the links are removed, prayer chain backed
   by shared data, Planning Center claim backed by real code or removed).
3. The owner re-approves church scope post-security-hardening (this suite was
   downgraded to deferred-behind-security-work in the alternative path).

Until then, `src/app/sermons/` and `src/app/api/sermons/` are the only
congregation-facing surface in the shipped product.
