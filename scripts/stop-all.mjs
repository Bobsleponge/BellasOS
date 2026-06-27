#!/usr/bin/env node
/**
 * Stop BellasOS dev stack.
 *
 * Usage:
 *   npm run dev:stop
 *   node scripts/stop-all.mjs [--keep-infra]
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPOSE_FILES = [
  '-f', 'infra/compose/docker-compose.yml',
  '-f', 'infra/compose/docker-compose.dev.yml',
];
const APP_PORTS = [3000, 4000, 5000];
const keepInfra = process.argv.includes('--keep-infra');

function log(message) {
  console.log(`[stop] ${message}`);
}

function killPort(port) {
  if (process.platform === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const pids = new Set();
      for (const line of output.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.includes('LISTENING')) continue;
        const pid = trimmed.split(/\s+/).pop();
        if (pid && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'pipe' });
          log(`Stopped process on port ${port} (PID ${pid})`);
        } catch {
          // process may have already exited
        }
      }
    } catch {
      // no listener on this port
    }
    return;
  }

  try {
    execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'pipe', shell: true });
    log(`Stopped process on port ${port}`);
  } catch {
    // no listener on this port
  }
}

function stopInfra() {
  if (keepInfra) {
    log('Keeping Docker infrastructure running (--keep-infra)');
    return;
  }
  log('Stopping Docker stack…');
  execSync(`docker compose ${COMPOSE_FILES.join(' ')} down`, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
}

function main() {
  log('Stopping application servers…');
  for (const port of APP_PORTS) {
    killPort(port);
  }
  stopInfra();
  log('Done');
}

main();
