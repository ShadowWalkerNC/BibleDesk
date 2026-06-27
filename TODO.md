# BibleDesk — TODO

> **Current phase:** Phase 1 — AI Study Core (MVP)
> **Last updated:** 2026-06-27
> **Session:** Initial build — Next.js scaffold + all Phase 1 source files

---

## Phase 1 — AI Study Core

### 🟡 Deploy Blockers (must do before first public URL)

- [ ] **Create Supabase project** — run `supabase/schema.sql` in SQL editor
- [ ] **Set environment variables** — copy `.env.example` → `.env.local`, fill all values
- [ ] **Generate IP hash salt** — `openssl rand -hex 16` → `IP_HASH_SALT`
- [ ] **Generate Sigil webhook secret** — `openssl rand -hex 32` → `BIBLEDESK_WEBHOOK_SECRET`
- [ ] **Add to Sigil `.env`** — `BIBLEDESK_API_URL` + `BIBLEDESK_WEBHOOK_SECRET`
- [ ] **Deploy to Vercel** — push GitHub → connect Vercel → add env vars in dashboard
- [ ] **Set `NEXT_PUBLIC_APP_URL`** — to production Vercel URL
- [ ] **Verify build passes** on Vercel with real env vars
- [ ] **Test rate limiting** — confirm 429 fires after 15 requests/hour

### ✅ Completed This Session

- [x] Scaffold Next.js 16 (App Router, TypeScript, CSS Modules)
- [x] `src/types/index.ts` — shared types (BibleAnswer, Dimension, DIMENSION_META)
- [x] `src/lib/bible.ts` — bible-api.com client (free, no key, KJV/WEB/ASV)
- [x] `src/lib/claude.ts` — Anthropic client + 5-dimension prompt (server-only)
- [x] `src/lib/supabase.ts` — lazy-init Supabase client + typed helpers
- [x] `src/lib/rate-limit.ts` — 15 req/hr/IP with SHA-256 hashed IPs
- [x] `src/app/api/ask/route.ts` — main AI endpoint (validate → rate limit → Claude → save)
- [x] `src/app/api/v1/bible/answer/route.ts` — Sigil webhook (HMAC auth)
- [x] `src/app/globals.css` — full design system (dark navy/gold, glassmorphism)
- [x] `src/app/layout.tsx` — root layout (SEO metadata, fonts, PWA)
- [x] `src/app/page.tsx` — homepage (hero, search, answer flow, feature grid)
- [x] `src/components/Header/` — sticky glass nav
- [x] `src/components/SearchBar/` — question input + translation selector + examples
- [x] `src/components/DimensionPanel/` — 5-tab answer display + citations + share
- [x] `src/components/LoadingState/` — skeleton loaders + error state
- [x] `supabase/schema.sql` — answers + rate_limits tables with RLS
- [x] `public/manifest.json` — PWA manifest (installable)
- [x] `.env.example` — all env vars documented
- [x] `AGENTS.md` — all placeholders filled with real project values
- [x] `README.md` — full project documentation
- [x] `ARCHITECTURE.md` — system architecture document
- [x] `package.json` — name/version corrected
- [x] Production build: `npm run build` ✅ PASSING

### 🔧 Small Polish (Phase 1.1)

- [ ] Add PWA icons — `icon-192.png` and `icon-512.png` in `/public`
- [ ] Add `favicon.ico` and `apple-touch-icon.png`
- [ ] Add `answer/[id]` SSR page — shareable URL for each answer (SEO)
- [ ] Add `robots.txt` and `sitemap.xml` for SEO
- [ ] Rate limit UI — show questions remaining in the UI
- [ ] Toast notification when answer is copied to clipboard
- [ ] Dark/light mode toggle (currently dark-only)
- [ ] Test with real Anthropic API key — verify 5-dimension JSON comes back correctly
- [ ] Test Sigil webhook — verify HMAC signature works end-to-end

---

## Phase 2 — Bible Reader

> **Goal:** Full e-Sword-style Bible reading experience in the browser
> **Estimated effort:** 4–6 weeks

- [ ] `/bible` — chapter/verse navigation (book → chapter → verse)
- [ ] Side-by-side translation comparison (WEB vs KJV)
- [ ] Cross-reference panel (links between related passages)
- [ ] Strong's concordance — click a word → see Hebrew/Greek definition
- [ ] Classic commentaries — Matthew Henry, Adam Clarke (public domain text)
- [ ] Personal highlights + bookmarks (requires auth)
- [ ] Personal notes per verse (requires auth)
- [ ] Reading plans (personal + group)

---

## Phase 3 — Church Tools & Auth

> **Goal:** Full church/ministry platform with accounts and team features
> **Estimated effort:** 4–6 weeks

- [ ] Supabase Auth — email/password + Google OAuth
- [ ] User profiles (name, church, denomination)
- [ ] Saved question history (requires auth)
- [ ] Prayer request board — submit + browse open requests
- [ ] Prayer request → Discord (via Sigil `/prayer`)
- [ ] Sermon notes workspace — rich text, Bible verse links
- [ ] Sermon notes → Discord (via Sigil `/sermon`)
- [ ] Youth group view — simplified UI mode
- [ ] Church admin dashboard — manage team members

---

## Phase 4 — Full Sigil/Discord Integration

> **Goal:** BibleDesk and Sigil work as a unified church platform
> **Estimated effort:** 2–4 weeks

- [ ] Upgrade Sigil `faith` package — `/bible` calls BibleDesk AI endpoint
- [ ] Prayer request sync — Discord prayer → BibleDesk DB + vice versa
- [ ] Sermon publish flow — BibleDesk → Discord channel post
- [ ] Devotional scheduler — daily auto-post using BibleDesk content
- [ ] Discord slash command for question shortcut (`/study <question>`)

---

## Phase 5 — SaaS / Monetization

> **Goal:** Sustainable freemium platform with church packages
> **Estimated effort:** 4–6 weeks

- [ ] Stripe integration — subscription management
- [ ] Free tier: 15 questions/day (anonymous or logged in)
- [ ] Personal tier ($5/mo): unlimited AI questions + history + notes
- [ ] Church package ($XX/mo): team seats + admin + Discord + sermon tools
- [ ] Usage dashboard — questions used, billing, plan management
- [ ] Invoicing for church accounts

---

## Tech Debt & Known Issues

- [ ] `bibledesk-temp` name in scaffold — fixed in `package.json`, double-check no references remain
- [ ] Turbopack root warning — suppressed in `next.config.ts`, may resurface after Node upgrade
- [ ] `uuid` ships own types — remove `@types/uuid` from devDependencies (stub)
- [ ] No PWA icons yet — `icon-192.png` 404 in dev logs

---

## Architecture Decisions Log (ADR)

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-27 | Next.js over Vite SPA | SSR needed for SEO on public answer pages |
| 2026-06-27 | bible-api.com over API.Bible | Free, no key, simpler — right for Phase 1 |
| 2026-06-27 | Claude Sonnet 4.5 | Best quality/cost for structured JSON answers |
| 2026-06-27 | Anonymous-first | Auth adds scope — ship MVP first, add auth in Phase 3 |
| 2026-06-27 | CSS Modules over Tailwind | Full design system control, no runtime overhead |
| 2026-06-27 | Lazy-init Supabase client | Prevents build-time failures when env vars not set |
| 2026-06-27 | HMAC over Bearer token for Sigil | Matches existing Sigil webhook pattern, tamper-proof |

---

*Updated: 2026-06-27 | See [ARCHITECTURE.md](ARCHITECTURE.md) for system design details*
