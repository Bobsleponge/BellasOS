import { describe, expect, it } from 'vitest';
import { extractSecurityQuery, parsePurchaseDate } from './finance-investment';

describe('finance-investment helpers', () => {
  it('extracts company name from share purchase phrasing', () => {
    expect(extractSecurityQuery('15000 rand of SpaceX shares at opening yesterday')).toBe('SpaceX');
    expect(extractSecurityQuery('buy NVDA shares')).toBe('NVDA');
  });

  it('parses yesterday as ISO date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(parsePurchaseDate('at opening yesterday')).toBe(yesterday.toISOString().split('T')[0]);
  });
});
