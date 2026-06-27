'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function GoalsPanel() {
  const { data: goalsData, isLoading: goalsLoading } = useQuery({
    queryKey: queryKeys.goals,
    queryFn: async () => (await api.goals()).goals,
  });
  const { data: initiativesData, isLoading: initiativesLoading } = useQuery({
    queryKey: queryKeys.initiatives,
    queryFn: async () => (await api.initiatives()).initiatives,
  });

  const loading = goalsLoading || initiativesLoading;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Goals & Initiatives</h2>
        <p className="text-sm text-muted mt-1">
          Strategic context for Jarvis briefings and priority ranking.
        </p>
      </div>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Initiatives</h3>
        {loading && <p className="text-sm text-muted">Loading…</p>}
        <div className="space-y-2">
          {(initiativesData ?? []).map((initiative) => (
            <div
              key={initiative.id}
              className="rounded-lg border border-edge bg-panel2/40 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{initiative.name}</p>
                <span className="text-[10px] uppercase text-muted">
                  {initiative.momentum}
                </span>
              </div>
              {initiative.description && (
                <p className="text-xs text-muted mt-1">{initiative.description}</p>
              )}
              <p className="text-[10px] text-muted mt-2">
                Priority {initiative.priority} · {initiative.goalIds.length} goal
                {initiative.goalIds.length === 1 ? '' : 's'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Active goals</h3>
        <div className="space-y-2">
          {(goalsData ?? []).map((goal) => (
            <div
              key={goal.id}
              className="rounded-lg border border-edge bg-panel2/40 px-4 py-3"
            >
              <p className="text-sm font-medium text-white">{goal.objective}</p>
              <p className="text-xs text-muted mt-1">
                {goal.category} · priority {goal.priority}
                {goal.progress.pct != null ? ` · ${goal.progress.pct}% of target` : ''}
              </p>
              {goal.target && (
                <p className="text-[10px] text-muted mt-1">
                  Metric: {goal.target.metric} → {goal.target.targetValue}
                  {goal.target.unit ? ` ${goal.target.unit}` : ''}
                </p>
              )}
            </div>
          ))}
          {!loading && (goalsData ?? []).length === 0 && (
            <p className="text-sm text-muted">No active goals yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
