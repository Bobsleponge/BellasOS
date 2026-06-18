import { resolve } from 'node:path';
import { createPool } from '../client';
import { runMigrations } from '../migrator';
import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'db.cli' });

async function main(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgres://bellasos:bellasos@localhost:5432/bellasos';
  const migrationsDir = resolve(__dirname, '../../migrations');

  const pool = createPool({ connectionString });
  try {
    const result = await runMigrations(pool, migrationsDir);
    log.info('Migrations complete', {
      applied: result.applied.length,
      skipped: result.skipped.length,
    });
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  log.error('Migration run failed', { error: (err as Error).message });
  process.exit(1);
});
