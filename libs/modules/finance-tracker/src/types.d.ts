import { z } from 'zod';
export declare const limitInput: z.ZodObject<{
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
}, {
    limit?: number | undefined;
}>;
export declare const expenseAddInput: z.ZodObject<{
    amount: z.ZodNumber;
    category: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
    merchant: z.ZodOptional<z.ZodString>;
    payment_method: z.ZodOptional<z.ZodString>;
    is_recurring: z.ZodOptional<z.ZodBoolean>;
    recurring_frequency: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    category: string;
    amount: number;
    description?: string | undefined;
    date?: string | undefined;
    merchant?: string | undefined;
    payment_method?: string | undefined;
    is_recurring?: boolean | undefined;
    recurring_frequency?: string | undefined;
}, {
    category: string;
    amount: number;
    description?: string | undefined;
    date?: string | undefined;
    merchant?: string | undefined;
    payment_method?: string | undefined;
    is_recurring?: boolean | undefined;
    recurring_frequency?: string | undefined;
}>;
export declare const incomeAddInput: z.ZodObject<{
    amount: z.ZodNumber;
    type: z.ZodDefault<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
    is_gross: z.ZodOptional<z.ZodBoolean>;
    paye_amount: z.ZodOptional<z.ZodNumber>;
    net_amount: z.ZodOptional<z.ZodNumber>;
    merchant: z.ZodOptional<z.ZodString>;
    payment_method: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    amount: number;
    description?: string | undefined;
    date?: string | undefined;
    merchant?: string | undefined;
    payment_method?: string | undefined;
    is_gross?: boolean | undefined;
    paye_amount?: number | undefined;
    net_amount?: number | undefined;
}, {
    amount: number;
    description?: string | undefined;
    type?: string | undefined;
    date?: string | undefined;
    merchant?: string | undefined;
    payment_method?: string | undefined;
    is_gross?: boolean | undefined;
    paye_amount?: number | undefined;
    net_amount?: number | undefined;
}>;
export declare const transferAddInput: z.ZodObject<{
    amount: z.ZodNumber;
    transfer_fee: z.ZodOptional<z.ZodNumber>;
    source_account: z.ZodOptional<z.ZodString>;
    destination_account: z.ZodOptional<z.ZodString>;
    purpose: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    description?: string | undefined;
    date?: string | undefined;
    transfer_fee?: number | undefined;
    source_account?: string | undefined;
    destination_account?: string | undefined;
    purpose?: string | undefined;
}, {
    amount: number;
    description?: string | undefined;
    date?: string | undefined;
    transfer_fee?: number | undefined;
    source_account?: string | undefined;
    destination_account?: string | undefined;
    purpose?: string | undefined;
}>;
export declare const investmentAddInput: z.ZodEffects<z.ZodObject<{
    symbol: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    investmentType: z.ZodDefault<z.ZodString>;
    accountType: z.ZodDefault<z.ZodString>;
    quantity: z.ZodOptional<z.ZodNumber>;
    purchasePrice: z.ZodOptional<z.ZodNumber>;
    amountZar: z.ZodOptional<z.ZodNumber>;
    purchaseDate: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    commission: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    investmentType: string;
    accountType: string;
    description?: string | undefined;
    name?: string | undefined;
    amountZar?: number | undefined;
    purchaseDate?: string | undefined;
    commission?: number | undefined;
    quantity?: number | undefined;
    purchasePrice?: number | undefined;
}, {
    symbol: string;
    description?: string | undefined;
    name?: string | undefined;
    amountZar?: number | undefined;
    investmentType?: string | undefined;
    accountType?: string | undefined;
    purchaseDate?: string | undefined;
    commission?: number | undefined;
    quantity?: number | undefined;
    purchasePrice?: number | undefined;
}>, {
    symbol: string;
    investmentType: string;
    accountType: string;
    description?: string | undefined;
    name?: string | undefined;
    amountZar?: number | undefined;
    purchaseDate?: string | undefined;
    commission?: number | undefined;
    quantity?: number | undefined;
    purchasePrice?: number | undefined;
}, {
    symbol: string;
    description?: string | undefined;
    name?: string | undefined;
    amountZar?: number | undefined;
    investmentType?: string | undefined;
    accountType?: string | undefined;
    purchaseDate?: string | undefined;
    commission?: number | undefined;
    quantity?: number | undefined;
    purchasePrice?: number | undefined;
}>;
export declare const exchangeRateInput: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
}, {
    date?: string | undefined;
}>;
export declare const quoteInput: z.ZodObject<{
    symbol: z.ZodString;
    date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    date?: string | undefined;
}, {
    symbol: string;
    date?: string | undefined;
}>;
export declare const symbolSearchInput: z.ZodObject<{
    query: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
}, {
    query: string;
}>;
//# sourceMappingURL=types.d.ts.map