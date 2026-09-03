# Chrome Web Store Listing — BibleDesk Companion

> **Last Updated:** 2026-09-03
> **Status:** Draft update; re-run packaging and store review before submission

---

## 1. Store Metadata

| Field | Value |
|---|---|
| **Name** | BibleDesk Companion |
| **Short Description** | Scripture study, Strong's lexicon, cross-references, and secure access to BibleDesk Today in Prayer. |
| **Category** | Productivity / Lifestyle |
| **Primary Language** | English |

---

## 2. Permissions Justification

| Permission | Justification |
|---|---|
| `sidePanel` | Allows the BibleDesk study companion to open smoothly inside Chrome's native sidebar alongside any tab. |
| `contextMenus` | Enables right-click "Study in BibleDesk" on any highlighted text or scripture citation across the web. |
| `storage` | Saves user's preferred Bible translation (WEB, KJV, ASV, etc.) and server endpoint locally on their device. |

Host access covers localhost development and configured BibleDesk deployments (`bibledesk.org`, `*.bibledesk.app`, and `*.vercel.app`) for the existing Scripture API requests. Prayer Care opens as a normal web tab and does not broaden extension access to Google.

---

## 3. Privacy & Data Use

- **Data Collection:** The extension does not store prayer contacts, commitments, Supabase sessions, Google tokens, or message content. It does not track or sell browsing history.
- **Server Communication:** Study queries are sent only to the configured BibleDesk server. Prayer Care buttons open the configured HTTP(S) BibleDesk origin in a regular tab so authentication and exports remain in the web app.
- **Google:** The extension does not call Google APIs. Direct per-user Google OAuth and encrypted credential storage are handled by the configured BibleDesk server.
