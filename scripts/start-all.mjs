#!/usr/bin/env node
/**
 * BellasOS full-stack dev startup sequence.
 *
 * Order:
 *   1. Prerequisites (.env, node_modules)
 *   2. Docker infrastructure (Postgres, Redis, NATS, Keycloak, observability)
 *   3. Wait for core services to become healthy
 *   4. Database migrations
 *   5. Application dev servers (api → worker → web + finance in parallel)
 *
 * Usage:
 *   npm run dev:all
 *   node scripts/start-all.mjs [--skip-infra] [--skip-migrate] [--no-finance]
 */
import { execSync } from 'node:child_process';
import concurrently from 'concurrently';
import { existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FINANCE_ROOT = join(ROOT, '..', 'Finance-Tracker');
const COMPOSE_FILES = [
  '-f', 'infra/compose/docker-compose.yml',
  '-f', 'infra/compose/docker-compose.dev.yml',
];

const args = new Set(process.argv.slice(2));
const skipInfra = args.has('--skip-infra');
const skipMigrate = args.has('--skip-migrate');
const noFinance = args.has('--no-finance');

const SERVICES = {
  postgres: { container: 'bellasos-postgres-1', check: 'pg_isready -U bellasos' },
  redis: { container: 'bellasos-redis-1', check: 'redis-cli ping' },
};

const ENDPOINTS = [
  { name: 'Command Center', url: 'http://localhost:3000' },
  { name: 'API', url: 'http://localhost:4000/api/v1' },
  { name: 'Finance Tracker', url: 'http://localhost:5000', optional: noFinance },
  { name: 'Keycloak', url: 'http://localhost:8080' },
  { name: 'Grafana', url: 'http://localhost:3001' },
  { name: 'Prometheus', url: 'http://localhost:9090' },
];

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command, options = {}) {
  execSync(command, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    ...options,
  });
}

function runQuiet(command) {
  execSync(command, { cwd: ROOT, stdio: 'pipe', shell: true });
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) {
    throw new Error(`Node.js >= 20 required (found ${process.versions.node})`);
  }
}

function checkDocker() {
  if (skipInfra) return;
  try {
    runQuiet('docker info');
  } catch {
    throw new Error('Docker is not running. Start Docker Desktop or pass --skip-infra.');
  }
}

function ensureEnv() {
  const envPath = join(ROOT, '.env');
  const examplePath = join(ROOT, '.env.example');
  if (!existsSync(envPath)) {
    if (!existsSync(examplePath)) {
      throw new Error('Missing .env and .env.example');
    }
    copyFileSync(examplePath, envPath);
    log('setup', 'Created .env from .env.example');
  }
}

function ensureDependencies() {
  if (!existsSync(join(ROOT, 'node_modules'))) {
    log('setup', 'Installing BellasOS dependencies…');
    run('npm install');
  }
  if (!noFinance && existsSync(FINANCE_ROOT) && !existsSync(join(FINANCE_ROOT, 'node_modules'))) {
    log('setup', 'Installing Finance Tracker dependencies…');
    run('npm install', { cwd: FINANCE_ROOT });
  }
}

function startInfra() {
  if (skipInfra) {
    log('infra', 'Skipped (--skip-infra)');
    return;
  }
  log('infra', 'Starting Docker stack…');
  run(`docker compose ${COMPOSE_FILES.join(' ')} up -d`);
}

async function waitForService(name, { container, check }, attempts = 30, intervalMs = 2000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const result = execSync(`docker exec ${container} ${check}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      if (name === 'redis' && result !== 'PONG') continue;
      log('infra', `${name} is ready`);
      return;
    } catch {
      if (i === attempts) {
        throw new Error(`${name} did not become ready within ${(attempts * intervalMs) / 1000}s`);
      }
      process.stdout.write(`[infra] waiting for ${name} (${i}/${attempts})…\r`);
      await sleep(intervalMs);
    }
  }
}

async function waitForInfra() {
  if (skipInfra) return;
  for (const [name, config] of Object.entries(SERVICES)) {
    await waitForService(name, config);
  }
}

function migrate() {
  if (skipMigrate) {
    log('db', 'Skipped (--skip-migrate)');
    return;
  }
  log('db', 'Applying migrations…');
  run('npm run db:migrate');
}

function printEndpoints() {
  console.log('\n--- BellasOS dev stack ---');
  for (const { name, url, optional } of ENDPOINTS) {
    if (optional) continue;
    console.log(`  ${name.padEnd(18)} ${url}`);
  }
  console.log('\nPress Ctrl+C to stop all application servers.\n');
}

function startApps() {
  log('apps', 'Starting dev servers…');

  const commands = [
    { command: 'npm run dev:api', name: 'api', prefixColor: 'blue' },
    { command: 'npm run dev:worker', name: 'worker', prefixColor: 'green' },
    { command: 'npm run dev:web', name: 'web', prefixColor: 'yellow' },
  ];
  if (!noFinance && existsSync(FINANCE_ROOT)) {
    commands.push({ command: 'npm run dev:finance', name: 'finance', prefixColor: 'magenta' });
  } else if (!noFinance) {
    log('apps', 'Finance Tracker not found — skipping (expected at ../Finance-Tracker)');
  }

  const { result } = concurrently(commands, {
    cwd: ROOT,
    killOthersOn: 'failure',
  });

  result.then(
    () => process.exit(0),
    () => process.exit(1),
  );
}

async function main() {
  try {
    log('start', 'BellasOS full-stack startup');
    checkNodeVersion();
    ensureEnv();
    checkDocker();
    ensureDependencies();
    startInfra();
    await waitForInfra();
    migrate();
    printEndpoints();
    startApps();
  } catch (err) {
    console.error(`\n[start] Failed: ${err.message}`);
    process.exit(1);
  }
}

main();
