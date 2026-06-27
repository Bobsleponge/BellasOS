'use client';

import { useQuery } from '@tanstack/react-query';
import { Panel } from '@/components/Panel';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function EventsView() {
  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.notifications,
    refetchInterval: 30_000,
  });
  const { data: ingest } = useQuery({
    queryKey: queryKeys.ingestStatus,
    queryFn: api.ingestStatus,
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-4">
      <Panel title="Platform notifications" subtitle="event stream">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {(notifications ?? []).length === 0 ? (
            <p className="text-sm text-muted">No notifications.</p>
          ) : (
            (notifications ?? []).map((n) => (
              <div key={n.id} className="rounded-lg border border-edge bg-panel2/40 px-3 py-2">
                <p className="text-sm text-white">{n.title}</p>
                {n.body && <p className="text-xs text-muted mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-muted mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </Panel>
      <Panel title="Ingestion connectors" subtitle="data events">
        <div className="space-y-2">
          {(ingest?.connectors ?? []).map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between text-sm border border-edge rounded-lg px-3 py-2"
            >
              <span className="text-white">{c.name}</span>
              <span className="text-xs text-muted">
                {c.enabled ? 'enabled' : 'disabled'}
                {c.requiresKey && !c.configured ? ' · needs key' : ''}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
