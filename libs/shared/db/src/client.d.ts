import { Kysely } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './schema';
export interface DbConfig {
    connectionString: string;
    max?: number;
}
export declare function createPool(config: DbConfig): Pool;
/**
 * Initialise the shared connection pool. Returns whether a live connection was
 * established; the platform degrades to in-memory adapters when it is not.
 */
export declare function initDb(config: DbConfig): Promise<boolean>;
export declare function getDb(): Kysely<Database>;
export declare function getPool(): Pool;
export declare function isDbAvailable(): boolean;
export declare function closeDb(): Promise<void>;
//# sourceMappingURL=client.d.ts.map