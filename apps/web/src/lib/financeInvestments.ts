export interface FinanceInvestment {
  id: string;
  symbol: string;
  name: string;
  investmentType: string;
  accountType: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  description?: string;
}

function mapInvestmentRow(value: unknown): FinanceInvestment | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const symbol = String(o.symbol ?? '').trim();
  if (!symbol) return null;

  const accountType = String(o.accountType ?? o.account_type ?? 'taxable');
  const id = String(o.id ?? `${accountType}:${symbol.toUpperCase()}`);

  return {
    id,
    symbol: symbol.toUpperCase(),
    name: String(o.name ?? symbol),
    investmentType: String(o.investmentType ?? o.investment_type ?? 'stock'),
    accountType,
    quantity: Number(o.quantity ?? 0),
    purchasePrice: Number(o.purchasePrice ?? o.purchase_price ?? 0),
    currentPrice: Number(
      o.currentPrice ?? o.current_price ?? o.purchasePrice ?? o.purchase_price ?? 0,
    ),
    purchaseDate: String(
      o.purchaseDate ?? o.purchase_date ?? new Date().toISOString().slice(0, 10),
    ),
    description: o.description != null ? String(o.description) : undefined,
  };
}

/** Coerce API/import payloads into a stable investment array. */
export function normalizeInvestmentsList(data: unknown): FinanceInvestment[] {
  if (Array.isArray(data)) {
    return data.map(mapInvestmentRow).filter((x): x is FinanceInvestment => x != null);
  }
  if (!data || typeof data !== 'object') return [];

  const o = data as Record<string, unknown>;
  if (Array.isArray(o.investments)) return normalizeInvestmentsList(o.investments);
  if (o.data && typeof o.data === 'object') {
    const nested = (o.data as Record<string, unknown>).investments;
    if (Array.isArray(nested)) return normalizeInvestmentsList(nested);
  }

  const single = mapInvestmentRow(data);
  return single ? [single] : [];
}

/** Extract investment rows from Finance-Tracker JSON (array or full export). */
export function parseFinanceTrackerImportJson(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Expected JSON array of investments or Finance-Tracker export');
  }
  const o = parsed as Record<string, unknown>;
  if (Array.isArray(o.investments)) return o.investments;
  if (o.data && typeof o.data === 'object') {
    const investments = (o.data as Record<string, unknown>).investments;
    if (Array.isArray(investments)) return investments;
  }
  throw new Error('No investments array found in JSON (expected data.investments for exports)');
}
