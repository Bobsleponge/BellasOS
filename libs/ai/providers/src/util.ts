import type { ModelDescriptor, TokenUsage } from '@bellasos/contracts';

/** Estimate USD cost from token usage and a model cost profile. */
export function computeCost(
  model: ModelDescriptor,
  usage: TokenUsage,
): number {
  const input = (usage.promptTokens / 1_000_000) * model.cost.inputPerMTokensUsd;
  const output =
    (usage.completionTokens / 1_000_000) * model.cost.outputPerMTokensUsd;
  return Number((input + output).toFixed(6));
}

/** Rough token estimate (~4 chars/token) for providers that omit usage. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function emptyUsage(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}
