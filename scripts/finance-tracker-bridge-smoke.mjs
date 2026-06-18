#!/usr/bin/env node
/**
 * Smoke test for bellasos.finance-tracker live bridge.
 * Requires Finance-Tracker on :5000 and BellasOS API on :4000.
 */
const API_BASE = process.env.BELLASOS_API_BASE ?? 'http://localhost:4000/api/v1';

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

async function main() {
  console.log('Finance-Tracker bridge smoke test\n');

  const status = await invoke('connection.status');
  if (!status.connected) {
    throw new Error(`Not connected: ${status.error ?? 'unknown'}`);
  }
  console.log('PASS connection.status', status.baseUrl);

  const summary = await invoke('summary.get');
  console.log('PASS summary.get netWorth=', summary.netWorth, 'currency=', summary.currency);

  const tx = await invoke('transactions.recent', { limit: 5 });
  console.log('PASS transactions.recent count=', Array.isArray(tx) ? tx.length : 0);

  const expense = await invoke('expenses.add', {
    amount: 99.5,
    category: 'groceries',
    description: 'Jarvis bridge smoke test expense',
  });
  console.log('PASS expenses.add id=', expense.id);

  console.log('\nAll finance-tracker bridge smoke tests passed.');
}

main().catch((err) => {
  console.error('FAIL', err.message);
  process.exit(1);
});
