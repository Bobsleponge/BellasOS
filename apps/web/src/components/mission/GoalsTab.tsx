'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function GoalsTab() {
  const { data: goalsData, isLoading: goalsLoading } = useQuery({
    queryKey: queryKeys.goals,
    queryFn: async () => (await api.goals()).goals,
  });

  const { data: initiativesData, isLoading: initiativesLoading } = useQuery({
    queryKey: queryKeys.initiatives,
    queryFn: async () => (await api.initiatives()).initiatives,
  });

  const { data: progressData } = useQuery({
    queryKey: [...queryKeys.goals, 'progress'],
    queryFn: () => api.goalProgress(),
  });

  const progressByGoal = new Map((progressData?.goals ?? []).map((g) => [g.id, g]));

  const loading = goalsLoading || initiativesLoading;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Goals & Initiatives</h2>
        <p className="text-sm text-muted mt-1">
          Strategic context with progress headlines and on-track status.
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
                <span className="text-[10px] uppercase text-muted">{initiative.momentum}</span>
              </div>
              {initiative.description && (
                <p className="text-xs text-muted mt-1">{initiative.description}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-3">Active goals</h3>
        <div className="space-y-2">
          {(goalsData ?? []).map((goal) => {
            const progress = progressByGoal.get(goal.id);
            const pct = goal.progress.pct ?? progress?.progress?.pct;
            const onTrack = pct == null || pct >= 50;
            return (
              <div
                key={goal.id}
                className={`rounded-lg border px-4 py-3 ${
                  onTrack ? 'border-edge bg-panel2/40' : 'border-amber-400/30 bg-amber-400/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">{goal.objective}</p>
                  <span
                    className={`text-[10px] uppercase shrink-0 ${
                      onTrack ? 'text-green-400' : 'text-amber-300'
                    }`}
                  >
                    {onTrack ? 'On track' : 'At risk'}
                  </span>
                </div>
                {pct != null && (
                  <div className="mt-2 h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${onTrack ? 'bg-accent' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted mt-2">
                  {goal.category} · priority {goal.priority}
                  {pct != null ? ` · ${pct}% of target` : ''}
                </p>
                {progress?.target && (
                  <p className="text-[10px] text-muted mt-1">
                    Metric: {progress.target.metric} → {progress.target.targetValue}
                    {progress.target.unit ? ` ${progress.target.unit}` : ''}
                  </p>
                )}
              </div>
            );
          })}
          {!loading && (goalsData ?? []).length === 0 && (
            <p className="text-sm text-muted">No active goals yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
