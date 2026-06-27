import type { Pool } from 'pg';
/**
 * Apply all *.sql migration files (lexicographically ordered) that have not yet
 * been applied. Each migration runs in its own transaction and is recorded in
 * `public._migrations`, making startup migrations idempotent.
 */
export declare function runMigrations(pool: Pool, migrationsDir: string): Promise<{
    applied: string[];
    skipped: string[];
}>;
//# sourceMappingURL=migrator.d.ts.map