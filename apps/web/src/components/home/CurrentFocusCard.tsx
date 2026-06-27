'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Focus } from 'lucide-react';
import { ModeChip } from '@/components/mission/ModeChip';
import { WorkspaceActiveCard } from '@/components/workspaces/WorkspaceActiveCard';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { currentRhythm } from '@/lib/jarvisRhythm';
import { homeSectionUrl } from '@/lib/missionRoutes';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';

function rhythmLabel(): string {
  const rhythm = currentRhythm();
  if (rhythm === 'morning') return 'Morning';
  if (rhythm === 'midday') return 'Execution';
  if (rhythm === 'evening') return 'Synthesis';
  return 'Night';
}

export function CurrentFocusCard() {
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const qc = useQueryClient();

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

  return (
    <section id="focus" className="scroll-mt-24 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs uppercase tracking-wider text-white/50">Current focus</h2>
        <div className="flex items-center gap-2">
          <ModeChip compact />
          <span className="text-[10px] uppercase tracking-wider text-accent">{rhythmLabel()}</span>
        </div>
      </div>

      {activeWorkspaceId ? (
        <WorkspaceActiveCard linkLabel="Manage workspace" />
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
          No active workspace. Tell Jarvis to focus on a venture or{' '}
          <Link href={homeSectionUrl('workspaces')} className="text-accent underline">
            activate one
          </Link>
          .
        </div>
      )}

      {sessionData?.session && (
        <div className="rounded-lg border border-edge bg-panel2/40 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Focus className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">Focus session</p>
              <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Active since{' '}
                {new Date(sessionData.session.startedAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={endSession.isPending}
            onClick={() => endSession.mutate(sessionData.session!.id)}
          >
            End session
          </Button>
        </div>
      )}
    </section>
  );
}
