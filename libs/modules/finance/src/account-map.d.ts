/** Map Finance-Tracker account_type to BellasOS portfolio account buckets. */
declare const PORTFOLIO_ACCOUNTS: readonly ["Trust", "Personal", "TFSA", "Crypto", "Property"];
export type PortfolioAccount = (typeof PORTFOLIO_ACCOUNTS)[number];
export declare function toPortfolioAccount(accountType: string, investmentType?: string): PortfolioAccount;
export declare function investmentToHolding(inv: {
    accountType: string;
    investmentType: string;
    symbol: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    updatedAt: string;
}): {
    account: "TFSA" | "Trust" | "Personal" | "Crypto" | "Property";
    symbol: string;
    quantity: number;
    costBasis: number;
    price: number;
    updatedAt: string;
};
export {};
//# sourceMappingURL=account-map.d.ts.map