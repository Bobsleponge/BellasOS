/** Map Finance-Tracker account_type to BellasOS portfolio account buckets. */
const PORTFOLIO_ACCOUNTS = ['Trust', 'Personal', 'TFSA', 'Crypto', 'Property'] as const;
export type PortfolioAccount = (typeof PORTFOLIO_ACCOUNTS)[number];

export function toPortfolioAccount(
  accountType: string,
  investmentType?: string,
): PortfolioAccount {
  const t = investmentType?.toLowerCase();
  if (t === 'crypto') return 'Crypto';
  const a = accountType.toUpperCase();
  if (a === 'TFSA') return 'TFSA';
  if (a === 'RA' || a === 'PENSION') return 'Trust';
  if (a === 'TAXABLE') return 'Personal';
  return 'Personal';
}

export function investmentToHolding(inv: {
  accountType: string;
  investmentType: string;
  symbol: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  updatedAt: string;
}) {
  return {
    account: toPortfolioAccount(inv.accountType, inv.investmentType),
    symbol: inv.symbol.toUpperCase(),
    quantity: inv.quantity,
    costBasis: inv.purchasePrice,
    price: inv.currentPrice,
    updatedAt: inv.updatedAt,
  };
}
