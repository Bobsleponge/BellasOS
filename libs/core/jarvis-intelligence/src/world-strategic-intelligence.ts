import type {
  WorldIntelligenceSummary,
  WorldTrend,
  WorldTrendDirection,
} from '@bellasos/contracts';
import { buildSectorCounts } from './world-opportunities';
import type { IntelligenceSignal } from './types';

function trendDirection(count: number, avgScore: number): WorldTrendDirection {
  if (count >= 5) return 'volatile';
  if (avgScore >= 0.7) return 'up';
  if (avgScore <= 0.45) return 'down';
  return 'flat';
}

export function detectWorldTrends(signals: IntelligenceSignal[]): WorldTrend[] {
  const sectorCounts = buildSectorCounts(signals);
  const trends: WorldTrend[] = [];

  for (const [sector, docCount] of sectorCounts) {
    if (docCount < 2) continue;
    const sectorSignals = signals.filter((s) => s.worldSignal?.sector === sector);
    const avgScore =
      sectorSignals.reduce((sum, s) => sum + (s.worldSignal?.baseScore ?? 0.5), 0) /
      Math.max(sectorSignals.length, 1);
    const direction = trendDirection(docCount, avgScore);
    const linkedGoalIds = [
      ...new Set(
        sectorSignals.flatMap((s) => s.worldRelevance?.goalIds ?? []),
      ),
    ];

    trends.push({
      id: `trend:${sector}`,
      sector: sector as WorldTrend['sector'],
      direction,
      docCount,
      windowHours: 12,
      summary: `${docCount} ${sector.replace(/_/g, ' ')} updates in the last 12 hours — pattern worth noting.`,
      confidence: Math.min(0.9, 0.45 + docCount * 0.08),
      linkedGoalIds,
    });
  }

  return trends.sort((a, b) => b.docCount - a.docCount).slice(0, 5);
}

export function buildWorldPulse(signals: IntelligenceSignal[], max = 3): WorldIntelligenceSummary[] {
  return signals
    .filter((s) => s.worldSignal && (s.worldRelevance || (s.worldSignal.baseScore >= 0.55)))
    .slice(0, max)
    .map((s) => ({
      id: s.id,
      headline: s.worldSignal!.title,
      sector: s.worldSignal!.sector,
      relevanceLine: s.worldRelevance?.relevanceLine ?? s.relevanceLine,
      trendDirection: undefined,
    }));
}

export function externalHighlightsFromSignals(
  signals: IntelligenceSignal[],
  max = 5,
): IntelligenceSignal[] {
  return signals
    .filter((s) => s.worldSignal && s.tier !== 'silent')
    .sort((a, b) => b.composite - a.composite)
    .slice(0, max);
}

export function worldTrendOneLiner(trends: WorldTrend[]): string | undefined {
  const top = trends[0];
  if (!top) return undefined;
  return top.summary;
}

export function analyzeWorldStrategicIntelligence(signals: IntelligenceSignal[]): {
  worldTrends: WorldTrend[];
  worldPulse: WorldIntelligenceSummary[];
  externalHighlights: IntelligenceSignal[];
} {
  const worldTrends = detectWorldTrends(signals);
  const worldPulse = buildWorldPulse(signals, 3);
  const externalHighlights = externalHighlightsFromSignals(signals, 5);
  return { worldTrends, worldPulse, externalHighlights };
}
