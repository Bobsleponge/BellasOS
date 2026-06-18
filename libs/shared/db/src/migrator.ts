import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Pool } from 'pg';
import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'db.migrator' });

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS public._migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);`;

/**
 * Apply all *.sql migration files (lexicographically ordered) that have not yet
 * been applied. Each migration runs in its own transaction and is recorded in
 * `public._migrations`, making startup migrations idempotent.
 */
export async function runMigrations(
  pool: Pool,
  migrationsDir: string,
): Promise<{ applied: string[]; skipped: string[] }> {
  const dir = resolve(migrationsDir);
  await pool.query(MIGRATIONS_TABLE);

  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM public._migrations',
  );
  const applied = new Set(rows.map((r) => r.id));

  const appliedNow: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      skipped.push(file);
      continue;
    }
    const sql = await readFile(join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO public._migrations (id) VALUES ($1)', [
        file,
      ]);
      await client.query('COMMIT');
      appliedNow.push(file);
      log.info(`Applied migration ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      log.error(`Migration failed: ${file}`, {
        error: (err as Error).message,
      });
      throw err;
    } finally {
      client.release();
    }
  }

  return { applied: appliedNow, skipped };
}
