import { z } from 'zod';
export declare const INVESTMENT_TYPES: readonly ["stock", "etf", "bond", "crypto", "mutual_fund", "other"];
export declare const ACCOUNT_TYPES: readonly ["TFSA", "RA", "taxable", "pension", "other"];
export declare const investmentInput: z.ZodObject<{
    symbol: z.ZodString;
    name: z.ZodString;
    investmentType: z.ZodDefault<z.ZodEnum<["stock", "etf", "bond", "crypto", "mutual_fund", "other"]>>;
    accountType: z.ZodEnum<["TFSA", "RA", "taxable", "pension", "other"]>;
    quantity: z.ZodNumber;
    purchasePrice: z.ZodNumber;
    currentPrice: z.ZodOptional<z.ZodNumber>;
    purchaseDate: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    commission: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    name: string;
    investmentType: "stock" | "crypto" | "etf" | "bond" | "mutual_fund" | "other";
    accountType: "TFSA" | "RA" | "other" | "taxable" | "pension";
    purchaseDate: string;
    quantity: number;
    purchasePrice: number;
    description?: string | undefined;
    commission?: number | undefined;
    currentPrice?: number | undefined;
}, {
    symbol: string;
    name: string;
    accountType: "TFSA" | "RA" | "other" | "taxable" | "pension";
    purchaseDate: string;
    quantity: number;
    purchasePrice: number;
    description?: string | undefined;
    investmentType?: "stock" | "crypto" | "etf" | "bond" | "mutual_fund" | "other" | undefined;
    commission?: number | undefined;
    currentPrice?: number | undefined;
}>;
export declare const investmentUpdateInput: z.ZodObject<{
    symbol: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    investmentType: z.ZodOptional<z.ZodDefault<z.ZodEnum<["stock", "etf", "bond", "crypto", "mutual_fund", "other"]>>>;
    accountType: z.ZodOptional<z.ZodEnum<["TFSA", "RA", "taxable", "pension", "other"]>>;
    quantity: z.ZodOptional<z.ZodNumber>;
    purchasePrice: z.ZodOptional<z.ZodNumber>;
    currentPrice: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    purchaseDate: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    commission: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
} & {
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    symbol?: string | undefined;
    description?: string | undefined;
    name?: string | undefined;
    investmentType?: "stock" | "crypto" | "etf" | "bond" | "mutual_fund" | "other" | undefined;
    accountType?: "TFSA" | "RA" | "other" | "taxable" | "pension" | undefined;
    purchaseDate?: string | undefined;
    commission?: number | undefined;
    quantity?: number | undefined;
    purchasePrice?: number | undefined;
    currentPrice?: number | undefined;
}, {
    id: string;
    symbol?: string | undefined;
    description?: string | undefined;
    name?: string | undefined;
    investmentType?: "stock" | "crypto" | "etf" | "bond" | "mutual_fund" | "other" | undefined;
    accountType?: "TFSA" | "RA" | "other" | "taxable" | "pension" | undefined;
    purchaseDate?: string | undefined;
    commission?: number | undefined;
    quantity?: number | undefined;
    purchasePrice?: number | undefined;
    currentPrice?: number | undefined;
}>;
export declare const investmentIdInput: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const trackerRowInput: z.ZodObject<{
    symbol: z.ZodString;
    name: z.ZodString;
    investment_type: z.ZodString;
    account_type: z.ZodString;
    quantity: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
    purchase_price: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
    current_price: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    purchase_date: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    commission: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    name: string;
    quantity: string | number;
    purchase_price: string | number;
    investment_type: string;
    account_type: string;
    purchase_date: string;
    description?: string | undefined;
    commission?: string | number | undefined;
    current_price?: string | number | undefined;
}, {
    symbol: string;
    name: string;
    quantity: string | number;
    purchase_price: string | number;
    investment_type: string;
    account_type: string;
    purchase_date: string;
    description?: string | undefined;
    commission?: string | number | undefined;
    current_price?: string | number | undefined;
}>;
export declare const importInput: z.ZodObject<{
    investments: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        name: z.ZodString;
        investment_type: z.ZodString;
        account_type: z.ZodString;
        quantity: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
        purchase_price: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
        current_price: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
        purchase_date: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        commission: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        name: string;
        quantity: string | number;
        purchase_price: string | number;
        investment_type: string;
        account_type: string;
        purchase_date: string;
        description?: string | undefined;
        commission?: string | number | undefined;
        current_price?: string | number | undefined;
    }, {
        symbol: string;
        name: string;
        quantity: string | number;
        purchase_price: string | number;
        investment_type: string;
        account_type: string;
        purchase_date: string;
        description?: string | undefined;
        commission?: string | number | undefined;
        current_price?: string | number | undefined;
    }>, "many">;
    replace: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    investments: {
        symbol: string;
        name: string;
        quantity: string | number;
        purchase_price: string | number;
        investment_type: string;
        account_type: string;
        purchase_date: string;
        description?: string | undefined;
        commission?: string | number | undefined;
        current_price?: string | number | undefined;
    }[];
    replace?: boolean | undefined;
}, {
    investments: {
        symbol: string;
        name: string;
        quantity: string | number;
        purchase_price: string | number;
        investment_type: string;
        account_type: string;
        purchase_date: string;
        description?: string | undefined;
        commission?: string | number | undefined;
        current_price?: string | number | undefined;
    }[];
    replace?: boolean | undefined;
}>;
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
//# sourceMappingURL=types.d.ts.map