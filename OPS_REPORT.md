# BibleDesk ✦ Operations Manager & Product Audit Report

**Date:** August 25, 2026  
**Auditor:** Operations Manager & Product Consultant  
**Status:** Phase 0 Complete — Local-First Foundation Ready for Deployment  
**Repository:** `ShadowWalkerNC/BibleDesk`

---

## 1. Executive Summary

BibleDesk is a **Bible-first study platform** engineered with the philosophy that **AI is an assistant layer, not the product itself**. The platform enables individual daily readers, pastors, theologians, and small groups to read, compare, search, and study Scripture completely offline using bundled public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT), structured Strong's Greek/Hebrew lexicons (5,523 Greek + 8,674 Hebrew entries), and Treasury of Scripture Knowledge (TSK) cross-references (29,336 indexed verses).

When connected online, BibleDesk enhances Bible study through an optional **5-Dimension AI Pipeline** (Scripture, Historical Context, Original Language, Theological Depth, Practical Application), RAG vector search over canonical answers, an interactive D3 Knowledge Graph with Obsidian zip vault export, an HTTP Model Context Protocol (MCP) server, and dedicated Church Tools (Sermon Prep Workspace with instant cursor scripture insertion and Discord publishing, and a Global Prayer Board with a 3D D3 PrayerAtlas globe).

This audit evaluates the codebase, user experience flows across three target personas, architectural resilience, and technical debt to establish concrete prioritisations for launch and post-launch roadmap execution.

---

## 2. Comprehensive Codebase Audit

### 2.1 Centralized 3-Column Study Desk (`/bible`)
* **Architecture:** 3-column responsive layout comprising:
  * **Left Column (Study Hub):** Daily devotional snippets, Reading Plans progress, and Bookmarks.
  * **Center Column (Scripture Reader):** Reader with translation selector, parallel side-by-side compare mode, inline Strong's tag toggles (`showInlineStrongs`), verse highlighting saved to `localStorage`, and Web Speech API Text-to-Speech (TTS) audio narration for whole chapters or individual verses.
  * **Right Column (Study Companion & Lexicon Hub):** Tabs for AI Study Companion (`/api/bible/study`), Multi-Translation Verse Comparison, TSK Cross-References, Concordance / Search, and Personal Notes.
* **Engine:** Backed by Node/Server local Bible module loader ([`src/lib/bible-local.ts`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/lib/bible-local.ts)) which loads JSON module files locally from `src/data/bibles/`.
* **Strengths:** 100% network independent for reading and chapter switching; seamless parallel translation alignment; deep verse interaction.
* **Friction Points:**
  * Personal verse notes and verse highlights rely exclusively on browser `localStorage` and do not sync to Supabase user profiles when authenticated.
  * Web Speech API TTS rate and voice selection cannot be customized by the user.

### 2.2 5-Dimension AI Pipeline & RAG (`/api/ask`, `/api/ask/stream`)
* **Architecture:** Structured 6-stage execution pipeline ([`src/lib/pipeline.ts`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/lib/pipeline.ts)) leveraging Claude (Sonnet 4.5) for synthesis, OpenAI (`text-embedding-3-small`) for pgvector RAG lookups against historical canonical answers, and an IP-based rate limiter (15 questions/hour/IP).
* **UI Components:** [`DimensionPanel`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/components/DimensionPanel/DimensionPanel.tsx), [`StreamingProgress`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/components/StreamingProgress/StreamingProgress.tsx), [`RateLimitBar`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/components/RateLimitBar/RateLimitBar.tsx).
* **Strengths:** High citation fidelity; transparent rate-limiting feedback; crisp 5-dimension structure.
* **Friction Points:**
  * If Anthropic or OpenAI API keys are absent or rate-limited, non-AI direct fallback handles searches, but does not provide graceful UI state explanation to offline users.

