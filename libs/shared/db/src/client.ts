import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { createLogger } from '@bellasos/observability';
import type { Database } from './schema';

const log = createLogger({ lib: 'db' });

let pool: Pool | undefined;
let db: Kysely<Database> | undefined;
let available = false;

export interface DbConfig {
  connectionString: string;
  max?: number;
}

export function createPool(config: DbConfig): Pool {
  return new Pool({
    connectionString: config.connectionString,
    max: config.max ?? 10,
    connectionTimeoutMillis: 5000,
  });
}

/**
 * Initialise the shared connection pool. Returns whether a live connection was
 * established; the platform degrades to in-memory adapters when it is not.
 */
export async function initDb(config: DbConfig): Promise<boolean> {
  pool = createPool(config);
  db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  try {
    await pool.query('SELECT 1');
    available = true;
    log.info('Database connection established');
  } catch (err) {
    available = false;
    log.warn('Database unreachable; running in degraded (in-memory) mode', {
      error: (err as Error).message,
    });
  }
  return available;
}

export function getDb(): Kysely<Database> {
  if (!db) throw new Error('Database not initialised. Call initDb() first.');
  return db;
}

export function getPool(): Pool {
  if (!pool) throw new Error('Database not initialised. Call initDb() first.');
  return pool;
}

export function isDbAvailable(): boolean {
  return available;
}

export async function closeDb(): Promise<void> {
  await db?.destroy();
  pool = undefined;
  db = undefined;
  available = false;
}
