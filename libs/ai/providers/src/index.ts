import type { ProviderAdapter, ProviderType } from '@bellasos/contracts';
import { MockProvider } from './mock';
import {
  createOpenAIProvider,
  createDeepSeekProvider,
  OpenAICompatibleProvider,
} from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { OllamaProvider } from './ollama';

export * from './util';
export * from './mock';
export * from './openai';
export * from './anthropic';
export * from './google';
export * from './credentials';
export * from './ollama';

/** Build the full set of provider adapters keyed by provider type. */
export function createProviders(): Map<ProviderType, ProviderAdapter> {
  const providers: ProviderAdapter[] = [
    createOpenAIProvider(),
    new AnthropicProvider(),
    new GoogleProvider(),
    createDeepSeekProvider(),
    new OllamaProvider(),
    new MockProvider(),
  ];
  const map = new Map<ProviderType, ProviderAdapter>();
  for (const p of providers) map.set(p.type, p);
  return map;
}

export { OpenAICompatibleProvider };
