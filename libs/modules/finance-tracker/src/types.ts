import { z } from 'zod';

export const limitInput = z.object({
  limit: z.number().int().positive().max(100).optional(),
});

export const expenseAddInput = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().optional(),
  merchant: z.string().optional(),
  payment_method: z.string().optional(),
  is_recurring: z.boolean().optional(),
  recurring_frequency: z.string().optional(),
});

export const incomeAddInput = z.object({
  amount: z.number().positive(),
  type: z.string().min(1).default('salary'),
  description: z.string().optional(),
  date: z.string().optional(),
  is_gross: z.boolean().optional(),
  paye_amount: z.number().nonnegative().optional(),
  net_amount: z.number().positive().optional(),
  merchant: z.string().optional(),
  payment_method: z.string().optional(),
});

export const transferAddInput = z.object({
  amount: z.number().positive(),
  transfer_fee: z.number().nonnegative().optional(),
  source_account: z.string().optional(),
  destination_account: z.string().optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const investmentAddInput = z
  .object({
    symbol: z.string().min(1),
    name: z.string().optional(),
    investmentType: z.string().default('stock'),
    accountType: z.string().default('TFSA'),
    quantity: z.number().positive().optional(),
    purchasePrice: z.number().positive().optional(),
    amountZar: z.number().positive().optional(),
    purchaseDate: z.string().optional(),
    description: z.string().optional(),
    commission: z.number().nonnegative().optional(),
  })
  .refine((d) => d.quantity != null || d.amountZar != null, {
    message: 'Either quantity or amountZar is required',
  });

export const exchangeRateInput = z.object({
  date: z.string().optional(),
});

export const quoteInput = z.object({
  symbol: z.string().min(1),
  date: z.string().optional(),
});

export const symbolSearchInput = z.object({
  query: z.string().min(2),
});
