'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function WealthPortfolioView() {
  const { data: summary } = useQuery({
    queryKey: queryKeys.portfolioSummary,
    queryFn: () => api.invoke<Record<string, unknown>>('bellasos.portfolio', 'summary', {}),
  });

  const { data: holdings } = useQuery({
    queryKey: queryKeys.holdings,
    queryFn: () =>
      api.invoke<Array<Record<string, unknown>>>('bellasos.portfolio', 'holdings.list', {}),
  });

  const analyze = useMutation({
    mutationFn: () => api.invoke<{ analysis: string }>('bellasos.portfolio', 'analyze', {}),
  });

  return (
    <div className="flex h-full flex-col overflow-auto bg-slate-950 p-4 text-white">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Portfolio</h2>
        <p className="text-sm text-white/60">
          BellasOS holdings analysis — synced with Finance Tracker for live household data.
        </p>
      </div>

      {summary && (
        <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <h3 className="mb-2 text-sm font-medium text-white/80">Summary</h3>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-white/70">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/80 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-white/80">Holdings</h3>
          <button
            type="button"
            onClick={() => analyze.mutate()}
            disabled={analyze.isPending}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-white/5 disabled:opacity-50"
          >
            {analyze.isPending ? 'Analyzing…' : 'Analyze portfolio'}
          </button>
        </div>
        <ul className="max-h-48 space-y-2 overflow-auto">
          {(holdings ?? []).length === 0 ? (
            <li className="text-sm text-white/50">No holdings yet. Sync from Finance Tracker or add in Developer Mode.</li>
          ) : (
            (holdings ?? []).map((h) => (
              <li
                key={String(h.id)}
                className="flex justify-between border-b border-white/10 pb-1 text-sm"
              >
                <span>
                  {String(h.symbol)} · {String(h.account)} × {String(h.quantity)}
                </span>
              </li>
            ))
          )}
        </ul>
        {analyze.data?.analysis && (
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-emerald-200">
            {analyze.data.analysis}
          </pre>
        )}
      </div>
    </div>
  );
}
