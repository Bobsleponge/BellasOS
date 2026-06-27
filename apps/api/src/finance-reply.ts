/** How much financial detail to surface in a Jarvis reply. */
export type FinanceReplyDetail = 'net_worth' | 'debt' | 'balance_sheet' | 'cashflow' | 'full';

import {
  resolveReplyScope,
  shouldUseSourceAttribution,
  type JarvisReplyScope,
} from '@bellasos/core-jarvis-intelligence';

const CASHFLOW =
  /\b(cashflow|cash flow|income and expenses|income vs expenses|what did i spend|how much (?:did i|have i) spend|spending this month|my (?:income|expenses))\b/i;

const BALANCE_SHEET =
  /\b(assets and liabilities|assets,? liabilities|balance sheet|what do i owe|my debts|debt breakdown|investment value|holdings value)\b/i;

const DEBT_ONLY =
  /\b(how much debt|what(?:'s| is) my debt|total debt|my debt\b|how much do i owe|what do i owe)\b/i;

/** Map global reply scope + finance-specific cues to summary shape. */
export function resolveFinanceReplyDetail(message: string): FinanceReplyDetail {
  const scope = resolveReplyScope(message, 'wealth').scope;
  if (scope === 'comprehensive') return 'full';
  if (CASHFLOW.test(message)) return 'cashflow';
  if (BALANCE_SHEET.test(message)) return 'balance_sheet';
  if (DEBT_ONLY.test(message) && scope !== 'comprehensive') return 'debt';
  if (scope === 'minimal') return 'net_worth';
  if (scope === 'focused' && /\b(net worth|worth)\b/i.test(message)) return 'net_worth';
  return scope === 'focused' ? 'balance_sheet' : 'full';
}

export function financeScopeFromMessage(message: string): JarvisReplyScope {
  return resolveReplyScope(message, 'wealth').scope;
}

export function formatMoney(amount: number, currency = 'ZAR'): string {
  const prefix = currency === 'ZAR' ? 'R' : '';
  const sign = amount < 0 ? '-' : '';
  return `${sign}${prefix}${Math.abs(amount).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
}

export function formatFinanceSummary(
  o: Record<string, unknown>,
  detail: FinanceReplyDetail = 'full',
): string {
  const currency = String(o.currency ?? 'ZAR');
  const fmt = (n: number) => formatMoney(n, currency);

  if (detail === 'debt') {
    return `Your total debt is ${fmt(Number(o.totalLiabilities ?? 0))}.`;
  }

  const netWorth = Number(o.netWorth ?? 0);
  const netWorthLine = `Your net worth is ${fmt(netWorth)}.`;

  if (detail === 'net_worth') {
    return netWorthLine;
  }

  const parts = [netWorthLine];

  if (detail === 'full' || detail === 'balance_sheet') {
    if (o.totalAssets != null || o.totalLiabilities != null) {
      parts.push(
        `Assets ${fmt(Number(o.totalAssets ?? 0))}, liabilities ${fmt(Number(o.totalLiabilities ?? 0))}, investments ${fmt(Number(o.investmentValue ?? 0))}.`,
      );
    }
  }

  if (detail === 'full' || detail === 'cashflow') {
    if (o.totalIncome != null && o.totalExpenses != null) {
      const cashflow = Number(o.netCashflow ?? Number(o.totalIncome) - Number(o.totalExpenses));
      parts.push(
        `Income ${fmt(Number(o.totalIncome))}, expenses ${fmt(Number(o.totalExpenses))}, net cashflow ${fmt(cashflow)}.`,
      );
    }
  }

  return parts.join(' ');
}

type LiabilityRow = { name?: string; current_balance?: number; amount?: number };

export function formatLiabilitiesSummary(rows: LiabilityRow[], currency = 'ZAR'): string {
  const fmt = (n: number) => formatMoney(n, currency);
  if (rows.length === 0) return 'You have no recorded liabilities.';
  const total = rows.reduce((sum, row) => sum + Number(row.current_balance ?? row.amount ?? 0), 0);
  if (rows.length === 1) {
    const name = String(rows[0]?.name ?? 'Liability').trim();
    return `Your total debt is ${fmt(total)} (${name}).`;
  }
  const names = rows
    .slice(0, 3)
    .map((row) => String(row.name ?? 'Liability').trim())
    .join(', ');
  const suffix = rows.length > 3 ? ` and ${rows.length - 3} more` : '';
  return `Your total debt is ${fmt(total)} across ${rows.length} liabilities (${names}${suffix}).`;
}

export const FINANCE_TRACKER_ATTRIBUTION = 'From Finance Tracker, as of today — ';

export function friendlyFinanceConnectionError(message: string): string {
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|connect ETIMEDOUT|Finance-Tracker is not running/i.test(message)) {
    return 'Finance-Tracker is not running. Start it on port 5000 (`cd Finance-Tracker && npm run dev`), then try again.';
  }
  return message;
}

export function isFinanceTrackerOutput(data: unknown): boolean {
  const out = (data as { output?: Record<string, unknown> })?.output ?? data;
  if (!out || typeof out !== 'object') return false;
  const o = out as Record<string, unknown>;
  if (typeof o.netWorth === 'number') return true;
  if (o.totalAssets != null || o.totalIncome != null || Array.isArray(o.investments)) return true;
  if (Array.isArray(o.liabilities)) return true;
  if (typeof o.action === 'string' && o.action !== 'connection.status') {
    const financeActions = [
      'summary.get',
      'transactions.recent',
      'investments.list',
      'assets.list',
      'liabilities.list',
      'income.list',
      'expenses.list',
    ];
    if (financeActions.includes(o.action)) return true;
  }
  return false;
}

export function withFinanceAttribution(
  text: string,
  data: unknown,
  detail: FinanceReplyDetail = 'full',
): string {
  if (!isFinanceTrackerOutput(data)) return text;
  if (text.startsWith(FINANCE_TRACKER_ATTRIBUTION)) return text;
  if (/^Finance-Tracker is not running|^Error:/i.test(text)) return text;
  const scope =
    detail === 'net_worth' || detail === 'debt' ? 'minimal' : detail === 'full' ? 'comprehensive' : 'focused';
  if (!shouldUseSourceAttribution(scope)) return text;
  return FINANCE_TRACKER_ATTRIBUTION + text;
}

export function extractFinanceText(data: unknown, userMessage?: string): string {
  const out = (data as { output?: Record<string, unknown> })?.output ?? data;
  if (out && typeof out === 'object') {
    const o = out as Record<string, unknown>;
    if (o.action === 'investments.add' && typeof o.message === 'string' && o.message.trim()) {
      return o.message.trim();
    }
    if (o.needsClarification && typeof o.message === 'string' && o.message.trim()) {
      return o.message.trim();
    }
    for (const key of ['message', 'answer', 'advice', 'response', 'analysis', 'content', 'reply', 'text', 'result']) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    if (Array.isArray(o.liabilities)) {
      const detail = userMessage ? resolveFinanceReplyDetail(userMessage) : 'full';
      const rows = o.liabilities as LiabilityRow[];
      if (detail === 'debt' || detail === 'net_worth') {
        const total = rows.reduce((sum, row) => sum + Number(row.current_balance ?? row.amount ?? 0), 0);
        return `Your total debt is ${formatMoney(total)}.`;
      }
      return formatLiabilitiesSummary(rows);
    }
    if (typeof o.netWorth === 'number' || o.totalLiabilities != null) {
      const detail = userMessage ? resolveFinanceReplyDetail(userMessage) : 'full';
      return formatFinanceSummary(o, detail);
    }
    if (typeof o.error === 'string') return friendlyFinanceConnectionError(o.error);
    const report = o.report as { content?: string } | undefined;
    if (report?.content) return report.content;
    const briefing = o.briefing as { content?: string } | undefined;
    if (briefing?.content) return briefing.content;
  }
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}
