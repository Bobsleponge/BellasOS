'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Focus, RefreshCw } from 'lucide-react';
import { ModeChip } from '@/components/mission/ModeChip';
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { homeSectionUrl } from '@/lib/missionRoutes';
import { operatingContextParams, todayQueryKey } from '@/lib/operatingMode';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';

function connectionVariant(
  status: 'connected' | 'degraded' | 'offline',
): 'success' | 'muted' | 'default' {
  if (status === 'connected') return 'success';
  if (status === 'degraded') return 'default';
  return 'muted';
}

/** Slim top bar — context chips only; greeting lives in the hero. */
export function HomeHeader() {
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const qc = useQueryClient();

  const { data, refetch, isFetching } = useQuery({
    queryKey: todayQueryKey(activeWorkspaceId),
    queryFn: () => api.today(operatingContextParams({ workspaceId: activeWorkspaceId })),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: workspaceCtx } = useQuery({
    queryKey: [...queryKeys.workspaces, 'context', activeWorkspaceId],
    queryFn: () => api.workspaceContext(activeWorkspaceId!),
    enabled: Boolean(activeWorkspaceId),
    staleTime: 30_000,
  });

  const { data: sessionData } = useQuery({
    queryKey: queryKeys.focusSession,
    queryFn: api.activeFocusSession,
    staleTime: 30_000,
  });

  const endSession = useMutation({
    mutationFn: (id: string) => api.endFocusSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.focusSession });
      qc.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });

  const workspaceTitle = workspaceCtx?.workspace.title;

  return (
    <header className="pointer-events-auto w-full space-y-3">
      <OnboardingBanner />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/20 px-3 py-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <ModeChip compact />
          {activeWorkspaceId && workspaceTitle ? (
            <Link
              href={homeSectionUrl('workspaces', { workspace: activeWorkspaceId })}
              className="inline-flex max-w-[12rem] truncate rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[11px] text-white/90 hover:border-accent/40"
            >
              {workspaceTitle}
            </Link>
          ) : (
            <Link href={homeSectionUrl('workspaces')} className="text-[11px] text-accent hover:underline">
              Set workspace
            </Link>
          )}
          {sessionData?.session && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-0.5">
              <Focus className="h-3 w-3 text-accent" />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[10px]"
                disabled={endSession.isPending}
                onClick={() => endSession.mutate(sessionData.session!.id)}
              >
                End focus
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {data?.connection && data.connection.status !== 'connected' && (
            <Badge variant={connectionVariant(data.connection.status)}>
              {data.connection.label}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh briefing"
            className="h-8 w-8"
          >
            <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Greeting strip above the Jarvis orb. */
export function HeroGreeting() {
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const { data, isLoading, isError } = useQuery({
    queryKey: todayQueryKey(activeWorkspaceId),
    queryFn: () => api.today(operatingContextParams({ workspaceId: activeWorkspaceId })),
    staleTime: 30_000,
  });

  return (
    <div className="pointer-events-none text-center px-4 mb-1">
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white/95">
        {isLoading ? 'BellasOS' : (data?.greeting ?? 'Good day')}
      </h1>
      <p className="mt-1 text-sm text-white/50 max-w-md mx-auto line-clamp-2">
        {isLoading
          ? 'Initializing command deck…'
          : isError
            ? 'Briefing offline — Jarvis is ready'
            : (data?.contextLine ?? 'Speak or type to begin')}
      </p>
    </div>
  );
}
