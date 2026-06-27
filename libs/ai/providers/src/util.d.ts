import type { ModelDescriptor, TokenUsage } from '@bellasos/contracts';
/** Estimate USD cost from token usage and a model cost profile. */
export declare function computeCost(model: ModelDescriptor, usage: TokenUsage): number;
/** Rough token estimate (~4 chars/token) for providers that omit usage. */
export declare function estimateTokens(text: string): number;
export declare function emptyUsage(): TokenUsage;
//# sourceMappingURL=util.d.ts.map