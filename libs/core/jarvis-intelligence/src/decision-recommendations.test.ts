import type { DecisionContext, GoalContext } from '@bellasos/contracts';
import { describe, expect, it } from 'vitest';
import { detectDecisionPoints } from './decision-point-detector';
import { generateDecisionRecommendations } from './decision-recommendations';
import { rankSignals } from './priority';
import type { ContextStack, IntelligenceSignal } from './types';

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
      progress: { current: 6, pct: 60, trend: 'down' },
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

const decisionContext: DecisionContext = {
  decisions: [
    {
      id: 'd-harvi',
      title: 'Harvi growth strategy',
      question: 'Increase Harvi marketing spend vs optimize fulfillment capacity?',
      category: 'business',
      domainId: 'ventures',
      status: 'open',
      priority: 1,
      options: [
        {
          id: 'opt-marketing',
          label: 'Increase marketing spend',
          pros: ['Faster growth'],
          cons: ['Higher CAC'],
          riskLevel: 'medium',
          recommended: true,
        },
        {
          id: 'opt-ops',
          label: 'Optimize fulfillment',
          pros: ['Better margins'],
          cons: ['Slower growth'],
          riskLevel: 'low',
        },
      ],
      goalIds: ['g-harvi'],
      initiativeIds: ['i-harvi'],
      projectIds: [],
      researchIds: [],
      signalIds: [],
      applicationIds: ['harvi-and-co'],
      ownerId: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  openDecisions: [],
  recentOutcomes: [],
  pendingReviews: [],
};

decisionContext.openDecisions = decisionContext.decisions.filter((d) => d.status === 'open');

function baseSignal(partial: Partial<IntelligenceSignal>): IntelligenceSignal {
  return {
    id: partial.id ?? 's1',
    source: partial.source ?? 'test',
    domain: partial.domain ?? 'ventures',
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

describe('decision recommendations', () => {
  it('generates Harvi marketing-vs-ops recommendation for below-target signal', () => {
    const signal = baseSignal({
      id: 'harvi',
      source: 'venture.harvi',
      applicationId: 'harvi-and-co',
      title: 'Harvi orders below target',
      summary: 'Harvi received 6 orders this week, below the weekly target',
      scores: { importance: 0.7, urgency: 0.8, relevance: 1, confidence: 0.9 },
    });

    const detected = detectDecisionPoints([signal], goalContext, decisionContext)[0]!;
    expect(detected.decisionPoint?.title).toContain('Harvi');

    const { recommendations } = generateDecisionRecommendations(
      detected ? [detected] : [],
      goalContext,
      decisionContext,
      baseContext,
    );

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]?.tradeoffLine.toLowerCase()).toMatch(/marketing|fulfillment|cac|growth/);
  });

  it('ranks decision-linked Harvi signal above audit activity', () => {
    const harviSignal = baseSignal({
      id: 'harvi',
      source: 'venture.harvi',
      applicationId: 'harvi-and-co',
      title: 'Harvi below target',
      summary: '6 orders below weekly target',
      scores: { importance: 0.7, urgency: 0.8, relevance: 1, confidence: 0.9 },
    });

    const detected = detectDecisionPoints([harviSignal], goalContext, decisionContext)[0]!;
    const { signals: withRecs } = generateDecisionRecommendations(
      [detected],
      goalContext,
      decisionContext,
      baseContext,
    );
    const harvi = withRecs[0]!;

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
      decisionContext,
    );

    const harviRanked = ranked.find((s) => s.id === 'harvi');
    const auditRanked = ranked.find((s) => s.id === 'audit');
    expect(harviRanked?.decisionRecommendation).toBeDefined();
    expect((harviRanked?.composite ?? 0)).toBeGreaterThan(auditRanked?.composite ?? 0);
  });
});
