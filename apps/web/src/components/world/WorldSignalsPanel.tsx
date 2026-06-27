'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function WorldSignalsPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['world-signals'],
    queryFn: () => api.worldSignals({ sinceHours: 24 }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <p className="text-sm text-muted">Loading world signals…</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-300">Could not load world signals.</p>;
  }

  const signals = data?.signals ?? [];
  if (signals.length === 0) {
    return (
      <p className="text-sm text-muted">
        No enriched world signals in the last 24 hours. Run collection from ingestion or wait for the worker.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {signals.slice(0, 12).map((signal) => (
        <div
          key={signal.id}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
        >
          <p className="text-white font-medium">{signal.title}</p>
          <p className="text-xs text-white/60 mt-1">
            {signal.worldRelevance?.relevanceLine ?? signal.summary}
          </p>
          {signal.worldSignal?.sector && (
            <p className="text-[10px] text-teal-300/80 mt-1 uppercase tracking-wide">
              {signal.worldSignal.sector.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
