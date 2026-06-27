"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPortfolioAccount = toPortfolioAccount;
exports.investmentToHolding = investmentToHolding;
/** Map Finance-Tracker account_type to BellasOS portfolio account buckets. */
const PORTFOLIO_ACCOUNTS = ['Trust', 'Personal', 'TFSA', 'Crypto', 'Property'];
function toPortfolioAccount(accountType, investmentType) {
    const t = investmentType?.toLowerCase();
    if (t === 'crypto')
        return 'Crypto';
    const a = accountType.toUpperCase();
    if (a === 'TFSA')
        return 'TFSA';
    if (a === 'RA' || a === 'PENSION')
        return 'Trust';
    if (a === 'TAXABLE')
        return 'Personal';
    return 'Personal';
}
function investmentToHolding(inv) {
    return {
        account: toPortfolioAccount(inv.accountType, inv.investmentType),
        symbol: inv.symbol.toUpperCase(),
        quantity: inv.quantity,
        costBasis: inv.purchasePrice,
        price: inv.currentPrice,
        updatedAt: inv.updatedAt,
    };
}
//# sourceMappingURL=account-map.js.map