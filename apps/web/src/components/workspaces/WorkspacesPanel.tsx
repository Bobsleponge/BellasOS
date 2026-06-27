'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function WorkspacesPanel() {
  const qc = useQueryClient();
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useShellStore((s) => s.setActiveWorkspaceId);
  const setActiveFocusSessionId = useShellStore((s) => s.setActiveFocusSessionId);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: async () => (await api.workspaces()).workspaces,
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

  const archive = useMutation({
    mutationFn: (id: string) => api.archiveWorkspace(id),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workspaces }),
  });

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Workspaces</h2>
        <p className="text-sm text-muted mt-1">
          Objective-centered environments for execution. Activate a workspace to scope Jarvis and Today.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted">Loading…</p>}

      <div className="space-y-2">
        {(data ?? []).map((workspace) => (
          <div
            key={workspace.id}
            className={`rounded-lg border px-4 py-3 ${
              activeWorkspaceId === workspace.id
                ? 'border-accent/40 bg-accent/5'
                : 'border-edge bg-panel2/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{workspace.title}</p>
                <p className="text-xs text-muted mt-1">{workspace.objective}</p>
                <p className="text-[10px] text-muted mt-2">
                  <span className={statusBadge(workspace.status)}>{workspace.status}</span>
                  {' · '}
                  {workspace.type}
                  {' · '}
                  {workspace.goalIds.length} goal{workspace.goalIds.length === 1 ? '' : 's'}
                  {' · '}
                  {workspace.decisionIds.length} decision
                  {workspace.decisionIds.length === 1 ? '' : 's'}
                </p>
                {workspace.progressSummary && (
                  <p className="text-[10px] text-muted/80 mt-1">{workspace.progressSummary}</p>
                )}
              </div>
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
                {workspace.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => gather.mutate(workspace.id)}
                    className="text-[10px] px-2 py-1 rounded border border-edge text-muted hover:text-white"
                  >
                    Gather
                  </button>
                )}
                {workspace.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => archive.mutate(workspace.id)}
                    className="text-[10px] px-2 py-1 rounded border border-edge text-muted hover:text-red-300"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted">
            No workspaces yet. Tell Jarvis &quot;Help me grow Harvi&quot; to create one.
          </p>
        )}
      </div>
    </div>
  );
}
