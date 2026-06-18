import { describe, expect, it } from 'vitest';
import {
  buildFinanceMathMessage,
  extractFinanceMathFacts,
  looksLikeFinanceMath,
  plainFinanceMathMessage,
} from './finance-math';

describe('looksLikeFinanceMath', () => {
  it('detects Rand to USD conversion questions', () => {
    expect(looksLikeFinanceMath('How much is R17,000 in dollars at today rate?')).toBe(true);
    expect(looksLikeFinanceMath('What is my net worth?')).toBe(false);
  });
});

describe('extractFinanceMathFacts', () => {
  it('parses Rand amounts and NVDA symbol', () => {
    const facts = extractFinanceMathFacts('Convert R17,000 rand to USD for Nvidia shares');
    expect(facts.amountZar).toBe(17000);
    expect(facts.symbol).toBe('Nvidia');
    expect(facts.wantsZarToUsd).toBe(true);
    expect(facts.wantsShareEstimate).toBe(true);
  });
});

describe('buildFinanceMathMessage', () => {
  it('computes ZAR to USD with live rate', () => {
    const facts = extractFinanceMathFacts('R17,000 in dollars');
    const result = buildFinanceMathMessage({ facts, rate: 16.43, rateSource: 'test' });
    expect(result.computed.amountUsd).toBeCloseTo(1034.69, 1);
    expect(result.message).toContain('16.4300');
    expect(plainFinanceMathMessage(result.message)).not.toContain('**');
  });

  it('estimates shares from Rand amount and quote', () => {
    const facts = extractFinanceMathFacts('R17,000 of NVDA');
    const result = buildFinanceMathMessage({
      facts,
      rate: 16.43,
      quote: { symbol: 'NVDA', name: 'NVIDIA', price: 135.5, currency: 'USD' },
    });
    expect(result.computed.estimatedShares).toBeDefined();
    expect(Number(result.computed.estimatedShares)).toBeGreaterThan(0);
  });
});