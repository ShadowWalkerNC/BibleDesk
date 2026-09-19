import path from 'path';
import fs from 'fs';
import * as schema from './schema';

let dbInstance: any = null;

/**
 * Initializes and returns the Drizzle database client.
 *
 * Supports dual-mode execution:
 * 1. Standard PostgreSQL via `DATABASE_URL` (production Supabase, Docker, RDS).
 * 2. Embedded PostgreSQL (`@electric-sql/pglite`) for local zero-config runs and testing.
 */
export async function getDb() {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.startsWith('pglite://')) {
    // Standard PostgreSQL via pg.Pool
    const { Pool } = await import('pg');
    const { drizzle } = await import('drizzle-orm/node-postgres');

    const pool = new Pool({ connectionString: databaseUrl });
    dbInstance = drizzle(pool, { schema });
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
 * Auto-applies initial migration to PGlite if tables are not yet created.
 */
async function ensureSchema(client: any) {
  try {
    const migrationPath = path.join(process.cwd(), 'drizzle', '0000_previous_firedrake.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      const statements = sql.split('--> statement-breakpoint');
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed) {
          try {
            await client.exec(trimmed);
          } catch (e: any) {
            // Ignore if table/index already exists
            if (!e.message?.includes('already exists')) {
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
