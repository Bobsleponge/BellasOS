import type { WorldContext, WorldOpportunity, WorldOpportunityKind } from '@bellasos/contracts';
import type { IntelligenceSignal, OpportunityKind } from './types';

function hoursSince(iso?: string): number {
  if (!iso) return 999;
  const ms = Date.now() - Date.parse(iso);
  return Number.isFinite(ms) ? ms / 3_600_000 : 999;
}

function textIncludesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function opportunityKindToSignalKind(kind: WorldOpportunityKind): OpportunityKind {
  if (kind === 'emerging_risk') return 'risk';
  if (kind === 'emerging_opportunity' || kind === 'investment_implication') return 'opportunity';
  return 'follow_up';
}

function detectOpportunity(
  signal: IntelligenceSignal,
  worldContext: WorldContext,
  sectorCounts: Map<string, number>,
): WorldOpportunity | undefined {
  const world = signal.worldSignal;
  if (!world) return undefined;

  const text = `${world.title} ${world.summary} ${world.tags.join(' ')}`;
  const sectorKey = world.sector;
  const sectorCount = sectorCounts.get(sectorKey) ?? 0;

  if (sectorCount >= 3) {
    return {
      kind: 'industry_shift',
      title: `${sectorKey.replace(/_/g, ' ')} activity cluster`,
      summary: `${sectorCount} developments in ${sectorKey.replace(/_/g, ' ')} in the last 12 hours.`,
      severity: sectorCount >= 5 ? 'high' : 'medium',
      recommendedAction: 'Review how this trend affects your active goals.',
    };
  }

  if (world.kind === 'filing' && worldContext.symbols.some((s) => text.toUpperCase().includes(s.toUpperCase()))) {
    return {
      kind: 'investment_implication',
      title: 'Filing on held symbol',
      summary: world.title,
      severity: 'medium',
      recommendedAction: 'Review the filing in Wealth.',
    };
  }

  if (
    textIncludesAny(text, worldContext.ventureKeywords) &&
    (world.sector === 'user_business' || world.sector === 'technology')
  ) {
    return {
      kind: 'competitive_move',
      title: 'Venture-relevant development',
      summary: world.title,
      severity: 'medium',
    };
  }

  if (
    (world.sector === 'ai' || world.sector === 'technology') &&
    worldContext.researchTopics.length > 0 &&
    textIncludesAny(text, ['breakthrough', 'launch', 'model', 'chip'])
  ) {
    return {
      kind: 'research_implication',
      title: 'Technology shift worth noting',
      summary: world.title,
      severity: 'medium',
      recommendedAction: 'Consider a short research note.',
    };
  }

  if (world.kind === 'market_move' && /[-+]?\d+(?:\.\d+)?%/.test(text)) {
    const match = text.match(/([-+]?\d+(?:\.\d+)?)%/);
    const pct = match ? Math.abs(Number(match[1])) : 0;
    if (pct >= 3) {
      return {
        kind: pct >= 0 ? 'emerging_opportunity' : 'emerging_risk',
        title: 'Notable market move',
        summary: world.title,
        severity: pct >= 5 ? 'high' : 'medium',
      };
    }
  }

  if (
    world.sector === 'south_africa' &&
    textIncludesAny(text, ['regulation', 'regulatory', 'policy', 'tariff']) &&
    worldContext.ventureKeywords.some((k) => textIncludesAny(text, [k]))
  ) {
    return {
      kind: 'business_implication',
      title: 'South Africa regulatory development',
      summary: world.title,
      severity: 'medium',
    };
  }

  if (signal.worldRelevance?.decisionIds.length) {
    return {
      kind: 'business_implication',
      title: 'External input for open decision',
      summary: world.title,
      severity: 'medium',
      recommendedAction: 'Factor this into your pending decision.',
    };
  }

  return undefined;
}

export function buildSectorCounts(signals: IntelligenceSignal[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    const sector = signal.worldSignal?.sector;
    if (!sector) continue;
    if (hoursSince(signal.worldSignal?.fetchedAt) > 12) continue;
    counts.set(sector, (counts.get(sector) ?? 0) + 1);
  }
  return counts;
}

export function tagWorldOpportunities(
  signals: IntelligenceSignal[],
  worldContext: WorldContext,
): IntelligenceSignal[] {
  const sectorCounts = buildSectorCounts(signals);

  return signals.map((signal) => {
    if (!signal.worldSignal) return signal;
    const worldOpportunity = detectOpportunity(signal, worldContext, sectorCounts);
    if (!worldOpportunity) return signal;

    const kind = signal.kind ?? opportunityKindToSignalKind(worldOpportunity.kind);
    const strategicBoost =
      worldOpportunity.severity === 'high'
        ? 0.85
        : worldOpportunity.severity === 'medium'
          ? 0.7
          : 0.55;

    return {
      ...signal,
      worldOpportunity,
      kind,
      strategicScore: Math.max(signal.strategicScore ?? 0, strategicBoost),
      scores: {
        ...signal.scores,
        importance: Math.min(
          0.95,
          signal.scores.importance + (worldOpportunity.severity === 'high' ? 0.15 : 0.08),
        ),
      },
    };
  });
}
