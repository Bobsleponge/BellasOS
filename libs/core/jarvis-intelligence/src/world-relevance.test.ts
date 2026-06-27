import type { DecisionContext, GoalContext, WorldContext } from '@bellasos/contracts';
import { describe, expect, it } from 'vitest';
import { computeWorldRelevance, linkWorldRelevance } from './world-relevance';
import type { IntelligenceSignal } from './types';

const goalContext: GoalContext = {
  goals: [
    {
      id: 'g-financial',
      objective: 'Grow net worth by 10% this quarter',
      category: 'financial',
      domainId: 'wealth',
      horizon: 'quarterly',
      target: { metric: 'net_worth_pct', targetValue: 10, direction: 'increase' },
      progress: { pct: 55, trend: 'up' },
      priority: 1,
      status: 'active',
      applicationIds: ['wealth'],
      ownerId: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  initiatives: [],
  activeGoalIds: ['g-financial'],
  activeInitiativeIds: [],
};

const worldContext: WorldContext = {
  trackedSectors: ['Mining', 'Energy'],
  symbols: ['GOLD'],
  ventureKeywords: ['Harvi'],
  researchTopics: [],
  projectNames: [],
  recentEnrichments: 0,
};

function miningSignal(): IntelligenceSignal {
  return {
    id: 'world:doc-mining',
    source: 'world.mining',
    domain: 'intelligence',
    title: 'Copper mining output rises in Chile',
    summary: 'Major mining producers report higher copper output.',
    scores: { importance: 0.7, urgency: 0.6, relevance: 0.75, confidence: 0.8 },
    composite: 0,
    tier: 'briefing',
    worldSignal: {
      ingestDocId: 'doc-mining',
      sector: 'mining',
      kind: 'news',
      title: 'Copper mining output rises in Chile',
      summary: 'Major mining producers report higher copper output.',
      source: 'sector_news',
      tags: ['mining', 'copper'],
      fetchedAt: new Date().toISOString(),
      baseScore: 0.72,
    },
  };
}

describe('world relevance', () => {
  it('links mining signal to financial goal', () => {
    const relevance = computeWorldRelevance(miningSignal(), goalContext, undefined, worldContext);
    expect(relevance).toBeDefined();
    expect(relevance?.goalIds).toContain('g-financial');
    expect(relevance?.relevanceLine).toMatch(/mining|financial/i);
  });

  it('attaches worldRelevance and goalImpact via linkWorldRelevance', () => {
    const [linked] = linkWorldRelevance(
      [miningSignal()],
      goalContext,
      undefined,
      worldContext,
    );
    expect(linked.worldRelevance?.goalIds).toContain('g-financial');
    expect(linked.goalImpact?.[0]?.goalId).toBe('g-financial');
  });
});
