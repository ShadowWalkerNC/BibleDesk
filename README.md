# BibleDesk ✦

**Bible-first study platform with AI as an assistant, not the product.**

BibleDesk is being rebuilt around a simple principle: the main feature is **studying the Bible**. AI is useful, but it should sit on top of a real study foundation instead of replacing it. Phase 0 focuses on offline-capable Bible reading, search, original-language study, and personal study tools before advanced AI, sharing, or community features are expanded.

---

## Vision

BibleDesk should remain useful even if the AI layer is unavailable. The foundation is a real Bible study experience: read Scripture locally, search quickly, compare translations, inspect Hebrew and Greek roots, and save notes, highlights, and bookmarks. The assistant layer is added only after the core study workflow works on its own.

---

## What BibleDesk Is

BibleDesk is a Bible study platform for churches, pastors, youth groups, teachers, and individual readers who want deeper study tools without making AI the center of the experience.

### Core product direction

- **Bible-first**: reading, search, comparison, notes, and word study come before AI.
- **Offline-capable**: installed Bible content should remain available without network access.
- **Source-grounded**: Hebrew and Greek study should come from structured lexical and morphology data, not AI guesses.
- **Modular**: Bible texts and study packs should be installable as versioned data modules.
- **AI-assisted**: AI helps explain, summarize, compare, and teach, but does not replace direct study.

---

## Phase 0 Goal

Phase 0 establishes the Bible study foundation. The app should still be valuable if the AI endpoint is removed.

### Phase 0 must deliver

| Area | Deliverable |
|---|---|
| Reading | Book/chapter/verse reader with translation picker |
| Search | Local full-text Bible search across installed public-domain translations |
| Compare | Side-by-side translation comparison |
| Original language | Hebrew/Greek word lookup with Strong's, lemma, transliteration, and morphology where available |
| Study tools | Notes, highlights, bookmarks, verse collections |
| Offline | Installed Bible modules work without internet |
| AI boundary | Assistant actions exist inside study views, not as the homepage focus |

---

## Why the Plan Changed

The earlier direction leaned too heavily on "ask AI a Bible question" as the main product flow. That approach creates a Bible-themed chatbot rather than a true study platform.

The new direction treats AI as a secondary layer because the Bible foundation was missing key essentials:

- No true offline mode.
- No locally installed Bible corpus.
- No real Hebrew/Greek word study implementation.
- No grounded lexicon-backed original-language workflow.
- Too much scaffolding around future AI features before the core study experience was complete.

---

## Data Sources

BibleDesk Phase 0 should use offline-friendly and legally redistributable sources.

### Primary text datasets

| Dataset | Purpose | Notes |
|---|---|---|
| Midvash `bible-data` | Main offline Bible corpus | Provides 33 versions across 22 languages in JSON and SQLite, with OSIS identifiers and per-version metadata |
| KJV / ASV / WEB / other public-domain editions | Default install set | Good starting base for offline reading and comparison |
| Westminster Leningrad Codex / Hebrew sources | Hebrew OT study | Available through Midvash and OpenScriptures-compatible resources |
| Textus Receptus / public-domain Greek text | Greek NT study | Supports New Testament word study |

### Language and lexicon datasets

| Dataset | Purpose | Notes |
|---|---|---|
| OpenScriptures Hebrew Bible | Hebrew lemmas and morphology | Based on the Westminster Leningrad Codex and adds lemma and morphology data |
| OpenScriptures `strongs` | Strong's dictionaries | Open-source Strong's Hebrew and Greek dictionary data |
| OSHB morphology resources | Morphology interpretation | Supports readable parsing and word-level study interactions |

### Temporary external fallback

| Source | Role | Limitation |
|---|---|---|
| `bible-api.com` | Development fallback only | Rate-limited and not suitable as the long-term foundation for full Bible access |

### Translation policy

Phase 0 should not advertise copyrighted translations such as NIV, ESV, or NLT unless a real licensing path exists.

---

## Product Priorities

### Must come first

1. Bible reader.
2. Chapter and verse navigation.
3. Local search.
4. Translation comparison.
5. Hebrew and Greek lookup.
6. Notes, highlights, bookmarks.
7. Reading plans.
8. Offline module support.

### Comes after the foundation

- AI-generated multi-dimensional answers.
- Public share pages.
- Knowledge graph visualizations.
- Community and moderation systems.
- Discord bot integrations.
- Marketing-first launch features.

---

## Phase 0 Architecture

BibleDesk can still use Next.js and Supabase, but the content architecture should become **local-first**.

### Application layers

| Layer | Responsibility |
|---|---|
| Reader UI | Reading, navigation, compare mode |
| Search UI | Searching installed Bible content |
| Word study UI | Strong's, lemma, transliteration, morphology popovers and drawers |
| Study tools | Notes, highlights, bookmarks, collections |
| Local data layer | Bible corpus, lexicon, search index, reading state |
| Optional sync layer | User study data backup and sync |
| AI assistant layer | Passage explanation, comparison, summarization, teaching help |

### Storage model

| Layer | Responsibility |
|---|---|
| Local database | Bible texts, lexicon data, cross references, reading plans, offline study state |
| Supabase | Optional sync for user-generated study data |
| Static module hosting | Versioned downloadable Bible and lexicon packs |

### Design rule

The Bible corpus should never require a live third-party API call just to read John 3 or search Romans. That is the line between a study app and a thin client over someone else's service.

