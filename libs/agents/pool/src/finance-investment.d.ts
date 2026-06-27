/** Helpers that do not hardcode tickers — symbol resolution is live via Finance-Tracker search. */
export declare function extractSecurityQuery(text: string): string | null;
export declare function isAccountMetadataQuestion(text: string): boolean;
export declare function parsePurchaseDate(text: string): string | null;
export interface LiveSymbolMatch {
    symbol: string;
    name: string;
    exchange?: string | null;
}
//# sourceMappingURL=finance-investment.d.ts.map