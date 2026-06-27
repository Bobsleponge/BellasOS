'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { hydrateShellFromStorage, useShellStore } from '@/stores/shellStore';

let bootstrapStarted = false;

/**
 * Sync active workspace and focus session from the server on shell load.
 */
export function useWorkspaceBootstrap() {
  const qc = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current || bootstrapStarted) return;
    ranRef.current = true;
    bootstrapStarted = true;

    hydrateShellFromStorage();

    let cancelled = false;

    void (async () => {
      try {
        const [{ session }, workspacesRes] = await Promise.all([
          api.activeFocusSession(),
          api.workspaces({ status: 'active' }),
        ]);

        if (cancelled) return;

        const activeWorkspaces = workspacesRes.workspaces.filter((w) => w.status === 'active');
        const store = useShellStore.getState();
        let workspaceChanged = false;

        if (session?.workspaceId) {
          if (store.activeFocusSessionId !== session.id) {
            store.setActiveFocusSessionId(session.id);
          }
          if (store.activeWorkspaceId !== session.workspaceId) {
            store.setActiveWorkspaceId(session.workspaceId);
            workspaceChanged = true;
          }
        } else if (!store.activeWorkspaceId && activeWorkspaces.length === 1) {
          store.setActiveWorkspaceId(activeWorkspaces[0]!.id);
          workspaceChanged = true;
        } else if (!store.activeWorkspaceId && activeWorkspaces.length > 0) {
          const newest = [...activeWorkspaces].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )[0];
          if (newest) {
            store.setActiveWorkspaceId(newest.id);
            workspaceChanged = true;
          }
        }

        if (workspaceChanged) {
          qc.invalidateQueries({ queryKey: queryKeys.today });
          qc.invalidateQueries({ queryKey: queryKeys.workspaces });
        }
      } catch {
        /* shell still usable without bootstrap */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [qc]);
}
