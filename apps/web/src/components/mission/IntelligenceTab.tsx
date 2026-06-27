'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { missionTabUrl } from '@/lib/missionRoutes';
import { queryKeys } from '@/lib/queryKeys';

export function IntelligenceTab() {
  const { data: signalsData, isLoading, isError } = useQuery({
    queryKey: queryKeys.worldSignals,
    queryFn: () => api.worldSignals({ sinceHours: 48 }),
    staleTime: 60_000,
  });

  const { data: trendsData } = useQuery({
    queryKey: ['world-trends'],
    queryFn: api.worldTrends,
    staleTime: 60_000,
  });

  const signals = signalsData?.signals ?? [];
  const opportunities = signals.filter(
    (s) =>
      s.worldOpportunity?.kind !== 'emerging_risk' &&
      (s.worldOpportunity?.kind === 'emerging_opportunity' ||
        s.worldOpportunity?.kind === 'investment_implication' ||
        s.worldOpportunity?.kind === 'industry_shift' ||
        s.worldSignal?.kind === 'opportunity'),
  );
  const risks = signals.filter(
    (s) =>
      s.worldOpportunity?.kind === 'emerging_risk' ||
      s.worldSignal?.kind === 'risk' ||
      s.worldOpportunity?.severity === 'high',
  );
  const pulse = signals.filter((s) => !opportunities.includes(s) && !risks.includes(s));

  if (isLoading) {
    return <p className="text-sm text-muted">Loading intelligence…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-300">Could not load intelligence.</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Intelligence</h2>
        <p className="text-sm text-muted mt-1">
          Opportunities, risks, and external pulse — relevance to your goals and holdings.
        </p>
      </div>

      <SignalSection title="Opportunities" items={opportunities.slice(0, 8)} accent="text-emerald-300" />
      <SignalSection title="Risks" items={risks.slice(0, 8)} accent="text-red-300" />
      <SignalSection title="External pulse" items={pulse.slice(0, 6)} accent="text-teal-300" />

      {(trendsData?.trends ?? []).length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Sector trends</h3>
          <div className="space-y-2">
            {trendsData!.trends.slice(0, 6).map((trend) => (
              <div key={trend.id} className="rounded-lg border border-edge bg-panel2/40 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white capitalize">
                    {trend.sector.replace(/_/g, ' ')}
                  </p>
                  <span className="text-[10px] uppercase text-muted">{trend.direction}</span>
                </div>
                <p className="text-xs text-muted mt-1">{trend.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {signals.length === 0 && (
        <p className="text-sm text-muted">
          No enriched signals in the last 48 hours. Check back after the next collection cycle.
        </p>
      )}

      <p className="text-xs text-muted">
        <Link href={missionTabUrl('overview')} className="text-accent underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}

function SignalSection({
  title,
  items,
  accent,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    summary: string;
    worldRelevance?: { relevanceLine: string };
    worldOpportunity?: { summary: string };
  }>;
  accent: string;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-muted mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((signal) => (
          <div
            key={signal.id}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
          >
            <p className="text-white font-medium">{signal.title}</p>
            <p className={`text-xs mt-1 ${accent}`}>
              {signal.worldRelevance?.relevanceLine ??
                signal.worldOpportunity?.summary ??
                signal.summary}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
