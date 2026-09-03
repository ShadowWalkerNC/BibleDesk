# BibleDesk Chrome Extension

> **Manifest V3 Side Panel Companion for BibleDesk**  
> Study Scripture, view 5-dimension theological insights, query Strong's Greek/Hebrew lexicons, browse cross-references, and open private Prayer Care from your browser sidebar.

---

## Features

- **Side Panel Integration**: Opens directly in Chrome's native Side Panel with one click or via selection context menu.
- **Instant Verse Lookup**: Supports reference lookups across 6 public-domain translations (WEB, KJV, ASV, BBE, Darby, YLT).
- **Strong's Lexicon**: Look up original Hebrew & Greek roots, transliterations, derivations, and definitions (e.g. `G2889`, `H7225`).
- **TSK Cross References**: Instant Scripture cross-reference connections for indexed verses.
- **5-Dimension Study**: Displays grounded Scripture, Historical, Original Language, Theological, and Practical dimensions.
- **Configurable Server**: Connects seamlessly to your local `http://localhost:3000` or production `https://your-bibledesk.vercel.app`.
- **Prayer Care launcher**: Opens `Today in Prayer` and its Calendar/ICS/Gmail draft or compose export controls on the configured BibleDesk HTTP(S) origin.

## Prayer Care security boundary

The extension is a launcher, not a second Prayer Care client. It does not store Supabase sessions, prayer contacts, commitment details, Google OAuth tokens, or email content. Sign-in, owner-only data access, review, and exports happen in the BibleDesk web app. This keeps the Manifest V3 extension permissions unchanged (`storage`, `contextMenus`, and `sidePanel`).

The shared `/prayer` web view also serves BibleDesk's PWA, Electron, and Android wrappers where they load the hosted application. Google exports still require schema v5 and server-side OAuth configuration on that BibleDesk instance.

---

## How to Load in Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `apps/extension` folder in this repository.
5. Click the BibleDesk icon in your Chrome toolbar or select any text, right-click, and choose **Study in BibleDesk**.
