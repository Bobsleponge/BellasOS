'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function DecisionsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.decisions,
    queryFn: async () => (await api.decisions({ status: 'open' })).decisions,
  });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Decisions</h2>
        <p className="text-sm text-muted mt-1">
          Open strategic decisions Jarvis uses for recommendations and briefings.
        </p>
      </div>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Open decisions</h3>
        {isLoading && <p className="text-sm text-muted">Loading…</p>}
        <div className="space-y-2">
          {(data ?? []).map((decision) => (
            <div
              key={decision.id}
              className="rounded-lg border border-edge bg-panel2/40 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{decision.title}</p>
                <span className="text-[10px] uppercase text-muted">{decision.category}</span>
              </div>
              <p className="text-xs text-muted mt-1">{decision.question}</p>
              {decision.options.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {decision.options.map((opt) => (
                    <li key={opt.id} className="text-[11px] text-white/70">
                      {opt.recommended ? '→ ' : '· '}
                      {opt.label}
                      {opt.recommended ? ' (recommended)' : ''}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-muted mt-2">
                Priority {decision.priority} · {decision.options.length} option
                {decision.options.length === 1 ? '' : 's'}
              </p>
            </div>
          ))}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="text-sm text-muted">No open decisions.</p>
          )}
        </div>
      </section>
    </div>
  );
}
