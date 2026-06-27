'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { TodayItem } from '@/components/today/TodayItem';
import { api } from '@/lib/api';
import { operatingContextParams, todayQueryKey } from '@/lib/operatingMode';
import { missionTabUrl } from '@/lib/missionRoutes';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';
import { WorkspaceActiveCard } from '@/components/workspaces/WorkspaceActiveCard';
import { JarvisInsightsStrip } from '@/components/jarvis/JarvisInsightsStrip';

export function OverviewTab() {
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const insights = useShellStore((s) => s.lastBriefingInsights);

  const { data: today } = useQuery({
    queryKey: todayQueryKey(activeWorkspaceId),
    queryFn: () => api.today(operatingContextParams({ workspaceId: activeWorkspaceId })),
    staleTime: 30_000,
  });

  const { data: sessionData } = useQuery({
    queryKey: queryKeys.focusSession,
    queryFn: api.activeFocusSession,
    staleTime: 30_000,
  });

  const { data: workspaceCtx } = useQuery({
    queryKey: [...queryKeys.workspaces, 'context', activeWorkspaceId],
    queryFn: () => api.workspaceContext(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
  });

  const priorities =
    today?.items.filter(
      (i) =>
        i.kind === 'goal' ||
        i.kind === 'decision' ||
        i.kind === 'workspace' ||
        i.kind === 'world' ||
        i.kind === 'priority',
    ) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Overview</h2>
        <p className="text-sm text-muted mt-1">
          What matters today — workspace context, Jarvis recommendations, and priorities.
        </p>
      </div>

      {activeWorkspaceId && workspaceCtx ? (
        <WorkspaceActiveCard />
      ) : (
        <div className="rounded-lg border border-edge bg-panel2/40 px-4 py-3 text-sm text-muted">
          No active workspace. Tell Jarvis &quot;Help me grow Harvi&quot; or activate one in{' '}
          <Link href={missionTabUrl('workspaces')} className="text-accent underline">
            Workspaces
          </Link>
          .
        </div>
      )}

      {insights && <JarvisInsightsStrip />}

      {(insights?.worldPulse?.length ?? 0) > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted mb-2">
            Opportunities & risks
          </h3>
          <div className="space-y-2">
            {insights!.worldPulse!.slice(0, 3).map((pulse) => (
              <div
                key={pulse.id}
                className="rounded-lg border border-edge bg-panel2/40 px-4 py-3"
              >
                <p className="text-sm font-medium text-white">{pulse.headline}</p>
                {pulse.relevanceLine && (
                  <p className="text-xs text-muted mt-1">{pulse.relevanceLine}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {sessionData?.session && (
        <section className="rounded-lg border border-edge bg-panel2/40 px-4 py-3">
          <h3 className="text-xs uppercase tracking-wider text-muted mb-1">Focus session</h3>
          <p className="text-sm text-white">
            Active since{' '}
            {new Date(sessionData.session.startedAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </section>
      )}

      {priorities.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-muted mb-2">Today&apos;s priorities</h3>
          <div className="space-y-2">
            {priorities.slice(0, 5).map((item) => (
              <TodayItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {today?.connection && (
        <p className="text-xs text-muted">Connection: {today.connection.label}</p>
      )}
    </div>
  );
}