### 2.3 Quick Jump Modal (`components/QuickJumpModal/QuickJumpModal.tsx`)
* **Trigger:** Accessible anywhere via key combination `Ctrl + K` or header action button.
* **Features:** Full reference string parsing (`"John 3:16"`, `"Rom 8"`, `"Gen 1"`), testament filtering buttons (`All 66`, `OT 39`, `NT 27`), book card filtering, and chapter number cell matrix.
* **Strengths:** Lightning-fast navigation; robust regex reference matching ([`src/lib/books.ts`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/lib/books.ts)).

### 2.4 Chrome MV3 Extension (`apps/extension/`)
* **Architecture:** Manifest V3 side panel extension with full Parchment theme styling ([`sidepanel.css`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/apps/extension/sidepanel/sidepanel.css)).
* **Capabilities:** Instant scripture lookup, Strong's tag detection (e.g., `G2889`, `H7225`), cross-reference rendering, and live connection to local or hosted BibleDesk instance (`localhost:3000` or production URL).
* **Strengths:** Unobtrusive browser companion for pastors writing notes or web researchers.

### 2.5 3D Canvas Visualizations
* **Sacred Book Hero Model ([`Bible3DCanvas.tsx`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/components/Bible3DCanvas/Bible3DCanvas.tsx)):** Built using `@react-three/fiber` and `@react-three/drei` (`Float`, `Sparkles`, `MeshDistortMaterial`). Offers dynamic gold book animation on the homepage hero section.
* **3D PrayerAtlas Globe ([`PrayerAtlas.tsx`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/components/PrayerAtlas/PrayerAtlas.tsx)):** Built using D3 Orthographic Projection (`d3.geoOrthographic`) and Canvas 2D rendering. Features interactive rotation drag, hover tooltips, pulsing country markers, and support for Restricted Access Nations (RAN).

