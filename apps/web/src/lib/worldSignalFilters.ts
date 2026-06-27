import type { WorldSignalItem } from '@/lib/api';

const OPPORTUNITY_KINDS = new Set([
  'emerging_opportunity',
  'investment_implication',
  'industry_shift',
  'opportunity',
]);

const RISK_KINDS = new Set(['emerging_risk', 'risk']);

export function filterOpportunitySignals(signals: WorldSignalItem[]): WorldSignalItem[] {
  return signals.filter((s) => {
    const kind = s.worldOpportunity?.kind ?? s.worldSignal?.kind ?? '';
    return OPPORTUNITY_KINDS.has(kind);
  });
}

export function filterRiskSignals(signals: WorldSignalItem[]): WorldSignalItem[] {
  return signals.filter((s) => {
    const kind = s.worldOpportunity?.kind ?? s.worldSignal?.kind ?? '';
    if (RISK_KINDS.has(kind)) return true;
    return s.worldOpportunity?.severity === 'high';
  });
}

export function filterPulseOpportunities(
  pulse: Array<{ id: string; headline: string; relevanceLine?: string; sector: string }>,
): typeof pulse {
  return pulse.filter((p) => !/risk|threat|decline/i.test(p.headline));
}

export function filterPulseRisks(
  pulse: Array<{ id: string; headline: string; relevanceLine?: string; sector: string }>,
): typeof pulse {
  return pulse.filter((p) => /risk|threat|decline|warning/i.test(p.headline));
}
