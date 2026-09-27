#!/usr/bin/env node
/**
 * scripts/doctor.mjs
 * BibleDesk Environment & Diagnostic Doctor
 *
 * Runs self-test to verify local data, environment variables,
 * database setup, and AI readiness.
 *
 * Run via: npm run check:env
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load .env.local and .env manually if dotenv isn't installed
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["'](.*)["']$/, '$1');
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile(path.join(ROOT_DIR, '.env.local'));
loadEnvFile(path.join(ROOT_DIR, '.env'));

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

console.log(`\n${c.bold}${c.cyan}✦ ══════════════════════════════════════════════════════════ ✦${c.reset}`);
console.log(`${c.bold}${c.cyan}            BibleDesk Environment & Health Doctor           ✦${c.reset}`);
console.log(`${c.bold}${c.cyan}✦ ══════════════════════════════════════════════════════════ ✦${c.reset}\n`);

let passedCount = 0;
let warnCount = 0;
let failCount = 0;

function pass(title, detail = '') {
  passedCount++;
  console.log(`  ${c.green}✓ PASS${c.reset}  ${title} ${detail ? c.gray + '(' + detail + ')' + c.reset : ''}`);
}

function warn(title, detail = '') {
  warnCount++;
  console.log(`  ${c.yellow}▲ WARN${c.reset}  ${title} ${detail ? c.gray + '— ' + detail + c.reset : ''}`);
}

function fail(title, detail = '') {
  failCount++;
  console.log(`  ${c.red}✖ FAIL${c.reset}  ${title} ${detail ? c.red + '— ' + detail + c.reset : ''}`);
}

// 1. Node.js runtime check
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor >= 20) {
  pass(`Node.js Runtime: v${process.versions.node}`, 'Recommended >= v20');
} else {
  fail(`Node.js Runtime: v${process.versions.node}`, 'Next.js 16 requires Node.js v20.9.0 or higher');
}

// 2. Bundled Scripture Data check
const bibleFiles = ['asv.json', 'bbe.json', 'darby.json', 'kjv.json', 'web.json', 'ylt.json'];
const biblesDir = path.join(ROOT_DIR, 'src', 'data', 'bibles');
const missingBibles = bibleFiles.filter(f => !fs.existsSync(path.join(biblesDir, f)));

if (missingBibles.length === 0) {
  pass('Offline Scripture Modules: 6 Bundled Translations present', 'KJV, ASV, WEB, BBE, Darby, YLT');
} else {
  fail('Offline Scripture Modules: Missing files', missingBibles.join(', '));
}

// 3. Lexicon & Cross-Reference Data check
const lexiconDir = path.join(ROOT_DIR, 'src', 'data', 'lexicon');
const greekExists = fs.existsSync(path.join(lexiconDir, 'greek.json'));
const hebrewExists = fs.existsSync(path.join(lexiconDir, 'hebrew.json'));
const tskExists = fs.existsSync(path.join(lexiconDir, 'cross_references.json'));

if (greekExists && hebrewExists && tskExists) {
  pass("Strong's Lexicons & TSK Cross-References: All 3 index files present");
} else {
  fail("Strong's Lexicons or TSK data missing in src/data/lexicon");
}

// 4. App URL & Canonical Origin
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null) ||
  (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : null);

if (appUrl) {
  if (appUrl.startsWith('http://localhost') || appUrl.startsWith('https://')) {
    pass(`Canonical App Origin: ${appUrl}`);
  } else {
    warn(`Canonical App Origin: ${appUrl}`, 'Must start with http:// or https://');
  }
} else {
  warn('NEXT_PUBLIC_APP_URL is not defined in .env.local', 'Defaulting to http://localhost:3000 (detected Railway/local fallback)');
}

// 5. Supabase Configuration check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
  pass(`Supabase Connection: Configured (${supabaseUrl})`);
  if (supabaseServiceKey) {
    pass('Supabase Service Role Key: Present (Server operations enabled)');
  } else {
    warn('SUPABASE_SERVICE_ROLE_KEY is unset', 'Server-only operations and RAG moderation will fall back to mock/offline');
  }
} else {
  warn('Supabase is not configured', 'Running in local/offline storage mode. Cloud sync & accounts will be local-only.');
}

// 6. AI Engine Configuration check
const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (geminiKey) {
  pass('Google Gemini API: Configured (Hosted 5D Assistant enabled)');
} else {
  warn('GEMINI_API_KEY is not set', 'Server AI assistant will require users to provide their own free key (BYOK). Reader remains 100% free.');
}

if (openaiKey) {
  pass('OpenAI Embeddings: Configured (text-embedding-3-small for pgvector RAG)');
} else {
  warn('OPENAI_API_KEY is unset', 'Vector RAG exact match caching is disabled; pipeline runs direct queries.');
}

// 7. Security Salt & Secrets
if (process.env.IP_HASH_SALT) {
  pass('IP Rate Limiter Salt: Configured');
} else {
  warn('IP_HASH_SALT is unset', 'Rate limiting will use in-memory ephemeral salt.');
}

if (process.env.MCP_SECRET) {
  pass('Model Context Protocol (MCP): Secret configured for external agents');
} else {
  warn('MCP_SECRET is unset', 'POST /api/mcp endpoint will refuse external requests with 401.');
}

// 8. SaaS / Billing & Self-Hosted Check
const stripeKey = process.env.STRIPE_SECRET_KEY;
const isSelfHosted = process.env.NEXT_PUBLIC_SELF_HOSTED === 'true' || process.env.NEXT_PUBLIC_COMMUNITY_MODE === 'true';

if (isSelfHosted) {
  pass('Self-Hosted Mode: Active (NEXT_PUBLIC_SELF_HOSTED=true grants full Pro capabilities to all local users)');
} else if (stripeKey) {
  pass('Stripe Billing: Secret key configured (Pro SaaS hosted tier active)');
} else {
  warn('Stripe Billing is unset', 'Running in Community Cloud mode. Set NEXT_PUBLIC_SELF_HOSTED=true to unlock full Pro features for self-hosting.');
}


// ── Summary Report ──────────────────────────────────────────────────────────
console.log(`\n${c.bold}══════════════════════════════════════════════════════════════${c.reset}`);
console.log(`  Results: ${c.green}${passedCount} Passed${c.reset}  |  ${c.yellow}${warnCount} Warnings${c.reset}  |  ${c.red}${failCount} Failed${c.reset}`);
console.log(`${c.bold}══════════════════════════════════════════════════════════════${c.reset}\n`);

if (failCount > 0) {
  console.log(`${c.red}${c.bold}✖ Action Required:${c.reset} Please fix the failed items above before deploying.\n`);
  process.exit(1);
} else if (warnCount > 0) {
  console.log(`${c.green}${c.bold}✓ System is Operational!${c.reset} Some optional cloud/AI features have warnings above, but the core Bible app will run.\n`);
  process.exit(0);
} else {
  console.log(`${c.green}${c.bold}✓ Ready for Production!${c.reset} All systems, data, and configurations are green.\n`);
  process.exit(0);
}
