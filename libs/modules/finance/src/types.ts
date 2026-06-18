import { z } from 'zod';

export const INVESTMENT_TYPES = [
  'stock',
  'etf',
  'bond',
  'crypto',
  'mutual_fund',
  'other',
] as const;

export const ACCOUNT_TYPES = ['TFSA', 'RA', 'taxable', 'pension', 'other'] as const;

export const investmentInput = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  investmentType: z.enum(INVESTMENT_TYPES).default('stock'),
  accountType: z.enum(ACCOUNT_TYPES),
  quantity: z.number().positive(),
  purchasePrice: z.number().nonnegative(),
  currentPrice: z.number().nonnegative().optional(),
  purchaseDate: z.string().min(1),
  description: z.string().optional(),
  commission: z.number().nonnegative().optional(),
});

export const investmentUpdateInput = investmentInput.partial().extend({
  id: z.string().min(1),
});

export const investmentIdInput = z.object({ id: z.string().min(1) });

export const trackerRowInput = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  investment_type: z.string().min(1),
  account_type: z.string().min(1),
  quantity: z.union([z.number(), z.string()]),
  purchase_price: z.union([z.number(), z.string()]),
  current_price: z.union([z.number(), z.string()]).optional(),
  purchase_date: z.string().min(1),
  description: z.string().optional(),
  commission: z.union([z.number(), z.string()]).optional(),
});

export const importInput = z.object({
  investments: z.array(trackerRowInput),
  replace: z.boolean().optional(),
});

export interface Investment extends z.infer<typeof investmentInput> {
  id: string;
  currentPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
  diversification: {
    byType: Record<string, number>;
    byAccount: Record<string, number>;
  };
  recommendations: string[];
  holdings: number;
  baseCurrency: string;
}
