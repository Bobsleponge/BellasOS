'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Briefcase, GitBranch, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { homeSectionUrl } from '@/lib/missionRoutes';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';

export function WorkspaceActiveCard({ linkLabel = 'Manage workspace' }: { linkLabel?: string }) {
  const [mounted, setMounted] = useState(false);
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.workspaces, 'context', activeWorkspaceId],
    queryFn: () => api.workspaceContext(activeWorkspaceId!),
    enabled: mounted && Boolean(activeWorkspaceId),
    staleTime: 30_000,
  });

  if (!mounted || !activeWorkspaceId) return null;
  if (isLoading) {
    return (
      <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-white/60">
        Loading active workspace...
      </div>
    );
  }
  if (!data) return null;

  const { workspace, goals, openDecisions, artifacts, activeSession } = data;

  return (
    <section className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-black/30 px-4 py-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-accent">
            <Briefcase className="h-4 w-4 shrink-0" />
            <span className="text-xs uppercase tracking-wider font-medium">Active workspace</span>
          </div>
          <h2 className="text-lg font-semibold text-white mt-1 truncate">{workspace.title}</h2>
          <p className="text-sm text-white/70 mt-0.5 line-clamp-2">{workspace.objective}</p>
          {workspace.progressSummary && (
            <p className="text-xs text-white/50 mt-1">{workspace.progressSummary}</p>
          )}
        </div>
        <Link href={homeSectionUrl('workspaces', { workspace: workspace.id })}>
          <Button variant="outline" size="sm" className="shrink-0">
            {linkLabel}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-center">
        <Stat icon={Target} label="Goals" value={goals.length} />
        <Stat icon={GitBranch} label="Decisions" value={openDecisions.length} />
        <Stat icon={Briefcase} label="Artifacts" value={artifacts.length} />
      </div>

      {goals.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Linked goals</p>
          <ul className="space-y-1">
            {goals.slice(0, 3).map((goal) => (
              <li key={goal.id} className="text-xs text-white/80 truncate">
                - {goal.objective}
              </li>
            ))}
          </ul>
        </div>
      )}

      {openDecisions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">
            Open decisions
          </p>
          <ul className="space-y-1">
            {openDecisions.slice(0, 3).map((decision) => (
              <li key={decision.id} className="text-xs text-white/80 truncate">
                - {decision.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeSession && (
        <p className="text-[10px] text-white/40">
          Focus session active since{' '}
          {new Date(activeSession.startedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2">
      <Icon className="h-3.5 w-3.5 mx-auto text-accent/80" />
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
      <p className="text-[10px] text-white/50 uppercase tracking-wide">{label}</p>
    </div>
  );
}
