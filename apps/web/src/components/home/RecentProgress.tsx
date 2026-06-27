'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { operatingContextParams, todayQueryKey } from '@/lib/operatingMode';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';

export function RecentProgress() {
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const insights = useShellStore((s) => s.lastBriefingInsights);

  const { data: today } = useQuery({
    queryKey: todayQueryKey(activeWorkspaceId),
    queryFn: () => api.today(operatingContextParams({ workspaceId: activeWorkspaceId })),
    staleTime: 30_000,
  });

  const progress = (insights?.goalProgress ?? []).slice(0, 3);
  const activity = (today?.items ?? []).filter((i) => i.kind === 'activity').slice(0, 3);

  if (progress.length === 0 && activity.length === 0) {
    return (
      <div className="rounded-lg border border-edge bg-panel2/40 px-4 py-3 text-sm text-muted">
        No recent progress recorded.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {progress.map((g) => (
        <div key={g.goalId} className="rounded-lg border border-edge bg-panel2/40 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white truncate">{g.objective}</p>
              <p className="text-xs text-muted mt-0.5">{g.headline}</p>
              <p className="text-[10px] text-muted mt-1 capitalize">{g.trend}</p>
            </div>
          </div>
        </div>
      ))}
      {activity.map((item) => (
        <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5">
          <p className="text-sm text-white/90">{item.title}</p>
          {item.subtitle && <p className="text-xs text-muted mt-0.5">{item.subtitle}</p>}
        </div>
      ))}
    </div>
  );
}