---

## Recommended Data Model

At minimum, BibleDesk should separate content data from user study data.

### Content tables

- `translations`
- `books`
- `chapters`
- `verses`
- `verse_tokens`
- `strongs_entries`
- `morphology_entries`
- `cross_references`
- `reading_plans`

### User study tables

- `notes`
- `highlights`
- `bookmarks`
- `collections`
- `reading_progress`

### Key principle

Bible content is versioned reference data. Notes and highlights are user data. They should not be modeled the same way.

---

## User Experience Direction

### Primary navigation

The main app navigation should be Bible-first:

- Read
- Search
- Compare
- Study
- Plans
- Library
- Assistant

### Reader requirements

- Book/chapter selector.
- Translation switcher.
- Scroll and focused verse navigation.
- Compare mode for installed public-domain versions.
- Verse actions: note, highlight, bookmark, copy, share, study word.
- Word-level interaction for source-language datasets.

### Word study requirements

Selecting a Hebrew or Greek word should show:

- Surface form.
- Transliteration.
- Lemma.
- Strong's number.
- Basic gloss.
- Expanded definition.
- Morphology or parsing.
- Related occurrences.

This is one of the features that turns BibleDesk into an actual study platform instead of a Bible chatbot.

---

## Offline-First Requirements

Offline is not an enhancement. It is a core requirement for BibleDesk.

### Required behavior

- Installed Bible modules remain readable offline.
- Search works offline for installed modules.
- Word study works offline when lexicon modules are installed.
- Notes, highlights, and bookmarks can be created offline.
- Sync happens later when a connection is available.
- AI is the only feature allowed to degrade when offline.

---

## AI's Role

AI should exist as an optional study assistant inside the Bible workflow.

### Good AI use cases

- Explain this passage.
- Summarize this chapter.
- Compare these two translations.
- Show key themes in this section.
- Help build a devotional or youth lesson from this passage.

### Bad AI use cases

- Replacing the Bible reader.
- Guessing at Hebrew or Greek without real lexical data.
- Acting as the homepage before the user can read Scripture.

AI should be context-aware and grounded in the currently selected passage, translation text, and installed lexical resources.

---

## Development Stages

This section is intended to be the project's repeatable roadmap reference during development.

### Stage 0 — Bible foundation

**Goal:** Build the real study core without relying on AI.

Deliverables:
- Define module/package format for Bible data.
- Ingest Midvash SQLite datasets.
- Normalize OSIS identifiers and canon ordering.
- Build the reader UI.
- Build chapter/verse navigation.
- Add translation switching.
- Add local search.

Exit criteria:
- A user can install BibleDesk and read and search Scripture locally without a remote verse API.

### Stage 1 — Study tools

**Goal:** Make reading become studying.

Deliverables:
- Notes.
- Highlights.
- Bookmarks.
- Verse collections.
- Reading plans.
- Reading progress tracking.
- Compare mode.

Exit criteria:
- A user can maintain an entire study workflow without signing in.

### Stage 2 — Original language layer

**Goal:** Add real Hebrew and Greek study tools.

Deliverables:
- Integrate OpenScriptures Hebrew Bible data.
- Integrate Strong's dictionaries.
- Build token-level interaction.
- Add transliteration, lemma, gloss, and morphology display.
- Add related-word navigation.

Exit criteria:
- A user can click a word and perform a grounded word study using structured data instead of AI summaries.

### Stage 3 — Offline hardening and sync

**Goal:** Make the app resilient and portable.

Deliverables:
- Versioned downloadable content modules.
- Local persistence improvements.
- Sync for notes, highlights, bookmarks, and progress.
- Background updates for content packs.
- Conflict handling rules for synced study data.

Exit criteria:
- Installed content works offline, and study data syncs when online.

### Stage 4 — AI assistant

**Goal:** Add AI only after the study core is solid.

Deliverables:
- Passage-based assistant entry points.
- Ground AI with selected verses and lexical context.
- Summaries, explanations, comparisons, and teaching assistance.
- Token and usage guardrails.
- Clear UI distinction between source data and assistant output.

Exit criteria:
- The assistant improves study without replacing the Bible-first workflow.

### Stage 5 — Expanded platform features

**Goal:** Add platform-level capabilities after the Bible foundation is stable.

Deliverables:
- Share pages.
- Public links.
- Moderation systems.
- Team or church features.
- Discord or external integrations.
- Marketing site and launch tooling.

Exit criteria:
- Expansion features sit on top of a mature study platform instead of compensating for a missing core.

---

## Current Guardrails

These rules should stay visible during development:

- Do not market features that are not implemented.
- Do not advertise copyrighted translations without licensing.
- Do not depend on AI for original-language claims.
- Do not depend on a third-party verse API as the product foundation.
- Do not ship study features that stop working offline if they are supposed to be part of the core product.

---

## Suggested Future README Sections

After implementation advances, expand this README with:

- Installation and local setup.
- Module ingestion pipeline.
- Content licensing notes.
- Offline storage strategy.
- Search indexing approach.
- Original-language implementation details.
- AI grounding rules.
- Contribution workflow.

---

## Working Product Definition

BibleDesk is successful when someone can open it, read Scripture, search deeply, study Hebrew and Greek roots, save notes, and keep going even without internet. The AI assistant should make that workflow better, not be mistaken for the workflow itself.
