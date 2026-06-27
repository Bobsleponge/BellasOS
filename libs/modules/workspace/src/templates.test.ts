import { describe, expect, it } from 'vitest';
import { templateFromMessage, templateForType } from './templates';

describe('templateFromMessage', () => {
  it('matches Harvi growth phrases', () => {
    const template = templateFromMessage('Help me grow Harvi');
    expect(template?.title).toBe('Grow Harvi');
    expect(template?.type).toBe('business');
    expect(template?.openApp).toBe('harvi-and-co');
  });

  it('matches TruAfrica strategy phrases', () => {
    const template = templateFromMessage('Design pricing strategy for TruAfrica');
    expect(template?.title).toBe('TruAfrica Strategy');
    expect(template?.type).toBe('strategy');
  });

  it('matches property acquisition phrases', () => {
    const template = templateFromMessage('Evaluate another property acquisition');
    expect(template?.title).toBe('Property Acquisition');
    expect(template?.type).toBe('investment');
  });

  it('returns null for unrelated messages', () => {
    expect(templateFromMessage('What is the weather?')).toBeNull();
  });
});

describe('templateForType', () => {
  it('returns business template for business type', () => {
    expect(templateForType('business').title).toBe('Grow Harvi');
  });

  it('returns custom template for custom type', () => {
    expect(templateForType('custom').type).toBe('custom');
  });
});
