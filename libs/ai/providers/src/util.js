"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCost = computeCost;
exports.estimateTokens = estimateTokens;
exports.emptyUsage = emptyUsage;
/** Estimate USD cost from token usage and a model cost profile. */
function computeCost(model, usage) {
    const input = (usage.promptTokens / 1_000_000) * model.cost.inputPerMTokensUsd;
    const output = (usage.completionTokens / 1_000_000) * model.cost.outputPerMTokensUsd;
    return Number((input + output).toFixed(6));
}
/** Rough token estimate (~4 chars/token) for providers that omit usage. */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
function emptyUsage() {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}
//# sourceMappingURL=util.js.map