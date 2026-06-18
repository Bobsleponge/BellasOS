/** Standalone Portfolio / Finance-Tracker app routes (not Command Center). */
export const APP_STANDALONE_ROUTES: Record<string, string> = {
  'bellasos.portfolio': '/finance',
  'bellasos.finance': '/finance',
};

export const FINANCE_APP_DEFAULT_PATH = '';

export const FINANCE_NAV_ITEMS = [
  { slug: 'dashboard', label: 'Dashboard' },
  { slug: 'assets', label: 'Assets' },
  { slug: 'liabilities', label: 'Liabilities' },
  { slug: 'investments', label: 'Investments' },
  { slug: 'transactions', label: 'Transactions' },
  { slug: 'budgets-categories', label: 'Budgets & Categories' },
  { slug: 'settings', label: 'Settings' },
] as const;

export function getFinanceTrackerBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_FINANCE_TRACKER_URL?.trim();
  return (raw || 'http://localhost:5000').replace(/\/$/, '');
}

export function financeTrackerPath(segments: string[]): string {
  const base = getFinanceTrackerBaseUrl();
  if (segments.length === 0) return base;
  return `${base}/${segments.join('/')}`;
}

export function financeAppPath(segments: string[]): string {
  if (segments.length === 0) return '/finance';
  return `/finance/${segments.join('/')}`;
}

export function appIdToAppUrl(appId: string, extra?: Record<string, string>): string {
  const standalone = APP_STANDALONE_ROUTES[appId];
  if (standalone) {
    if (extra?.section) return `/finance/${extra.section}`;
    return standalone;
  }
  return `/console?view=${encodeURIComponent(
    appId.startsWith('bellasos.') ? `module:${appId}` : 'overview',
  )}`;
}
