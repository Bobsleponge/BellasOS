import type { WorldContext } from '@bellasos/contracts';
import { describe, expect, it } from 'vitest';
import { buildSectorCounts, tagWorldOpportunities } from './world-opportunities';
import type { IntelligenceSignal } from './types';

const worldContext: WorldContext = {
  trackedSectors: ['Mining'],
  symbols: ['GOLD'],
  ventureKeywords: ['Harvi'],
  researchTopics: ['AI agents'],
  projectNames: [],
  recentEnrichments: 0,
};

function worldSignal(id: string, sector: WorldContext['trackedSectors'][number] | 'mining' = 'mining'): IntelligenceSignal {
  return {
    id: `world:${id}`,
    source: `world.${sector}`,
    domain: 'intelligence',
    title: `Update ${id}`,
    summary: 'Sector development',
    scores: { importance: 0.6, urgency: 0.6, relevance: 0.7, confidence: 0.7 },
    composite: 0,
    tier: 'briefing',
    worldSignal: {
      ingestDocId: id,
      sector: sector as 'mining',
      kind: 'news',
      title: `Update ${id}`,
      summary: 'Sector development',
      source: 'sector_news',
      tags: [String(sector)],
      fetchedAt: new Date().toISOString(),
      baseScore: 0.65,
    },
  };
}

describe('world opportunities', () => {
  it('detects industry shift when 3+ docs in same sector', () => {
    const signals = [worldSignal('1'), worldSignal('2'), worldSignal('3')];
    const counts = buildSectorCounts(signals);
    expect(counts.get('mining')).toBe(3);

    const tagged = tagWorldOpportunities(signals, worldContext);
    expect(tagged.every((s) => s.worldOpportunity?.kind === 'industry_shift')).toBe(true);
  });

  it('tags filing on held symbol as investment implication', () => {
    const signal: IntelligenceSignal = {
      ...worldSignal('filing-1', 'user_investments'),
      worldSignal: {
        ...worldSignal('filing-1').worldSignal!,
        sector: 'user_investments',
        kind: 'filing',
        title: 'GOLD Form 4 insider purchase',
        summary: 'GOLD Form 4 filed',
      },
    };
    const [tagged] = tagWorldOpportunities([signal], worldContext);
    expect(tagged.worldOpportunity?.kind).toBe('investment_implication');
  });
});
