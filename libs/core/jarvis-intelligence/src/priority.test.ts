import { describe, expect, it } from 'vitest';
import type { ContextStack } from '@bellasos/contracts';
import { dedupeSignals, rankSignals, scoreSignal } from './priority';
import type { IntelligenceSignal } from './types';

const baseContext: ContextStack = {
  session: { sessionId: 'test' },
  domain: { primary: 'wealth', secondary: [] },
  temporal: { phase: 'morning' },
  modality: 'text',
  attention: { pendingApprovals: 1, activeAlerts: 0, openThreads: 0 },
  operatingMode: 'wealth',
};

function signal(partial: Partial<IntelligenceSignal>): IntelligenceSignal {
  return {
    id: partial.id ?? 's1',
    source: partial.source ?? 'test',
    domain: partial.domain ?? 'wealth',
    title: partial.title ?? 'Test',
    summary: partial.summary ?? 'Summary',
    scores: partial.scores ?? {
      importance: 0.5,
      urgency: 0.5,
      relevance: 1,
      confidence: 0.9,
    },
    composite: partial.composite ?? 0,
    tier: partial.tier ?? 'briefing',
    ...partial,
  };
}

describe('priority engine', () => {
  it('ranks approvals above audit activity', () => {
    const ranked = rankSignals(
      [
        signal({
          id: 'a1',
          source: 'approval',
          title: 'Approve publish',
          scores: { importance: 0.95, urgency: 0.9, relevance: 1, confidence: 0.95 },
        }),
        signal({
          id: 'a2',
          source: 'audit.activity',
          domain: 'systems',
          title: 'module.invoke',
          scores: { importance: 0.2, urgency: 0.3, relevance: 0.5, confidence: 0.6 },
        }),
      ],
      baseContext,
    );
    expect(ranked[0]?.id).toBe('a1');
  });

  it('dedupes by source and title', () => {
    const lower = scoreSignal(
      signal({
        id: '1',
        title: 'Wealth snapshot',
        scores: { importance: 0.7, urgency: 0.7, relevance: 1, confidence: 0.9 },
      }),
      baseContext,
    );
    const higher = scoreSignal(
      signal({
        id: '2',
        title: 'wealth snapshot',
        scores: { importance: 0.95, urgency: 0.9, relevance: 1, confidence: 0.9 },
      }),
      baseContext,
    );
    const deduped = dedupeSignals([lower, higher]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.id).toBe('2');
    expect(deduped[0]?.composite).toBeGreaterThan(lower.composite);
  });

  it('boosts wealth domain in wealth mode', () => {
    const wealth = scoreSignal(
      signal({
        domain: 'wealth',
        scores: { importance: 0.7, urgency: 0.5, relevance: 1, confidence: 0.9 },
      }),
      baseContext,
    );
    const life = scoreSignal(
      signal({
        domain: 'life',
        scores: { importance: 0.7, urgency: 0.5, relevance: 1, confidence: 0.9 },
      }),
      baseContext,
    );
    expect(wealth.composite).toBeGreaterThan(life.composite);
  });
});
