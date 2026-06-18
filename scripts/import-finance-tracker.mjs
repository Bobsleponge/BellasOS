#!/usr/bin/env node
/**
 * Import investments from Finance-Tracker SQLite into BellasOS finance module.
 *
 * Usage:
 *   node scripts/import-finance-tracker.mjs
 *   node scripts/import-finance-tracker.mjs --db "C:/path/to/database.sqlite"
 *   node scripts/import-finance-tracker.mjs --replace
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const API_BASE = process.env.BELLASOS_API_BASE ?? 'http://localhost:4000/api/v1';
const defaultDb = resolve(
  process.env.FINANCE_TRACKER_DB ??
    resolve(process.env.USERPROFILE ?? process.env.HOME ?? '.', 'Finance-Tracker', 'database.sqlite'),
);

const args = process.argv.slice(2);
const replace = args.includes('--replace');
const dbArg = args.find((a) => a.startsWith('--db='))?.slice(5) ?? args[args.indexOf('--db') + 1];
const dbPath = resolve(dbArg ?? defaultDb);

async function loadInvestmentsFromSqlite(path) {
  let Database;
  try {
    const mod = await import('better-sqlite3');
    Database = mod.default;
  } catch {
    throw new Error(
      'better-sqlite3 is required. From bellasos root run: npm install better-sqlite3 --no-save',
    );
  }
  if (!existsSync(path)) {
    throw new Error(`Database not found: ${path}`);
  }
  const db = new Database(path, { readonly: true });
  try {
    const rows = db
      .prepare(
        `SELECT symbol, name, investment_type, account_type, quantity, purchase_price,
                current_price, purchase_date, description, commission
         FROM investments ORDER BY id`,
      )
      .all();
    return rows;
  } finally {
    db.close();
  }
}

async function importToBellasos(rows) {
  const res = await fetch(`${API_BASE}/modules/bellasos.finance/actions/investments.import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ investments: rows, replace }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`${json.error.code}: ${json.error.message}`);
  }
  return json.data;
}

async function main() {
  console.log(`Reading: ${dbPath}`);
  const rows = await loadInvestmentsFromSqlite(dbPath);
  console.log(`Found ${rows.length} investment(s)`);
  if (!rows.length) {
    console.log('Nothing to import.');
    return;
  }
  const result = await importToBellasos(rows);
  console.log(`Imported ${result.imported} investment(s) into bellasos.finance`);
  console.log('Open Portfolio or Finance in BellasOS to review.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
