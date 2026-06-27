import type { GoalContext, WorkspaceContext } from '@bellasos/contracts';
import { describe, expect, it } from 'vitest';
import { rankSignals, scoreSignal, workspaceWeight } from './priority';
import { linkSignalsToGoals } from './signal-goal-linker';
import type { IntelligenceSignal } from './types';

const baseContext = {
  session: { sessionId: 'test' },
  domain: { primary: 'ventures' as const, secondary: [] },
  temporal: { phase: 'morning' as const },
  modality: 'text' as const,
  attention: { pendingApprovals: 0, activeAlerts: 0, openThreads: 0 },
  operatingMode: 'business' as const,
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
  initiatives: [],
  activeGoalIds: ['g-harvi'],
  activeInitiativeIds: [],
};

const workspaceContext: WorkspaceContext = {
  workspace: {
    id: 'ws-harvi',
    title: 'Grow Harvi',
    objective: 'Increase weekly orders',
    type: 'business',
    status: 'active',
    domainId: 'ventures',
    organizationId: 'org:harvi',
    applicationIds: ['harvi-and-co'],
    goalIds: ['g-harvi'],
    initiativeIds: [],
    decisionIds: [],
    artifactIds: [],
    researchIds: [],
    memoryIds: [],
    worldSectorTags: [],
    keywords: ['Harvi'],
    ownerId: 'user',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  goals: goalContext.goals,
  initiatives: [],
  openDecisions: [],
  artifacts: [],
  recentMemories: [],
  worldPulse: [],
  applicationCapabilities: [],
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

describe('workspaceWeight', () => {
  it('boosts signals linked to workspace goals', () => {
    const linked = linkSignalsToGoals(
      [
        baseSignal({
          id: 'harvi-signal',
          applicationId: 'harvi-and-co',
          domain: 'ventures',
          title: 'Harvi orders up',
        }),
      ],
      goalContext,
    )[0]!;

    const without = workspaceWeight(linked, null);
    const withWorkspace = workspaceWeight(linked, workspaceContext);
    expect(withWorkspace).toBeGreaterThan(without);
  });

  it('ranks workspace-linked signal higher when workspace is active', () => {
    const harvi = linkSignalsToGoals(
      [
        baseSignal({
          id: 'harvi',
          applicationId: 'harvi-and-co',
          domain: 'ventures',
          title: 'Harvi momentum',
          scores: { importance: 0.55, urgency: 0.5, relevance: 1, confidence: 0.7 },
        }),
      ],
      goalContext,
    )[0]!;
    const generic = baseSignal({
      id: 'generic',
      source: 'audit.activity',
      domain: 'systems',
      title: 'Routine audit entry',
      scores: { importance: 0.58, urgency: 0.5, relevance: 1, confidence: 0.7 },
    });

    const ranked = rankSignals(
      [generic, harvi],
      baseContext,
      5,
      goalContext,
      undefined,
      undefined,
      workspaceContext,
    );
    expect(ranked[0]?.id).toBe('harvi');
  });

  it('includes workspace weight in composite score', () => {
    const signal = baseSignal({
      goalImpact: [
        {
          goalId: 'g-harvi',
          goalObjective: 'Reach weekly order growth target for Harvi',
          impact: 'positive',
          relevanceLine: 'Supports Harvi growth',
        },
      ],
    });
    const base = scoreSignal(signal, baseContext, goalContext, undefined, undefined, null);
    const scoped = scoreSignal(signal, baseContext, goalContext, undefined, undefined, workspaceContext);
    expect(scoped.composite).toBeGreaterThan(base.composite);
  });
});
