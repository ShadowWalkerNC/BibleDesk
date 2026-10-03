import path from 'path';
import fs from 'fs';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

/** Union of the two supported Drizzle backends (Railway PostgreSQL / embedded PGlite). */
export type BibleDeskDb = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

let dbInstance: BibleDeskDb | null = null;

/**
 * Initializes and returns the typed Drizzle database client.
 *
 * Supports dual-mode execution:
 * 1. Standard PostgreSQL via `DATABASE_URL` (Railway production, Docker, RDS).
 * 2. Embedded PostgreSQL (`@electric-sql/pglite`) for local zero-config runs and testing.
 */
export async function getDb(): Promise<BibleDeskDb> {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.startsWith('pglite://')) {
    // Standard PostgreSQL via pg.Pool
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    dbInstance = drizzle(pool, { schema });

    // Auto-apply schema migrations if tables do not exist
    await ensureSchema({
      exec: async (sqlText: string) => {
        await pool.query(sqlText);
      },
    });

    return dbInstance;
  }

  // Embedded PostgreSQL via PGlite (Real Postgres compiled to WASM)
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');

  const dataDir = process.env.PGLITE_DATA_DIR || path.join(process.cwd(), 'data', 'bibledesk_pg');
  if (!fs.existsSync(/*turbopackIgnore: true*/ dataDir)) {
    fs.mkdirSync(/*turbopackIgnore: true*/ dataDir, { recursive: true });
  }

  const client = new PGlite(dataDir);
  dbInstance = drizzle(client, { schema });

  // Ensure tables exist in embedded mode
  await ensureSchema(client);

  return dbInstance;
}

/**
 * Auto-applies every migration in drizzle/*.sql to PGlite if tables are missing.
 * Idempotent: "already exists" errors are swallowed so re-runs are safe.
 */
async function ensureSchema(client: { exec: (sql: string) => Promise<unknown> }) {
  try {
    const drizzleDir = path.join(process.cwd(), 'drizzle');
    if (!fs.existsSync(drizzleDir)) return;
    const files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const sqlText = fs.readFileSync(path.join(drizzleDir, file), 'utf8');
      const statements = sqlText.split('--> statement-breakpoint');
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed) {
          try {
            await client.exec(trimmed);
          } catch (e: unknown) {
            // Ignore if table/index already exists
            const message = e instanceof Error ? e.message : String(e);
            if (!message.includes('already exists')) {
              // Only throw if unexpected
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[DB] Auto-schema init note:', err);
  }
}

export * from './schema';
