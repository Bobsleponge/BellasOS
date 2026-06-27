"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPool = createPool;
exports.initDb = initDb;
exports.getDb = getDb;
exports.getPool = getPool;
exports.isDbAvailable = isDbAvailable;
exports.closeDb = closeDb;
const kysely_1 = require("kysely");
const pg_1 = require("pg");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'db' });
let pool;
let db;
let available = false;
function createPool(config) {
    return new pg_1.Pool({
        connectionString: config.connectionString,
        max: config.max ?? 10,
        connectionTimeoutMillis: 5000,
    });
}
/**
 * Initialise the shared connection pool. Returns whether a live connection was
 * established; the platform degrades to in-memory adapters when it is not.
 */
async function initDb(config) {
    pool = createPool(config);
    db = new kysely_1.Kysely({ dialect: new kysely_1.PostgresDialect({ pool }) });
    try {
        await pool.query('SELECT 1');
        available = true;
        log.info('Database connection established');
    }
    catch (err) {
        available = false;
        log.warn('Database unreachable; running in degraded (in-memory) mode', {
            error: err.message,
        });
    }
    return available;
}
function getDb() {
    if (!db)
        throw new Error('Database not initialised. Call initDb() first.');
    return db;
}
function getPool() {
    if (!pool)
        throw new Error('Database not initialised. Call initDb() first.');
    return pool;
}
function isDbAvailable() {
    return available;
}
async function closeDb() {
    await db?.destroy();
    pool = undefined;
    db = undefined;
    available = false;
}
//# sourceMappingURL=client.js.map