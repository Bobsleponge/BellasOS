'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api, type Workspace } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';

function statusBadge(status: Workspace['status']): string {
  switch (status) {
    case 'active':
      return 'text-green-400';
    case 'paused':
      return 'text-amber-400';
    case 'archived':
      return 'text-muted';
    default:
      return 'text-muted';
  }
}

export function WorkspacesTab() {
  const qc = useQueryClient();
  const params = useSearchParams();
  const highlightId = params.get('workspace');
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useShellStore((s) => s.setActiveWorkspaceId);
  const setActiveFocusSessionId = useShellStore((s) => s.setActiveFocusSessionId);
  const [expandedId, setExpandedId] = useState<string | null>(highlightId);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: async () => (await api.workspaces()).workspaces,
  });

  const { data: expandedContext } = useQuery({
    queryKey: [...queryKeys.workspaces, 'context', expandedId],
    queryFn: () => api.workspaceContext(expandedId!),
    enabled: Boolean(expandedId),
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.activateWorkspace(id),
    onSuccess: (result) => {
      setActiveWorkspaceId(result.workspace.id);
      setActiveFocusSessionId(result.session.id);
      qc.invalidateQueries({ queryKey: queryKeys.workspaces });
      qc.invalidateQueries({ queryKey: queryKeys.today });
    },
  });

  const pause = useMutation({
    mutationFn: (id: string) => api.pauseWorkspace(id),
    onSuccess: (_, id) => {
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(null);
        setActiveFocusSessionId(null);
      }
      qc.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });

  const gather = useMutation({
    mutationFn: (id: string) => api.gatherWorkspace(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workspaces });
      if (expandedId) {
        qc.invalidateQueries({ queryKey: [...queryKeys.workspaces, 'context', expandedId] });
      }
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Workspaces</h2>
        <p className="text-sm text-muted mt-1">
          Objective-centered environments — activate to scope Jarvis and Today.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}

      <div className="space-y-2">
        {(data ?? []).map((workspace) => {
          const expanded = expandedId === workspace.id;
          return (
            <div
              key={workspace.id}
              className={`rounded-lg border px-4 py-3 ${
                activeWorkspaceId === workspace.id
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-edge bg-panel2/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 text-left flex-1"
                  onClick={() => setExpandedId(expanded ? null : workspace.id)}
                >
                  <p className="text-sm font-medium text-white">{workspace.title}</p>
                  <p className="text-xs text-muted mt-1">{workspace.objective}</p>
                  <p className="text-[10px] text-muted mt-2">
                    <span className={statusBadge(workspace.status)}>{workspace.status}</span>
                    {' · '}
                    {workspace.goalIds.length} goals · {workspace.decisionIds.length} decisions ·{' '}
                    {workspace.artifactIds.length} artifacts
                  </p>
                </button>
                <div className="flex flex-col gap-1 shrink-0">
                  {workspace.status !== 'active' && workspace.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => activate.mutate(workspace.id)}
                      className="text-[10px] px-2 py-1 rounded border border-accent/40 text-accent hover:bg-accent/10"
                    >
                      Activate
                    </button>
                  )}
                  {workspace.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => pause.mutate(workspace.id)}
                      className="text-[10px] px-2 py-1 rounded border border-edge text-muted hover:text-white"
                    >
                      Pause
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => gather.mutate(workspace.id)}
                    className="text-[10px] px-2 py-1 rounded border border-edge text-muted hover:text-white"
                  >
                    Gather
                  </button>
                </div>
              </div>

              {expanded && expandedContext && expandedContext.workspace.id === workspace.id && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                  {expandedContext.activeSession && (
                    <p className="text-[10px] text-muted">
                      Focus session since{' '}
                      {new Date(expandedContext.activeSession.startedAt).toLocaleString()}
                    </p>
                  )}
                  {expandedContext.goals.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase text-muted mb-1">Goals</p>
                      <ul className="space-y-1">
                        {expandedContext.goals.map((g) => (
                          <li key={g.id} className="text-xs text-white/80">
                            · {g.objective}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {expandedContext.openDecisions.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase text-muted mb-1">Decisions</p>
                      <ul className="space-y-1">
                        {expandedContext.openDecisions.map((d) => (
                          <li key={d.id} className="text-xs text-white/80">
                            · {d.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {expandedContext.artifacts.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase text-muted mb-1">Artifacts</p>
                      <ul className="space-y-1">
                        {expandedContext.artifacts.map((a) => (
                          <li key={a.id} className="text-xs text-white/80">
                            · [{a.kind}] {a.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted">
            No workspaces yet. Tell Jarvis &quot;Help me grow Harvi&quot; to create one.
          </p>
        )}
      </div>
    </div>
  );
}
