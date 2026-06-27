import { describe, expect, it } from 'vitest';
import { summarizeWorkspaceProgress } from './workspace-intelligence';
import type { WorkspaceContext } from '@bellasos/contracts';

describe('summarizeWorkspaceProgress', () => {
  it('returns headline from top goal progress', () => {
    const context: WorkspaceContext = {
      workspace: {
        id: 'ws-1',
        title: 'Grow Harvi',
        objective: 'Increase orders',
        type: 'business',
        status: 'active',
        domainId: 'ventures',
        applicationIds: ['harvi-and-co'],
        goalIds: ['g-1'],
        initiativeIds: [],
        decisionIds: [],
        artifactIds: [],
        researchIds: [],
        memoryIds: [],
        worldSectorTags: [],
        keywords: [],
        ownerId: 'user',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      goals: [
        {
          id: 'g-1',
          objective: 'Weekly order growth',
          category: 'business',
          domainId: 'ventures',
          horizon: 'weekly',
          progress: { current: 8, pct: 80, trend: 'up' },
          priority: 1,
          status: 'active',
          ownerId: 'user',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      initiatives: [],
      openDecisions: [],
      artifacts: [],
      recentMemories: [],
      worldPulse: [],
      applicationCapabilities: [],
    };

    const summary = summarizeWorkspaceProgress(context);
    expect(summary?.title).toBe('Grow Harvi');
    expect(summary?.headline).toContain('80%');
    expect(summary?.onTrack).toBe(true);
  });

  it('returns undefined when no workspace', () => {
    expect(summarizeWorkspaceProgress(null)).toBeUndefined();
  });
});
