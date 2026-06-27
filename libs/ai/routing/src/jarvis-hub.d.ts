import type { AITaskType, ModelDescriptor, ProviderType } from '@bellasos/contracts';
/** How much reasoning capacity a Jarvis turn needs. */
export type JarvisQueryTier = 'fast' | 'standard' | 'deep';
export interface JarvisRoutePlan {
    tier: JarvisQueryTier;
    taskType: AITaskType;
    maxTokens: number;
    temperature: number;
    model?: string;
}
export interface JarvisRouteOptions {
    pinModel?: string;
    forceTier?: JarvisQueryTier;
    isProviderConfigured?: (provider: ProviderType) => boolean;
}
/** Classify a user message into a Jarvis tier without an extra LLM call. */
export declare function classifyJarvisQuery(message: string): JarvisQueryTier;
/** Pick the best enabled model for a tier from the registry. */
export declare function selectModelForTier(tier: JarvisQueryTier, models: ModelDescriptor[], isProviderConfigured?: (provider: ProviderType) => boolean): string | undefined;
/**
 * Central Jarvis routing hub: classify the question, pick model + generation
 * settings, and return a plan for the AI gateway.
 */
export declare function planJarvisCompletion(message: string, models: ModelDescriptor[], options?: JarvisRouteOptions): JarvisRoutePlan;
//# sourceMappingURL=jarvis-hub.d.ts.map