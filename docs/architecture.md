# BibleDesk — Technical Architecture Note

> **Status:** Active Reference Implementation  
> **Directive Target:** End-to-end production-grade Bible study and evidence-based research application.

---

## 1. Executive Architecture Overview

BibleDesk is a Bible study and theological research platform centered on verse analysis, cross-referencing, evidence-based commentary, and AI-assisted web research.

The architecture comprises five core layers:
1. **Persistent Relational Database (PostgreSQL + Drizzle ORM)**: Stores canonical Scripture text across public-domain translations, indexed cross-references, structured 5-dimension commentary, user accounts, and personal study collections/notes. Full-text search is powered by PostgreSQL `tsvector`.
2. **Reusable Evidence & Confidence Engine (`src/lib/evidence.ts`)**: Evaluates theological and biblical claims across 5 distinct hermeneutical dimensions, deriving an explainable confidence rating via deterministic multi-factor scoring.
3. **Backend Research Assistant Service (`POST /api/research`)**: Integrates Anthropic's Claude 3.5 Sonnet SDK (`@anthropic-ai/sdk`) with web research tools, citation validation, rate limiting, and 5-dimension evidence synthesis.
4. **Interactive Study Desk UI (`/bible`, `/research`)**: Unifies chapter reading, cross-reference discovery, 5D commentary display, research queries, and personal study organization into a cohesive desktop/tablet/mobile workspace.
5. **Quality Assurance Suite**: Vitest/Node unit and integration test suite coupled with Playwright E2E testing for the critical-path user journey.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client (Next.js 16)                           │
│  ┌───────────────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │ Chapter / Verse Reader│  │ Research Assistant │  │ Saved Notes    │  │
│  │ & Cross-Ref Drawer    │  │ & 5D Confidence UI │  │ & Collections  │  │
│  └───────────┬───────────┘  └─────────┬──────────┘  └────────┬───────┘  │
└──────────────┼────────────────────────┼──────────────────────┼──────────┘
               │                        │                      │
