"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'db.migrator' });
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
async function runMigrations(pool, migrationsDir) {
    const dir = (0, node_path_1.resolve)(migrationsDir);
    await pool.query(MIGRATIONS_TABLE);
    const files = (await (0, promises_1.readdir)(dir))
        .filter((f) => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b));
    const { rows } = await pool.query('SELECT id FROM public._migrations');
    const applied = new Set(rows.map((r) => r.id));
    const appliedNow = [];
    const skipped = [];
    for (const file of files) {
        if (applied.has(file)) {
            skipped.push(file);
            continue;
        }
        const sql = await (0, promises_1.readFile)((0, node_path_1.join)(dir, file), 'utf8');
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
        }
        catch (err) {
            await client.query('ROLLBACK');
            log.error(`Migration failed: ${file}`, {
                error: err.message,
            });
            throw err;
        }
        finally {
            client.release();
        }
    }
    return { applied: appliedNow, skipped };
}
//# sourceMappingURL=migrator.js.map