import type { IntelligenceSignal, OpportunityKind } from './types';

function hoursSince(iso?: string): number {
  if (!iso) return 999;
  const ms = Date.now() - Date.parse(iso);
  return Number.isFinite(ms) ? ms / 3_600_000 : 999;
}

export function tagOpportunities(signals: IntelligenceSignal[]): IntelligenceSignal[] {
  return signals.map((signal) => {
    if (signal.kind) return signal;

    let kind: OpportunityKind | undefined;

    if (signal.source.startsWith('approval')) {
      kind = 'decision';
    } else if (signal.source.includes('alert') || signal.kind === 'risk') {
      kind = 'risk';
    } else if (signal.source.startsWith('research') && hoursSince(signal.createdAt) < 24) {
      kind = 'follow_up';
    } else if (signal.source.startsWith('notification') && hoursSince(signal.createdAt) > 48) {
      kind = 'blocker';
    } else if (signal.source.startsWith('ingestion.pattern') || signal.worldOpportunity) {
      kind = 'opportunity';
    } else if (signal.source.startsWith('world.') || signal.worldSignal) {
      kind = signal.worldOpportunity?.kind === 'emerging_risk' ? 'risk' : 'opportunity';
    } else if (signal.relevanceLine?.includes('moved')) {
      const match = signal.relevanceLine.match(/(-?\d+(?:\.\d+)?)/);
      const change = match ? Number(match[1]) : 0;
      kind = change >= 0 ? 'opportunity' : 'risk';
    }

    return kind ? { ...signal, kind } : signal;
  });
}
