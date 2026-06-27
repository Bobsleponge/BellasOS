import { describe, expect, it } from 'vitest';
import { DEFAULT_MODELS } from '@bellasos/ai-model-registry';
import { RoutingEngine } from './index';

function engine(opts: { configured?: string[]; strategy?: any } = {}) {
  const configured = new Set(opts.configured ?? []);
  return new RoutingEngine({
    models: DEFAULT_MODELS,
    defaultStrategy: opts.strategy ?? 'quality',
    isProviderConfigured: (t) => configured.has(t),
  });
}

describe('RoutingEngine', () => {
  it('falls back to a local/mock model when nothing is configured', () => {
    const model = engine().routeCompletion({ messages: [{ role: 'user', content: 'hi' }] });
    expect(model.local).toBe(true);
  });

  it('forces a local model for restricted data', () => {
    const model = engine({ configured: ['openai'] }).routeCompletion({
      messages: [{ role: 'user', content: 'secret' }],
      classification: 'restricted',
    });
    expect(model.local).toBe(true);
  });

  it('honours a pinned model id', () => {
    const model = engine({ configured: ['openai'] }).routeCompletion({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'gpt-5',
    });
    expect(model.id).toBe('gpt-5');
  });

  it('chooses the cheapest model under the cost strategy', () => {
    const model = engine({ configured: ['openai', 'anthropic', 'google', 'deepseek'], strategy: 'cost' }).routeCompletion(
      { messages: [{ role: 'user', content: 'hi' }] },
    );
    expect(model.cost.inputPerMTokensUsd).toBeLessThanOrEqual(0.27);
  });
});
