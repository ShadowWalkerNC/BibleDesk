# BibleDesk Desktop

Electron wrapper around the BibleDesk Next.js app.
Provides offline-first access to the knowledge graph, Obsidian vault integration, and local graphify rebuilds.

## Architecture

```
apps/desktop/
├── electron/
│   ├── main.js          — Electron main process (window + IPC handlers)
│   ├── preload.js       — contextBridge API (window.bibledesk)
│   └── next.config.ts   — Next.js config (static export for packaged builds)
├── src/app/
│   ├── layout.tsx       — Root layout (shares web globals.css)
│   ├── DesktopShell.tsx — Top bar: vault picker, graphify rebuild, sync dot
│   ├── DesktopShell.module.css
│   ├── page.tsx         — Desktop home (GraphView landing)
│   └── page.module.css
└── tsconfig.json        — @/* → ../../src/* (shares all web components)
```

## Development

```bash
cd apps/desktop
npm install
npm run dev        # Next.js on :3001 + Electron
```

## Production build

```bash
npm run dist
```

Outputs to `apps/desktop/dist/`:
- macOS: `.dmg` + `.zip`
- Windows: `.exe` NSIS installer + portable
- Linux: `.AppImage` + `.deb`

## IPC channels (`window.bibledesk`)

| Method | Description |
|--------|-------------|
| `pickVault()` | Native folder picker → vault path |
| `readVault(path)` | Walk vault, return all `.md` files + content |
| `writeVault(vault, rel, content)` | Write a single note (path-traversal guarded) |
| `revealVault(path)` | Open vault in Finder / Explorer |
| `runGraphify(vault, outDir?)` | Shell out to graphify CLI, return `graph.json` |
| `syncStatus()` | DNS check → `{ online: boolean }` |

## Vault ↔ Cloud sync

1. **Download** — `GET /api/export/obsidian` (web app) → unzip into local vault folder
2. **Rebuild** — click **↻ Rebuild Graph** in the top bar → runs graphify pipeline
3. **Upload** — `POST /api/graph` with `x-graph-write-secret` header → pushes nodes/edges to Supabase

## Prerequisites

- Node.js 20+
- Python 3.11+ with graphify: `pip install graphify`
- Obsidian (optional, for vault exploration)
