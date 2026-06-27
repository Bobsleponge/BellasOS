"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePortfolio = analyzePortfolio;
function pct(part, total) {
    return total ? Number(((part / total) * 100).toFixed(1)) : 0;
}
function analyzePortfolio(investments, baseCurrency) {
    if (!investments.length) {
        return {
            totalValue: 0,
            totalInvested: 0,
            totalGain: 0,
            totalGainPercent: 0,
            diversification: { byType: {}, byAccount: {} },
            recommendations: ['Add your first investment to begin tracking.'],
            holdings: 0,
            baseCurrency,
        };
    }
    let totalValue = 0;
    let totalInvested = 0;
    const byType = {};
    const byAccount = {};
    for (const inv of investments) {
        const value = inv.quantity * inv.currentPrice;
        const invested = inv.quantity * inv.purchasePrice;
        totalValue += value;
        totalInvested += invested;
        byType[inv.investmentType] = (byType[inv.investmentType] ?? 0) + value;
        byAccount[inv.accountType] = (byAccount[inv.accountType] ?? 0) + value;
    }
    const totalGain = totalValue - totalInvested;
    const totalGainPercent = totalInvested ? (totalGain / totalInvested) * 100 : 0;
    const diversification = {
        byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, pct(v, totalValue)])),
        byAccount: Object.fromEntries(Object.entries(byAccount).map(([k, v]) => [k, pct(v, totalValue)])),
    };
    const recommendations = [];
    const tfsaPct = diversification.byAccount.TFSA ?? 0;
    if (tfsaPct < 10 && byAccount.TFSA !== undefined) {
        recommendations.push('Consider maximizing TFSA contributions for tax-free growth.');
    }
    const topType = Object.entries(diversification.byType).sort((a, b) => b[1] - a[1])[0];
    if (topType && topType[1] > 70) {
        recommendations.push(`Portfolio is concentrated in ${topType[0]} (${topType[1]}%).`);
    }
    if (!recommendations.length) {
        recommendations.push('Review allocations quarterly and rebalance if needed.');
    }
    return {
        totalValue: Number(totalValue.toFixed(2)),
        totalInvested: Number(totalInvested.toFixed(2)),
        totalGain: Number(totalGain.toFixed(2)),
        totalGainPercent: Number(totalGainPercent.toFixed(2)),
        diversification,
        recommendations,
        holdings: investments.length,
        baseCurrency,
    };
}
//# sourceMappingURL=analysis.js.map