import { describe, expect, it } from 'vitest';
import { DEFAULT_MODELS } from '@bellasos/ai-model-registry';
import {
  classifyJarvisQuery,
  planJarvisCompletion,
  selectModelForTier,
} from './jarvis-hub';

describe('Jarvis hub', () => {
  it('classifies short factual questions as fast', () => {
    expect(
      classifyJarvisQuery('How long is the flight from South Africa to New Zealand?'),
    ).toBe('fast');
  });

  it('classifies research prompts as deep', () => {
    expect(classifyJarvisQuery('Research the impact of AI on mining stocks')).toBe('deep');
  });

  it('classifies explanatory questions as standard', () => {
    expect(classifyJarvisQuery('Explain how solar panels work')).toBe('standard');
  });

  it('picks the smallest local model for fast tier', () => {
    const model = selectModelForTier('fast', DEFAULT_MODELS, () => false);
    expect(model).toBeDefined();
  });

  it('builds a completion plan with tier defaults', () => {
    const plan = planJarvisCompletion('hello there', DEFAULT_MODELS);
    expect(plan.tier).toBe('fast');
    expect(plan.maxTokens).toBe(120);
    expect(plan.model).toBeDefined();
  });
});
