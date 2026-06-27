import { z } from 'zod';
export declare const ACCOUNTS: readonly ["Trust", "Personal", "TFSA", "Crypto", "Property"];
export declare const syncHoldingSchema: z.ZodObject<{
    account: z.ZodEnum<["Trust", "Personal", "TFSA", "Crypto", "Property"]>;
    symbol: z.ZodString;
    quantity: z.ZodNumber;
    costBasis: z.ZodNumber;
    price: z.ZodOptional<z.ZodNumber>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    quantity: number;
    account: "TFSA" | "Trust" | "Personal" | "Crypto" | "Property";
    costBasis: number;
    price?: number | undefined;
    updatedAt?: string | undefined;
}, {
    symbol: string;
    quantity: number;
    account: "TFSA" | "Trust" | "Personal" | "Crypto" | "Property";
    costBasis: number;
    price?: number | undefined;
    updatedAt?: string | undefined;
}>;
export declare const portfolioSyncPayloadSchema: z.ZodObject<{
    holdings: z.ZodArray<z.ZodObject<{
        account: z.ZodEnum<["Trust", "Personal", "TFSA", "Crypto", "Property"]>;
        symbol: z.ZodString;
        quantity: z.ZodNumber;
        costBasis: z.ZodNumber;
        price: z.ZodOptional<z.ZodNumber>;
        updatedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        quantity: number;
        account: "TFSA" | "Trust" | "Personal" | "Crypto" | "Property";
        costBasis: number;
        price?: number | undefined;
        updatedAt?: string | undefined;
    }, {
        symbol: string;
        quantity: number;
        account: "TFSA" | "Trust" | "Personal" | "Crypto" | "Property";
        costBasis: number;
        price?: number | undefined;
        updatedAt?: string | undefined;
    }>, "many">;
    watchlist: z.ZodOptional<z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        note: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        note?: string | undefined;
    }, {
        symbol: string;
        note?: string | undefined;
    }>, "many">>;
    syncedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    holdings: {
        symbol: string;
        quantity: number;
        account: "TFSA" | "Trust" | "Personal" | "Crypto" | "Property";
        costBasis: number;
        price?: number | undefined;
        updatedAt?: string | undefined;
    }[];
    syncedAt: string;
    watchlist?: {
        symbol: string;
        note?: string | undefined;
    }[] | undefined;
}, {
    holdings: {
        symbol: string;
        quantity: number;
        account: "TFSA" | "Trust" | "Personal" | "Crypto" | "Property";
        costBasis: number;
        price?: number | undefined;
        updatedAt?: string | undefined;
    }[];
    syncedAt: string;
    watchlist?: {
        symbol: string;
        note?: string | undefined;
    }[] | undefined;
}>;
export type SyncHolding = z.infer<typeof syncHoldingSchema>;
export type PortfolioSyncPayload = z.infer<typeof portfolioSyncPayloadSchema>;
export interface StoredHolding extends SyncHolding {
    id: string;
    updatedAt: string;
}
export interface SyncMeta {
    lastPullAt?: string;
    lastPushAt?: string;
    lastWebhookAt?: string;
    lastError?: string;
    connectedApp?: string;
}
export declare function holdingId(account: string, symbol: string): string;
export declare function toStoredHolding(input: SyncHolding): StoredHolding;
/** Merge remote holdings into local using newest updatedAt per position. */
export declare function mergeHoldings(local: StoredHolding[], remote: SyncHolding[]): StoredHolding[];
export declare function buildSyncPayload(holdings: StoredHolding[], watchlist: Array<{
    symbol: string;
    note?: string;
}>): PortfolioSyncPayload;
export declare function fetchExternalSync(syncUrl: string, apiKey: string): Promise<PortfolioSyncPayload>;
export declare function pushExternalSync(syncUrl: string, apiKey: string, payload: PortfolioSyncPayload): Promise<void>;
//# sourceMappingURL=sync.d.ts.map