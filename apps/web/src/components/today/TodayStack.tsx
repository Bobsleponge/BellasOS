'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TodayItem } from '@/components/today/TodayItem';
import { api } from '@/lib/api';
import { operatingContextParams, todayQueryKey } from '@/lib/operatingMode';
import { useShellStore } from '@/stores/shellStore';

/** Today feed — hidden entirely when empty; items only (greeting lives in HomeHeader). */
export function TodayStack() {
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: todayQueryKey(activeWorkspaceId),
    queryFn: () => api.today(operatingContextParams({ workspaceId: activeWorkspaceId })),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const alerts = data?.items.filter((i) => i.kind === 'alert') ?? [];
  const stackItems =
    data?.items.filter(
      (i) =>
        i.kind !== 'alert' &&
        i.kind !== 'activity' &&
        i.kind !== 'approval' &&
        i.kind !== 'priority' &&
        i.kind !== 'goal' &&
        i.kind !== 'decision' &&
        i.kind !== 'workspace',
    ) ?? [];
  const activity = data?.items.filter((i) => i.kind === 'activity') ?? [];

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-white/40">Today</h2>
        <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-4 flex items-center justify-between gap-3">
          <p className="text-sm text-white/60">Could not load today&apos;s items.</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </section>
    );
  }

  const hasContent = stackItems.length > 0 || alerts.length > 0 || activity.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-wider text-white/40">Today</h2>
      <div id="today" className="scroll-mt-24 space-y-4">
        {stackItems.length > 0 && (
          <div className="space-y-2">
            {stackItems.slice(0, 7).map((item) => (
              <TodayItem key={item.id} item={item} />
            ))}
          </div>
        )}

        {alerts.length > 0 && (
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-amber-400/80 mb-2">
              Needs attention
            </h3>
            <div className="space-y-2">
              {alerts.map((item) => (
                <TodayItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {activity.length > 0 && (
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
              Recent activity
            </h3>
            <div className="space-y-2">
              {activity.slice(0, 5).map((item) => (
                <TodayItem key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
