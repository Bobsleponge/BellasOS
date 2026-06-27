import { describe, expect, it } from 'vitest';
import {
  extractFinanceText,
  formatFinanceSummary,
  resolveFinanceReplyDetail,
  withFinanceAttribution,
} from './finance-reply';

const summary = {
  currency: 'ZAR',
  netWorth: -27143,
  totalAssets: 0,
  totalLiabilities: 27450,
  investmentValue: 307,
  totalIncome: 42000,
  totalExpenses: 4350,
  netCashflow: 37651,
};

describe('extractFinanceText advice field', () => {
  it('prefers advice over liability formatting', () => {
    const text = extractFinanceText({
      advice: 'A 10-20% deposit is typical for R1.6m.',
      liabilities: [{ current_balance: 27450, name: 'Card' }],
    });
    expect(text).toContain('10-20%');
    expect(text).not.toContain('across');
  });
});

describe('resolveFinanceReplyDetail', () => {
  it('narrows net worth questions', () => {
    expect(resolveFinanceReplyDetail('tell me my net worth')).toBe('net_worth');
    expect(resolveFinanceReplyDetail('What is my net worth?')).toBe('net_worth');
  });

  it('narrows debt questions', () => {
    expect(resolveFinanceReplyDetail('How much debt do I have')).toBe('debt');
    expect(resolveFinanceReplyDetail('what do I owe')).toBe('debt');
  });

  it('expands financial status questions', () => {
    expect(resolveFinanceReplyDetail('what is my financial status')).toBe('full');
    expect(resolveFinanceReplyDetail('give me a financial overview')).toBe('full');
  });
});

describe('formatFinanceSummary', () => {
  it('returns net worth only for narrow detail', () => {
    const text = formatFinanceSummary(summary, 'net_worth');
    expect(text).toContain('net worth');
    expect(text).not.toContain('Assets');
    expect(text).not.toContain('Income');
  });

  it('returns full breakdown for status questions', () => {
    const text = formatFinanceSummary(summary, 'full');
    expect(text).toContain('Assets');
    expect(text).toContain('Income');
    expect(text).toContain('net cashflow');
  });
});

describe('withFinanceAttribution', () => {
  it('skips attribution for net worth only', () => {
    const reply = withFinanceAttribution('Your net worth is -R27,143.', { output: summary }, 'net_worth');
    expect(reply).not.toContain('From Finance Tracker');
  });

  it('adds attribution for full status', () => {
    const reply = withFinanceAttribution('Your net worth is -R27,143.', { output: summary }, 'full');
    expect(reply.startsWith('From Finance Tracker')).toBe(true);
  });
});
