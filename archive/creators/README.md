# Creators Hub — archived (cut P6)

The Creator & Ministry Hub (`/creators`, `/c/[handle]`, creator profile
components, `creatorStore.ts`) was removed from the shipped product on
2026-09-12 via cut proposal **P6** (Master §6 P6, §7; resolves P0-C6).

## Why it was archived, not fixed

- The "Supabase synchronization" header in `creatorStore.ts` had zero code
  behind it — the hub was **localStorage-only**.
- `/c/[handle]` resolved only 3 hardcoded demo profiles; user-created
  profiles 404'd (`CreatorEditorModal.tsx:108-109`).
- Verified badges were self-minted (`is_verified ?? true`); handles could
  silently clobber each other.
- See research doc 15 §1.1 and doc 19 §6 for the full analysis.

## Revival condition

Do NOT reintroduce this hub until ALL of the following hold:

1. A **Supabase-wired schema** exists for creators/profiles (the
   `schema-v9.sql` creators tables were the proposed basis — see task B04).
2. A real **publish flow** exists: profile creation → server-side validation
   → unique handle enforcement → verifiable verification.
3. `/c/[handle]` resolves every published profile from the database, not a
   hardcoded demo list.

Until then, these routes must not ship.

## Original locations

- `src/app/creators/` → `archive/creators/app/creators/`
- `src/app/c/` → `archive/creators/app/c/`
- `src/components/CreatorCard/` → `archive/creators/components/CreatorCard/`
- `src/components/CreatorEditorModal/` → `archive/creators/components/CreatorEditorModal/`
- `src/components/CreatorProfileView/` → `archive/creators/components/CreatorProfileView/`
- `src/lib/creatorStore.ts` → `archive/creators/lib/creatorStore.ts`
