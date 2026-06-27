'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Panel } from '@/components/Panel';
import { RunDetailDrawer } from '@/components/RunDetailDrawer';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function LogsView() {
  const [runId, setRunId] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState('');
  const { data: runs } = useQuery({ queryKey: queryKeys.runs, queryFn: api.runs });
  const { data: audit } = useQuery({ queryKey: queryKeys.audit, queryFn: api.audit });
  const selectedRun = runs?.find((r) => r.id === runId) ?? null;

  const filteredAudit = (audit ?? []).filter((a) => {
    if (!auditFilter.trim()) return true;
    const q = auditFilter.toLowerCase();
    return (
      a.action.toLowerCase().includes(q) ||
      a.outcome.toLowerCase().includes(q) ||
      (a.actorId ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Panel title="Agent runs" subtitle="execution log">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {(runs ?? []).slice(0, 30).map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => setRunId(run.id)}
              className="w-full text-left rounded-lg border border-edge bg-panel2/40 px-3 py-2 hover:border-accent/40"
            >
              <p className="text-sm text-white truncate">{run.agentType}</p>
              <p className="text-[10px] text-muted">
                {run.status} · {new Date(run.startedAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Audit log" subtitle="security and governance">
        <input
          value={auditFilter}
          onChange={(e) => setAuditFilter(e.target.value)}
          placeholder="Filter audit…"
          className="w-full mb-3 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        />
        <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-xs">
          {filteredAudit.slice(0, 50).map((entry) => (
            <div key={entry.id} className="border-b border-edge/50 py-2">
              <span className="text-accent">{entry.action}</span>
              <span className="text-muted"> → {entry.outcome}</span>
              <span className="text-muted/70 block mt-0.5">
                {entry.actorId ?? 'system'} · {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {selectedRun && (
        <RunDetailDrawer run={selectedRun} onClose={() => setRunId(null)} />
      )}
    </div>
  );
}
