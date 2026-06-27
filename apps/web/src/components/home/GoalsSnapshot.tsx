'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Target } from 'lucide-react';
import { AskJarvisButton } from '@/components/jarvis/AskJarvisButton';
import { api } from '@/lib/api';
import { homeSectionUrl } from '@/lib/missionRoutes';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';

export function GoalsSnapshot() {
  const insights = useShellStore((s) => s.lastBriefingInsights);

  const { data: goalsData } = useQuery({
    queryKey: queryKeys.goals,
    queryFn: async () => (await api.goals()).goals,
    staleTime: 60_000,
  });

  const { data: progressData } = useQuery({
    queryKey: [...queryKeys.goals, 'progress'],
    queryFn: () => api.goalProgress(),
    staleTime: 60_000,
  });

  const progressByGoal = new Map((progressData?.goals ?? []).map((g) => [g.id, g]));

  const fromBriefing = (insights?.goalProgress ?? []).map((g) => ({
    id: g.goalId,
    title: g.objective,
    headline: g.headline,
    onTrack: g.onTrack,
    pct: g.pct,
  }));

  const fromApi = (goalsData ?? [])
    .filter((g) => g.status === 'active')
    .map((goal) => {
      const progress = progressByGoal.get(goal.id);
      const pct = goal.progress.pct ?? progress?.progress?.pct;
      return {
        id: goal.id,
        title: goal.objective,
        headline: undefined,
        onTrack: pct == null || pct >= 50,
        pct,
      };
    });

  const merged = fromBriefing.length > 0 ? fromBriefing : fromApi;
  const sorted = [...merged].sort((a, b) => Number(a.onTrack) - Number(b.onTrack));
  const top = sorted.slice(0, 3);

  if (top.length === 0) {
    return (
      <div className="rounded-lg border border-edge bg-panel2/40 px-4 py-3 space-y-3">
        <p className="text-sm text-muted">No active goals yet.</p>
        <AskJarvisButton prompt="Help me set a strategic goal for this quarter">
          Ask Jarvis to set a goal
        </AskJarvisButton>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {top.map((goal) => (
        <Link
          key={goal.id}
          href={homeSectionUrl('goals')}
          className={`block rounded-lg border px-3 py-2.5 transition-colors hover:border-accent/30 ${
            goal.onTrack ? 'border-edge bg-panel2/40' : 'border-amber-400/30 bg-amber-400/5'
          }`}
        >
          <div className="flex items-start gap-2">
            <Target className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${goal.onTrack ? 'text-accent' : 'text-amber-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{goal.title}</p>
              {goal.headline && <p className="text-xs text-muted mt-0.5 line-clamp-2">{goal.headline}</p>}
              {goal.pct != null && (
                <p className="text-[10px] text-muted mt-1">{Math.round(goal.pct)}% progress</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
