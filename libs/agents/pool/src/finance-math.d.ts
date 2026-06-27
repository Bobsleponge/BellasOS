/** Deterministic finance math using live Finance-Tracker rates — LLMs must not arithmetic here. */
export interface FinanceMathFacts {
    amountZar: number | null;
    amountUsd: number | null;
    symbol: string | null;
    date: string | null;
    wantsExchangeRate: boolean;
    wantsZarToUsd: boolean;
    wantsUsdToZar: boolean;
    wantsShareEstimate: boolean;
}
export declare function looksLikeFinanceMath(prompt: string): boolean;
export declare function extractFinanceMathFacts(prompt: string): FinanceMathFacts;
export interface FinanceMathResult {
    message: string;
    computed: Record<string, unknown>;
}
export declare function buildFinanceMathMessage(input: {
    facts: FinanceMathFacts;
    rate: number;
    rateSource?: string;
    quote?: {
        price?: number;
        open?: number;
        currency?: string;
        name?: string;
        symbol?: string;
    };
}): FinanceMathResult;
export declare function plainFinanceMathMessage(message: string): string;
export declare function isLiveMarketDataQuestion(text: string): boolean;
export declare function looksLikeInvestmentWrite(prompt: string): boolean;
//# sourceMappingURL=finance-math.d.ts.map