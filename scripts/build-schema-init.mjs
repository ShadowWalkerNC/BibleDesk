#!/usr/bin/env node
/**
 * scripts/build-schema-init.mjs
 * Bundles the ordered Supabase migration chain into a single turnkey schema-init.sql file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SUPABASE_DIR = path.join(ROOT_DIR, 'supabase');

const CANONICAL_FILES = [
  'schema.sql',
  'schema-v2.sql',
  'schema-v3.sql',
  'schema-v4.sql',
  'schema-v5.sql',
  'schema-v6.sql',
  'schema-v7.sql',
  'schema-v8.sql',
  'schema-v9.sql',
  'schema-v10-public-prayer.sql',
  'rpc.sql',
  'migrations/20260918_saas_subscriptions.sql',
];

console.log('✦ Assembling consolidated supabase/schema-init.sql...');

let output = `-- =====================================================================
-- BibleDesk — Consolidated Turnkey Database Initialization (schema-init.sql)
--
-- This single file contains the entire schema for BibleDesk:
-- - Base tables (answers, rate_limits, moderators, canonical_answers)
-- - Moderation & RAG pgvector RPC functions
-- - Biblical Knowledge Graph & PrayerAtlas companion tables
-- - User Profiles, Verse Highlights, Verse Notes
-- - Canonical Prayer Requests (with geo, privacy, and escalation levels)
-- - Notification preferences & bookmarks
-- - Churches directory & creator profiles
-- - SaaS subscriptions & membership tier columns
--
-- Safe to execute on fresh projects or re-run on existing databases.
-- Generated: ${new Date().toISOString()}
-- =====================================================================

`;

for (const file of CANONICAL_FILES) {
  const filePath = path.join(SUPABASE_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  output += `\n-- ─────────────────────────────────────────────────────────────────────\n`;
  output += `-- FILE: ${file}\n`;
  output += `-- ─────────────────────────────────────────────────────────────────────\n\n`;
  output += content.trim() + '\n';
}

const targetPath = path.join(SUPABASE_DIR, 'schema-init.sql');
fs.writeFileSync(targetPath, output, 'utf8');

console.log(`✓ Assembled ${CANONICAL_FILES.length} migration files into ${targetPath} (${output.length} bytes).`);