### 2.6 Church Tools Suite
* **Sermon Prep Workspace ([`app/sermons/page.tsx`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/app/sermons/page.tsx)):** Dedicated markdown sermon editor with split-screen live preview, e-Sword scripture sidebar with **one-click verse insertion at editor cursor position**, clean print layout CSS, and Discord webhook publishing.
* **Global Prayer Board & Atlas ([`app/prayer/page.tsx`](file:///c:/Users/white/OneDrive/Documents/GitHub/BibleDesk/src/app/prayer/page.tsx)):** Public request submission form with optional geographical country pinning, anonymous posting, RAN safety protections, and session-based "Prayed for this" intercession counter.

### 2.7 Auxiliary Study Modules
* **Reading Plans (`/plans`):** 30-day and 90-day canonical reading plans with checkbox tracking.
* **Daily Devotion (`/daily`):** Daily passage, key theme breakdown, and prayer prompt.
* **Verse Memory (`/memory`):** Interactive flashcards and text-masking drill exercises.
* **Catechism (`/catechism`) & Creeds (`/creeds`):** Westminster Shorter Catechism, Heidelberg Catechism, Apostles', Nicene, Chalcedonian, and Athanasian Creeds with interactive quiz mode.
* **Knowledge Graph (`/graph`):** D3 network graph explorer visualizing passage-to-concept linkages with single-click ZIP export for Obsidian notes vaults (`/api/export/obsidian`).

---

## 3. User Flow & Friction Analysis

### 3.1 Persona A: Daily Scripture Reader
* **Goal:** Open app, read daily chapter, highlight verses, review memory cards, track reading plan.
* **Friction Points:**
  1. **No Reading Resume Button:** When re-opening `/bible`, reader defaults to John 3 rather than auto-resuming the user's last read chapter.
  2. **Local Progress Isolation:** Reading plan completions and verse highlights exist only in local browser cache. If reading on mobile and desktop, progress is fragmented.
  3. **PWA Offline Precaching:** PWA manifest exists, but offline ServiceWorker asset precaching is missing, preventing PWA offline launch without an initial cached page load.

### 3.2 Persona B: Pastor & Preacher
* **Goal:** Research original Greek/Hebrew words, cross-reference passage parallel passages, draft sermon outline, print notes for the pulpit.
* **Friction Points:**
  1. **Sermon Auth Gate Barrier:** The sermon workspace (`/sermons`) requires an active Supabase authentication session. Pastors working offline or without an account cannot use the local sermon editor.
  2. **Limited Export Formats:** Sermon outlines can only be printed or published to Discord. Exporting to Markdown (`.md`), PDF, or Microsoft Word (`.docx`) is not supported.
  3. **No Multi-Passage Scripture Collection:** The e-Sword sidebar only displays one chapter at a time. Pastors building a sermon across multiple books must re-select books repeatedly.

### 3.3 Persona C: Study Group & Church Leader
* **Goal:** Generate discussion questions for weekly study, share key passage insights, coordinate group prayer.
* **Friction Points:**
  1. **Prayer Board Categorization:** The Prayer Board list lacks filter controls for topic (e.g., Healing, Family, Missions, Praise) or status (e.g., Active vs. Answered Prayer).
  2. **No Study Guide Generator:** While answers can be shared via `/share/[slug]`, group leaders cannot export a formatted PDF or printable study worksheet with discussion questions.

---

## 4. Prioritized Recommendations & Action Plan

### Priority 1: Launch Readiness & Offline Sync (Immediate)
1. **Apply Supabase Schemas:** Execute `schema.sql` through `schema-v4.sql` on the host Supabase instance to enable full cloud profiles, prayer requests, sermon outlines, and verse notes sync.
2. **Cloud Sync for Personal Notes & Highlights:** Wire `/bible` verse highlights and notes to dual-write to `localStorage` (offline fallback) and Supabase `verse_notes`/`verse_highlights` tables when logged in.
3. **Local Sermon Storage Fallback:** Allow guest/offline pastors to use `/sermons` with `localStorage` fallback when unauthenticated.
4. **Auto-Resume Last Reading Position:** Save current `book` and `chapter` to `localStorage` on `/bible` and offer a quick "Resume where you left off" pill.

### Priority 2: Preacher & Study Group Enhancements (Post-Deploy)
1. **Sermon Export Tools:** Add export options to `/sermons` for downloading outlines as clean Markdown (`.md`) and formatted HTML/PDF.
2. **Prayer Board Filtering & Answered Status:** Add category filters (Missions, Family, Healing) and an "Answered Praise Report" flag to `/prayer`.
3. **Group Study Discussion Sheet Generator:** Add a "Generate Small Group Guide" action button to 5D AI answers that formats discussion questions into a printable sheet.

### Priority 3: Platform Polish & Mobile Optimizations
1. **PWA Assets:** Replace placeholder 70-byte PWA PNG icons (`icon-192.png`, `icon-512.png`) with crisp SVG-rendered branded artwork.
2. **Electron Stdio MCP:** Add stdio MCP server wrapper under `apps/desktop/mcp/server.js` for desktop AI integration (Claude Desktop, Cursor).

---

## 5. Updated Status Matrix

| Component | Status | Operational Note |
|---|---|---|
| Scripture Reader | ✅ Production Ready | Local 6-translation engine verified |
| Strong's Lexicon & TSK | ✅ Production Ready | 5,523 Greek + 8,674 Hebrew + 29k cross-refs |
| 5-Dimension AI Pipeline | ✅ Production Ready | Streaming & RAG verified across Sonnet 4.5 |
| Quick Jump Navigation | ✅ Production Ready | Ctrl+K modal with direct passage regex parser |
| Chrome MV3 Extension | ✅ Production Ready | Side panel Parchment UI with instant lookup |
| 3D Sacred Book Hero | ✅ Production Ready | R3F gold book model with sparkles |
| 3D PrayerAtlas Globe | ✅ Production Ready | D3 orthographic interactive globe with RAN safety |
| Sermon Workspace | ⚠️ Operational (Needs Offline Mode) | Verse cursor insertion ready; needs guest draft fallback |
| Global Prayer Board | ✅ Operational | Submissions, intercession counts, map pins ready |
| Knowledge Graph & Obsidian Export | ✅ Production Ready | Interactive D3 graph + ZIP vault download ready |

---

*Report prepared by Operations Manager & Product Consultant · BibleDesk Audit Complete*
