# BibleDesk — Turnkey Deployment & Installation Guide

A complete, production-ready guide to deploying and operating BibleDesk locally, in Docker, or on Railway (`https://bibledesk.up.railway.app`).

---

## Architecture & Access Model

BibleDesk is built on Next.js 16 (App Router) and React 19. **There are no paywalls or paid tiers**:

1. **Free & Open Core (100% Free Forever)**:
   - Zero cloud configuration required.
   - 6 bundled public-domain Bible translations (KJV, ASV, WEB, BBE, Darby, YLT) stored locally in JSON format.
   - 14,000+ Strong's Greek/Hebrew lexical definitions and 29,000+ TSK cross-references.
   - Local and cloud verse notes, bookmarks, highlights, and collections.
   - 5 free server-hosted AI questions daily for signed-in users.
   - Bring-Your-Own-Key (BYOK) Google Gemini AI key option for unlimited questions.
   - Connect your personal Muse AI account token to execute queries against your Muse quota.
   - Open Model Context Protocol (MCP) server (`POST /api/mcp`) and REST API endpoints.

---

## 1. Fast Track: 1-Click Launchers

For local desktop or developer use, turnkey launchers are provided in the repository root:

- **Windows (Command Prompt / Explorer)**: Double-click or run:
  ```cmd
  Launch-BibleDesk.bat
  ```
- **Windows (PowerShell)**:
  ```powershell
  .\Launch-BibleDesk.ps1
  ```
- **macOS & Linux**:
  ```bash
  chmod +x Launch-BibleDesk.sh
  ./Launch-BibleDesk.sh
  ```

Each launcher automatically verifies your Node.js runtime, installs missing dependencies, and offers an interactive menu to launch the web app, run health diagnostics, or start Docker.

---

## 2. Docker Deployment (1-Click Container)

Run BibleDesk in a production container with standalone Next.js 16 runtime:

### Prerequisites
- Docker Engine or Docker Desktop (v24+)
- Docker Compose (v2+)

### Instructions
1. Clone the repository and configure your environment:
   ```bash
   git clone https://github.com/ShadowWalkerNC/BibleDesk.git
   cd BibleDesk
   cp .env.example .env.local
   ```
2. Start the container in detached mode:
   ```bash
   docker compose up -d
   ```
3. Open your browser:
   ```
   http://localhost:3000
   ```
4. Manage container:
   - View logs: `docker compose logs -f`
   - Check health: `docker compose ps`
   - Stop container: `docker compose down`

---

## 3. Production Deployment (Railway & Cloud Hosts)

### Architecture: Unified Web App & API Server
BibleDesk is built on Next.js 16 with the App Router. The built application (`standalone` mode running `server.js`) **contains both the web client and all backend API routes** (`/api/bible`, `/api/ask`, `/api/research`, `/api/mcp`, `/api/health`, etc.). **You do not need a separate API server or secondary microservice.** The single container processes both UI page requests and backend JSON/streaming API requests.

### Step 1: Provision Railway PostgreSQL (Optional for Cloud Sync)
1. In Railway, click **New** → **Database** → **PostgreSQL** (or attach any PostgreSQL 15+ with pgvector).
2. Ensure the `vector` (pgvector) extension is enabled for RAG similarity search.
3. Set `DATABASE_URL` to the Railway connection string (`${{Postgres.DATABASE_URL}}`).
4. Run `npm run db:migrate` (or let the Docker CMD apply the `drizzle/` migrations automatically on first boot).
   - *The `drizzle/` chain creates all 35 tables: accounts, profiles, answers, prayer, Prayer Care, billing, graph, and study resources.*
   - *Note: If `DATABASE_URL` is omitted, BibleDesk automatically operates in self-contained embedded (PGlite) mode.*

### Step 2: Configure Environment Variables
In your Railway (or Vercel) project environment settings, add the following variables:

| Variable | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical HTTPS URL (e.g. `https://bibledesk.up.railway.app`). If unset, Railway's assigned public domain is detected automatically. |
| `DATABASE_URL` | Recommended | Railway PostgreSQL connection string (enables accounts, cloud sync, prayer) |
| `JWT_SECRET` | Recommended | Secret for stateless auth sessions (`openssl rand -hex 32`) |
| `PGLITE_DATA_DIR` | Optional | Embedded database directory when `DATABASE_URL` is unset |
| `GEMINI_API_KEY` | Recommended | Google Gemini key for hosted AI study assistant |
| `OPENAI_API_KEY` | Recommended | OpenAI key for text-embedding-3-small pgvector RAG |
| `IP_HASH_SALT` | Recommended | Secret salt for SHA-256 rate limiting (`openssl rand -hex 16`) |
| `MCP_SECRET` | Recommended | Bearer secret for external MCP agent connections |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key for Pro SaaS subscriptions |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook signing secret |
| `NEXT_PUBLIC_SELF_HOSTED` | Optional | Set to `'true'` to grant Pro features to all community members for free |

### Step 3: Deploy to Railway
BibleDesk is pre-configured for 1-click Railway deployments via `railway.json` and the multi-stage `Dockerfile`:

1. In Railway, click **New Project** → **Deploy from GitHub repo**.
2. Select your `BibleDesk` repository.
3. Railway automatically detects `railway.json` and uses the production `Dockerfile`.
4. Railway injects its assigned `PORT` dynamically, which is picked up by Next.js and the `/api/health` check probe.
5. In **Settings** → **Networking**, click **Generate Domain** (or assign a custom domain).
6. Verify deployment by visiting `/api/health` and your public URL.

### Step 4: Deploy to Vercel (Alternative)
Deploy directly via GitHub integration or CLI:
```bash
vercel --prod
```

---

## 4. Environment & Diagnostic Doctor

Before going live or after editing keys, run the diagnostic doctor:

```bash
npm run check:env
```

The tool validates:
- Node.js runtime version.
- Bundled Bible translation files integrity.
- Strong's Greek/Hebrew lexicons and TSK cross-references.
- Canonical app origin formatting.
- Railway PostgreSQL (`DATABASE_URL`) and JWT secret configuration.
- AI keys (Gemini, OpenAI RAG).
- Rate limiter salt and MCP secrets.
- Stripe billing integration.

---

## 5. Security & Verification Tests

To verify security boundaries, owner-scoped RLS policies, and token privacy:

```bash
# Run security boundary tests
npm test

# Run TypeScript typecheck
npm run typecheck

# Test Next.js production build
npm run build
```

---

## 6. Official Client SDK & MCP

BibleDesk includes an isomorphic client SDK for Node.js, Web, and AI agents:

```bash
# Build the SDK package locally
npm run sdk:build
```

External agents (Claude Desktop, Cursor, Windsurf) connect to the Model Context Protocol endpoint:
```
POST /api/mcp
Authorization: Bearer <YOUR_MCP_SECRET>
```