┌──────────────▼────────────────────────▼──────────────────────▼──────────┐
│                    Next.js App Router API Routes                        │
│  /api/bible/* · /api/cross-references · /api/commentary · /api/research │
│            /api/notes · /api/collections · /api/search                  │
└──────────────┬────────────────────────┬──────────────────────┬──────────┘
               │                        │                      │
┌──────────────▼────────────┐ ┌─────────▼───────────┐ ┌────────▼──────────┐
│  Evidence & Confidence    │ │ Anthropic Claude    │ │ PostgreSQL (Drizzle)│
│  Rating Engine            │ │ Web Research SDK    │ │ Scripture, Cross-Ref│
│  (src/lib/evidence.ts)    │ │ (Traceable Sources) │ │ Notes, tsvector FTS │
└───────────────────────────┘ └─────────────────────┘ └───────────────────┘
```

---

## 2. Database Data Models (PostgreSQL + Drizzle ORM)

We utilize **Drizzle ORM** targeting PostgreSQL (`drizzle-orm/pg-core`). Drizzle maintains strict TypeScript types and outputs immutable, reversible SQL migration files under `/drizzle`.

### 2.1 Scripture Verses (`scripture_verses`)
Stores canonical Bible text directly in PostgreSQL.
- `id` (serial / uuid, primary key)
- `translation` (text, e.g. `'web'`, `'kjv'`, `'asv'`)
- `book` (text, e.g. `'John'`)
- `book_number` (integer, 1-66)
- `chapter` (integer)
- `verse` (integer)
- `text` (text)
- `text_search` (`tsvector` generated from `text` with `'english'` dictionary for full-text search)
- Indexes: `(translation, book, chapter, verse)` unique, `GIN (text_search)`

### 2.2 Cross References (`cross_references`)
Pre-computed and queryable bidirectional scriptural cross-references (derived from Treasury of Scripture Knowledge).
- `id` (serial, primary key)
- `from_book` (text)
- `from_chapter` (integer)
- `from_verse` (integer)
- `to_book` (text)
- `to_chapter` (integer)
- `to_verse` (integer)
- `votes` (integer, relevance weight)
- Indexes: `(from_book, from_chapter, from_verse)`, `(to_book, to_chapter, to_verse)`

### 2.3 Evidence-Based Commentary (`commentaries`)
Pre-generated or cached 5-dimension commentaries with deterministic confidence evaluations.
- `id` (text / uuid, primary key)
- `verse_ref` (text, e.g. `'John 1:1'`)
- `title` (text)
- `summary` (text)
- `dimensions` (jsonb):
  - `scripture`: `{ title, content, citations: string[], keyPoints: string[] }`
  - `historical`: `{ title, content, citations: string[], keyPoints: string[] }`
  - `original_language`: `{ title, content, citations: string[], keyPoints: string[], strongs: string[] }`
  - `theological`: `{ title, content, citations: string[], keyPoints: string[] }`
  - `practical`: `{ title, content, citations: string[], keyPoints: string[] }`
- `confidence` (text: `'high'`, `'medium'`, `'low'`)
- `confidence_score` (numeric, 0.00 to 1.00)
- `confidence_derivation` (jsonb): Factor breakdown and explanation rationale
- `citations` (jsonb: array of `{ reference, text, sourceUrl? }`)
- `created_at` (timestamp with time zone)

### 2.4 User Accounts, Notes & Collections (`users`, `study_notes`, `study_collections`, `collection_items`)
Enables user ownership, personal study persistence, and tagging.
- `users`: `id`, `email`, `name`, `created_at`
- `study_notes`: `id`, `user_id` (FK `users.id`), `verse_ref`, `title`, `content`, `tags` (text[]), `created_at`, `updated_at`, `text_search` (`tsvector`)
- `study_collections`: `id`, `user_id` (FK `users.id`), `name`, `description`, `color`, `created_at`
- `collection_items`: `id`, `collection_id` (FK `study_collections.id`), `item_type` (`'verse' | 'cross_ref' | 'research' | 'commentary'`), `item_ref`, `notes`, `created_at`

### 2.5 Research Findings (`research_findings`)
Stores query sessions and web-grounded research discoveries.
- `id` (text / uuid, primary key)
- `user_id` (text, optional FK for guest/authenticated)
- `query` (text)
- `verse_ref` (text, optional)
- `summary` (text)
- `dimensions` (jsonb, 5-dimension breakdown)
- `confidence` (text: `'high' | 'medium' | 'low'`)
- `confidence_score` (numeric)
- `confidence_derivation` (jsonb)
- `sources` (jsonb: array of `{ title, url, snippet, date? }`)
- `created_at` (timestamp with time zone)

---

## 3. The Five-Dimension Evidence Model & Confidence Rating Engine

Rather than unstructured text or arbitrary AI outputs, all commentary and research evaluations conform to a formal 5-dimension hermeneutical framework:

### 3.1 The Five Hermeneutical Dimensions
1. **Scripture (Biblical Foundation)**: Primary textual evidence, canonical context, parallel passages, narrative flow.
2. **Historical (Contextual Horizon)**: Ancient Near Eastern / Greco-Roman background, authorship, historical setting, cultural idioms.
3. **Original Language (Lexical & Grammatical Grounding)**: Hebrew, Aramaic, and Greek lemmas, Strong's concordance alignment, morphological analysis, syntax.
4. **Theological (Systematic & Historic Consensus)**: Systematic theology, covenantal coherence, historic creeds/confessions (Nicene, Chalcedonian, Reformation).
5. **Practical Application (Spiritual Formation)**: Pastoral application, discipleship, ethical implications, modern relevance.

### 3.2 Confidence Rating System & Mathematical Derivation
Confidence is never a subjective label. It is computed as a weighted composite score across 5 objective evidentiary factors:

$$\text{Confidence Score} = \sum_{i=1}^{5} w_i \cdot f_i$$

Where:
- $f_{\text{scripture}}$ ($w_1 = 0.30$): Textual grounding. Verified specific book:chapter:verse citations present and contextual.
- $f_{\text{language}}$ ($w_2 = 0.20$): Lexical backing. Analysis of original language roots (Strong's / lemma).
- $f_{\text{historical}}$ ($w_3 = 0.20$): Historical context and primary/secondary ancient sources.
- $f_{\text{theology}}$ ($w_4 = 0.15$): Doctrinal coherence across historic orthodox consensus.
- $f_{\text{traceability}}$ ($w_5 = 0.15$): Verification and accessibility of citations (verifiable Bible references or real web sources).

**Thresholds:**
- **High Confidence ($\ge 0.75$)**: Robust textual evidence, verified original language backing, and clear historical consensus.
- **Moderate Confidence ($0.50 - 0.74$)**: Well-supported by scripture, but involves historical nuance, interpretive debate, or secondary inferences.
- **Lower Confidence ($< 0.50$)**: Limited direct biblical attestation, disputed textual variants, or speculative theological claims.

The engine produces both the numeric score, the categorical tier, and an explicit plain-English **Confidence Rationale** displayed in the UI.

---

## 4. Research Assistant & Anthropic Web-Search Integration

The research flow builds on Anthropic's Claude 3.5 Sonnet (`@anthropic-ai/sdk`) wrapped in a secure server-side endpoint `POST /api/research`.

### 4.1 Request & Execution Flow
1. **Rate Limiting & Authentication**: Enforces per-IP and per-user token buckets to prevent abuse.
2. **Query Normalization**: Parses target scripture references (e.g. "John 1:1") and core research questions.
3. **Anthropic Web Search Execution**: Claude performs targeted web search for scholarly, historical, and archaeological evidence regarding the passage.
4. **Citation Extraction & Verification**: Every factual assertion must be accompanied by a concrete citation. Web sources must provide real, traceable URLs (e.g. CCEL, BibleHub, academic repositories).
5. **Evidence Model Scoring**: The response is parsed into the 5 hermeneutical dimensions, passed through `calculateConfidence()`, and validated.
6. **Persistence**: The finding is saved to `research_findings` and returned to the client.

### 4.2 Client Integration (`ResearchAssistant.tsx`)
The React component is integrated into the Study Desk workspace:
- Search input with suggestion chips for common theological queries.
- Live progress indicator showing search -> analysis -> verification stages.
- Dimension switcher with confidence rating badge (clickable to inspect scoring rationale).
- Interactive citations drawer linking out to source literature.
- 1-click "Save to Notes" and "Add to Collection" actions.

---

## 5. Local Zero-Friction & PostgreSQL Dual Execution Strategy

To satisfy the requirement that:
*"The app runs locally end-to-end from a clean clone with only `npm install`, env setup, and documented commands"*

The database client (`src/db/index.ts`) supports dual-mode operation:
- **Standard PostgreSQL Mode**: Used when `DATABASE_URL` is configured (production Supabase, Docker, or local PostgreSQL).
- **Embedded PostgreSQL Mode (`@electric-sql/pglite`)**: If `DATABASE_URL` is omitted or points to `pglite://`, Drizzle runs on top of embedded WebAssembly PostgreSQL storing data locally in `./data/bibledesk.db`. This provides 100% genuine PostgreSQL dialect, indexes, and migrations with zero external daemon dependencies.

---

## 6. Testing & Quality Gates

1. **Unit & Integration Tests (`npm test`)**:
   - `evidence.test.ts`: Validates 5-dimension scoring, weighting, and confidence thresholding.
   - `db.test.ts`: Verifies Scripture retrieval, cross-reference queries, commentary fetching, and note persistence.
   - `research.test.ts`: Tests the research API route, rate-limit boundaries, and citation validation.
   - `search.test.ts`: Tests PostgreSQL full-text search across Scripture and notes.
2. **Playwright E2E (`npm run test:e2e`)**:
   - Executes critical-path user journey:
     1. Search a verse (`John 1:1`).
     2. View and expand cross-references (`Genesis 1:1`).
     3. Run research assistant on the passage.
     4. Save verse and research finding into a personal study note.
     5. Verify persisted note appears in the Notes collection.
