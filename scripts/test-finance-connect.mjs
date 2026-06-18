#!/usr/bin/env node
/**
 * Test Finance-Tracker connect flow via BellasOS Command Centre API.
 * Usage: FINANCE_TRACKER_API_KEY=ft_live_... node scripts/test-finance-connect.mjs
 */
const API_BASE = process.env.BELLASOS_API_BASE ?? 'http://localhost:4000/api/v1';
const FT_URL = process.env.FINANCE_TRACKER_URL ?? 'http://localhost:5000';
const API_KEY = process.env.FINANCE_TRACKER_API_KEY;

async function invoke(action, input = {}) {
  const res = await fetch(`${API_BASE}/modules/bellasos.finance-tracker/actions/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json.data;
}

async function connect(apiKey) {
  const res = await fetch(`${API_BASE}/integrations/finance-tracker/connect`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ baseUrl: FT_URL, apiKey }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json.data;
}

async function main() {
  if (!API_KEY) {
    throw new Error('Set FINANCE_TRACKER_API_KEY (from Finance app Settings → API Keys)');
  }

  console.log('Finance-Tracker connect test\n');

  const connected = await connect(API_KEY);
  if (!connected.connected) {
    throw new Error(connected.error ?? 'Connect failed');
  }
  console.log('PASS connect', connected.user?.email ?? connected.baseUrl);

  const status = await invoke('connection.status');
  if (!status.connected) throw new Error(`Status not connected: ${status.error}`);
  console.log('PASS connection.status', status.user?.email);

  const summary = await invoke('summary.get');
  console.log('PASS summary.get netWorth=', summary.netWorth);

  console.log('\nCommand Centre connect flow works.');
}

main().catch((err) => {
  console.error('FAIL', err.message);
  process.exit(1);
});
