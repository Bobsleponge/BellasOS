import { describe, expect, it } from 'vitest';
import {
  formatClarificationReply,
  normalizeIntentAnalysis,
  parseJarvisIntentJson,
  shouldAskForClarification,
} from './jarvis-intent';

describe('jarvis intent analysis', () => {
  it('parses valid intent JSON', () => {
    const raw = JSON.stringify({
      understanding: {
        goal: 'Buy R4000 of Nvidia shares',
        summary: 'Record a R4000 NVDA purchase',
        actionKind: 'write',
        domain: 'finance',
      },
      handler: { type: 'agent', agentType: 'finance', openApp: 'bellasos.portfolio' },
      confidence: 0.92,
      needsClarification: false,
      prompt: 'Buy R4000 worth of Nvidia shares',
    });
    const parsed = parseJarvisIntentJson(raw);
    expect(parsed?.handler.agentType).toBe('finance');
    expect(parsed?.understanding.actionKind).toBe('write');
  });

  it('normalizes finance misroutes away from memory', () => {
    const analysis = normalizeIntentAnalysis(
      {
        understanding: {
          goal: 'Show financial info',
          summary: 'Financial overview',
          actionKind: 'read',
          domain: 'finance',
        },
        handler: { type: 'agent', agentType: 'memory' },
        confidence: 0.8,
        needsClarification: false,
      },
      ['finance', 'memory', 'portfolio'],
      ['bellasos.finance-tracker'],
    );
    expect(analysis.handler.agentType).toBe('finance');
  });

  it('asks for clarification on low-confidence writes', () => {
    expect(
      shouldAskForClarification({
        understanding: {
          goal: 'Buy shares',
          summary: 'Buy shares',
          actionKind: 'write',
          domain: 'finance',
        },
        handler: { type: 'agent', agentType: 'finance' },
        confidence: 0.5,
        needsClarification: false,
      }),
    ).toBe(true);
  });

  it('does not clarify for live market data when smart transaction is requested', () => {
    expect(
      shouldAskForClarification(
        {
          understanding: {
            goal: 'Record Intel purchase',
            summary: 'Smart transaction for Intel',
            actionKind: 'write',
            domain: 'finance',
          },
          handler: { type: 'clarify', agentType: 'finance' },
          confidence: 0.55,
          needsClarification: true,
          clarifyingQuestions: ['What is the current Intel stock price at the open in ZAR?'],
          reply:
            "Since we don't have real-time access to current market data, please provide the Intel opening price.",
        },
        'make a smart transaction for Intel R17000 in the portfolio app',
      ),
    ).toBe(false);
  });

  it('forces finance agent for smart transaction writes', () => {
    const analysis = normalizeIntentAnalysis(
      {
        understanding: {
          goal: 'Chat',
          summary: 'Help with transaction',
          actionKind: 'chat',
          domain: 'general',
        },
        handler: { type: 'chat' },
        confidence: 0.6,
        needsClarification: false,
        reply: 'I need the stock price from you.',
      },
      ['finance', 'memory'],
      ['bellasos.finance-tracker'],
      'make a smart transaction in the portfolio app for R17000 Intel',
    );
    expect(analysis.handler.agentType).toBe('finance');
    expect(analysis.understanding.actionKind).toBe('write');
    expect(analysis.needsClarification).toBe(false);
  });

  it('formats clarifying questions into a reply', () => {
    const reply = formatClarificationReply({
      understanding: {
        goal: 'Buy stock',
        summary: 'Buy stock',
        actionKind: 'write',
        domain: 'finance',
      },
      handler: { type: 'clarify' },
      confidence: 0.4,
      needsClarification: true,
      clarifyingQuestions: ['Which stock?', 'How much in Rand?'],
    });
    expect(reply).toContain('Which stock?');
  });
});
