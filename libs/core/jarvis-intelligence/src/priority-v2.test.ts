import type { ContextStack, GoalContext } from '@bellasos/contracts';
import { describe, expect, it } from 'vitest';
import { rankSignals, scoreSignal } from './priority';
import { linkSignalsToGoals } from './signal-goal-linker';
import type { IntelligenceSignal } from './types';

const baseContext: ContextStack = {
  session: { sessionId: 'test' },
  domain: { primary: 'ventures', secondary: [] },
  temporal: { phase: 'morning' },
  modality: 'text',
  attention: { pendingApprovals: 0, activeAlerts: 0, openThreads: 0 },
  operatingMode: 'business',
};

const goalContext: GoalContext = {
  goals: [
    {
      id: 'g-harvi',
      objective: 'Reach weekly order growth target for Harvi',
      category: 'business',
      domainId: 'ventures',
      horizon: 'weekly',
      target: { metric: 'weekly_orders', targetValue: 10, unit: 'orders', direction: 'increase' },
      progress: { current: 12, pct: 120, trend: 'up' },
      priority: 1,
      status: 'active',
      initiativeId: 'i-harvi',
      applicationIds: ['harvi-and-co'],
      ownerId: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  initiatives: [
    {
      id: 'i-harvi',
      name: 'Grow Harvi',
      status: 'active',
      momentum: 'steady',
      applicationIds: ['harvi-and-co'],
      goalIds: ['g-harvi'],
      priority: 1,
      ownerId: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  activeGoalIds: ['g-harvi'],
  activeInitiativeIds: ['i-harvi'],
};

function baseSignal(partial: Partial<IntelligenceSignal>): IntelligenceSignal {
  return {
    id: partial.id ?? 's1',
    source: partial.source ?? 'test',
    domain: partial.domain ?? 'systems',
    title: partial.title ?? 'Test',
    summary: partial.summary ?? 'Summary',
    scores: partial.scores ?? {
      importance: 0.5,
      urgency: 0.5,
      relevance: 1,
      confidence: 0.6,
    },
    composite: partial.composite ?? 0,
    tier: partial.tier ?? 'briefing',
    ...partial,
  };
}

describe('priority v2', () => {
  it('ranks goal-linked Harvi signal above audit activity', () => {
    const harvi = linkSignalsToGoals(
      [
        baseSignal({
          id: 'harvi',
          source: 'venture.harvi',
          domain: 'ventures',
          applicationId: 'harvi-and-co',
          title: 'Harvi overnight',
          summary: 'Harvi received 12 orders overnight',
          scores: { importance: 0.7, urgency: 0.8, relevance: 1, confidence: 0.9 },
        }),
      ],
      goalContext,
    )[0]!;

    expect(harvi.goalImpact?.length).toBeGreaterThan(0);

    const ranked = rankSignals(
      [
        harvi,
        baseSignal({
          id: 'audit',
          source: 'audit.activity',
          domain: 'systems',
          title: 'module.invoke',
          scores: { importance: 0.2, urgency: 0.3, relevance: 0.5, confidence: 0.6 },
        }),
      ],
      baseContext,
      7,
      goalContext,
    );

    const harviRanked = ranked.find((s) => s.id === 'harvi');
    const auditRanked = ranked.find((s) => s.id === 'audit');
    expect(harviRanked?.goalImpact?.length).toBeGreaterThan(0);
    expect((harviRanked?.composite ?? 0)).toBeGreaterThan(auditRanked?.composite ?? 0);
  });

  it('boosts composite score when signal affects P1 goal', () => {
    const linked = linkSignalsToGoals(
      [
        baseSignal({
          id: 'harvi',
          source: 'venture.harvi',
          domain: 'ventures',
          applicationId: 'harvi-and-co',
          title: 'Harvi orders',
          summary: '12 orders',
          scores: { importance: 0.7, urgency: 0.7, relevance: 1, confidence: 0.9 },
        }),
      ],
      goalContext,
    )[0]!;

    const withGoal = scoreSignal(linked, baseContext, goalContext);
    const withoutGoal = scoreSignal(
      { ...linked, goalImpact: undefined, strategicScore: undefined },
      baseContext,
    );

    expect(withGoal.composite).toBeGreaterThan(withoutGoal.composite);
  });
});
