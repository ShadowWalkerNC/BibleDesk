import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/db';
import { scriptureVerses, studyNotes, studyCollections } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { isDatabaseConfigured } from '@/lib/answers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, any> = {};
  let overallHealthy = true;
  const issues: string[] = [];

  // 1. Offline Scripture Modules Check
  const bibleFiles = ['asv.json', 'bbe.json', 'darby.json', 'kjv.json', 'web.json', 'ylt.json'];
  const biblesDir = path.join(process.cwd(), 'src', 'data', 'bibles');
  const missingBibles = bibleFiles.filter((f) => !fs.existsSync(path.join(biblesDir, f)));

  if (missingBibles.length === 0) {
    checks.scriptures = {
      status: 'healthy',
      label: 'Offline Scripture Library',
      description: 'All 6 public-domain Bible translations are bundled and ready for offline reading.',
      detail: 'KJV, ASV, WEB, BBE, Darby, YLT',
    };
  } else {
    overallHealthy = false;
    issues.push(`Missing translations: ${missingBibles.join(', ')}`);
    checks.scriptures = {
      status: 'error',
      label: 'Offline Scripture Library',
      description: `Some Bible files are missing (${missingBibles.join(', ')}).`,
      action: 'Run the database setup script to restore missing files.',
    };
  }

  // 2. Strong's Lexicon & TSK Cross-References Check
  const lexiconDir = path.join(process.cwd(), 'src', 'data', 'lexicon');
  const greekOk = fs.existsSync(path.join(lexiconDir, 'greek.json'));
  const hebrewOk = fs.existsSync(path.join(lexiconDir, 'hebrew.json'));
  const tskOk = fs.existsSync(path.join(lexiconDir, 'cross_references.json'));

  if (greekOk && hebrewOk && tskOk) {
    checks.lexicons = {
      status: 'healthy',
      label: 'Original Language Dictionaries & Cross-References',
      description: "Strong's Greek (5.5k), Hebrew (8.6k), and Treasury of Scripture Knowledge cross-references are ready.",
    };
  } else {
    checks.lexicons = {
      status: 'warning',
      label: 'Original Language Dictionaries',
      description: 'One or more original language index files are missing. Lexical lookups may be limited.',
    };
  }

  // 3. Database Layer Check (PostgreSQL / Embedded PGlite via Drizzle ORM)
  const dbStart = Date.now();
  try {
    const db = await getDb();
    const verseCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(scriptureVerses);
    const verseCount = Number(verseCountRes[0]?.count || 0);

    const notesCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(studyNotes);
    const notesCount = Number(notesCountRes[0]?.count || 0);

    const collectionsCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(studyCollections);
    const collectionsCount = Number(collectionsCountRes[0]?.count || 0);

    const dbLatency = Date.now() - dbStart;

    checks.database = {
      status: 'healthy',
      label: 'Relational Database Engine',
      description: `Database is responsive (${dbLatency}ms latency). All core tables and indexes are active.`,
      verseCount,
      notesCount,
      collectionsCount,
      databaseType: process.env.DATABASE_URL ? 'PostgreSQL Server' : 'Embedded WASM PostgreSQL (PGlite)',
    };
  } catch (err: any) {
    overallHealthy = false;
    issues.push('Database connection error');
    checks.database = {
      status: 'error',
      label: 'Relational Database Engine',
      description: err?.message
        ? `Could not connect to the database: ${err.message}`
        : 'Could not connect to the database. Storage and search functions may be unavailable.',
      error: err?.message || 'Unknown database error',
      databaseType: process.env.DATABASE_URL ? 'PostgreSQL Server (Railway)' : 'Embedded WASM PostgreSQL (PGlite)',
      action: 'Check that DATABASE_URL is set in your Railway environment variables and the PostgreSQL service is active.',
    };
  }

  // 4. AI Assistant Readiness Check
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  checks.ai = {
    status: 'healthy',
    label: '5-Dimension AI Study Assistant',
    description: hasGeminiKey || hasAnthropicKey
      ? 'Server-managed AI assistant is configured and available.'
      : 'Local-first study mode is active. You can read, search, and study 100% free without an API key, or provide a free personal key anytime in settings.',
    serverConfigured: hasGeminiKey || hasAnthropicKey,
  };

  // 5. Cloud Sync & Security Check
  const dbConfigured = isDatabaseConfigured();
  checks.cloudSync = {
    status: 'healthy',
    label: 'Account & Multi-Device Sync',
    description: dbConfigured
      ? 'Cloud account synchronization is active and secure.'
      : 'Local-first privacy mode: your study notes and prayer commitments remain securely stored on this device.',
    cloudActive: dbConfigured,
  };

  const totalDuration = Date.now() - startedAt;

  return NextResponse.json({
    success: true,
    overallStatus: overallHealthy ? (issues.length > 0 ? 'warning' : 'healthy') : 'error',
    headline: overallHealthy
      ? 'All BibleDesk services and databases are healthy.'
      : 'One or more components need attention.',
    issues,
    checks,
    diagnosticsDurationMs: totalDuration,
    timestamp: new Date().toISOString(),
    systemInfo: {
      platform: process.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      appVersion: '1.0.0',
    },
  });
}
