import type { ProviderAdapter, ProviderType } from '@bellasos/contracts';
import { OpenAICompatibleProvider } from './openai';
export * from './util';
export * from './mock';
export * from './openai';
export * from './anthropic';
export * from './google';
export * from './credentials';
export * from './ollama';
/** Build the full set of provider adapters keyed by provider type. */
export declare function createProviders(): Map<ProviderType, ProviderAdapter>;
export { OpenAICompatibleProvider };
//# sourceMappingURL=index.d.ts.map