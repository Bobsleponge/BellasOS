import { describe, expect, it } from 'vitest';
import {
  buildJarvisApplicationCatalog,
  formatApplicationContextForPrompt,
  resolveJarvisOpenAppIds,
  resolveRegistryApplicationId,
} from './jarvis-catalog';

describe('jarvis-catalog', () => {
  it('includes Finance Tracker capabilities via wealth composite, not duplicate finance-tracker entry', () => {
    const catalog = buildJarvisApplicationCatalog();
    expect(catalog).toContain('wealth');
    expect(catalog).toContain('What is my net worth?');
    expect(catalog).toContain('bellasos.finance-tracker.summary.get');
    expect(catalog).not.toMatch(/^- finance-tracker/m);
  });

  it('formatApplicationContextForPrompt includes jarvisGuide for wealth', () => {
    const ctx = formatApplicationContextForPrompt('wealth');
    expect(ctx).toContain('Finance Tracker');
    expect(ctx).toContain('Portfolio');
    expect(ctx).toContain('TFSA');
  });

  it('resolveRegistryApplicationId maps legacy module ids to wealth', () => {
    expect(resolveRegistryApplicationId('bellasos.finance-tracker')).toBe('wealth');
    expect(resolveRegistryApplicationId('bellasos.portfolio')).toBe('wealth');
    expect(resolveRegistryApplicationId('wealth')).toBe('wealth');
  });

  it('resolveJarvisOpenAppIds includes wealth', () => {
    const ids = resolveJarvisOpenAppIds();
    expect(ids).toContain('wealth');
    expect(ids).toContain('bellasos.finance-tracker');
    expect(ids).toContain('system.console');
  });

  it('scopes catalog to requested modules', () => {
    const catalog = buildJarvisApplicationCatalog({
      moduleIds: ['bellasos.research'],
    });
    expect(catalog).toContain('research');
    expect(catalog).not.toContain('wealth');
  });
});
