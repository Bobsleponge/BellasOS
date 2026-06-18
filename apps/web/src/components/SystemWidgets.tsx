'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Panel, Stat } from './Panel';

export function SystemHealthWidget() {
  const { data } = useQuery({ queryKey: queryKeys.health, queryFn: api.health });
  return (
    <Panel title="System Health" subtitle="core">
      <div className="flex gap-6 mb-3">
        <Stat label="Status" value={data?.status ?? '...'} />
        <Stat label="Modules" value={String(data?.modules.length ?? 0)} />
        <Stat label="Agents" value={String(data?.agents.length ?? 0)} />
      </div>
      <div className="flex items-center gap-2 text-xs mb-2">
        <span
          className={`h-2 w-2 rounded-full ${data?.db ? 'bg-green-400' : 'bg-amber-400'}`}
        />
        <span className="text-muted">
          Database {data?.db ? 'connected' : 'degraded (in-memory)'}
        </span>
      </div>
      <ul className="text-xs space-y-1 max-h-32 overflow-auto">
        {(data?.modules ?? []).map((m) => (
          <li key={m.id} className="flex justify-between">
            <span className="text-white">{m.id}</span>
            <span
              className={
                m.status === 'enabled' || m.status === 'started'
                  ? 'text-green-400'
                  : 'text-amber-400'
              }
            >
              {m.status}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function ModulesWidget({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: queryKeys.modules, queryFn: api.modules });
  const toggle = useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      enable ? api.enableModule(id) : api.disableModule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.modules });
      qc.invalidateQueries({ queryKey: queryKeys.health });
    },
  });

  return (
    <Panel title="Modules" subtitle="registry">
      <ul className="space-y-1 overflow-auto max-h-64">
        {(data ?? []).map((m) => {
          const enabled = m.status === 'enabled' || m.status === 'started';
          return (
            <li key={m.manifest.id} className="flex items-center gap-2">
              <button
                onClick={() => onNavigate?.(`module:${m.manifest.id}`)}
                className="flex-1 flex justify-between text-xs hover:text-accent"
              >
                <span className="text-white">{m.manifest.name}</span>
                <span className="text-accent2">{m.status}</span>
              </button>
              <button
                onClick={() => toggle.mutate({ id: m.manifest.id, enable: !enabled })}
                className="text-[10px] px-1.5 py-0.5 border border-edge rounded text-muted hover:text-accent"
              >
                {enabled ? 'off' : 'on'}
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function AgentsWidget({
  onNavigate,
  onSelectRun,
}: {
  onNavigate?: (v: string) => void;
  onSelectRun?: (id: string) => void;
}) {
  const { data } = useQuery({ queryKey: queryKeys.runs, queryFn: api.runs });
  return (
    <Panel title="Agent Runs" subtitle="orchestrator">
      <button
        onClick={() => onNavigate?.('agents')}
        className="text-xs text-accent mb-2 hover:underline"
      >
        View all agents →
      </button>
      <ul className="space-y-1 overflow-auto max-h-64">
        {(data ?? []).length === 0 && (
          <li className="text-muted text-xs">No runs yet.</li>
        )}
        {(data ?? []).slice(0, 8).map((r) => (
          <li key={r.id}>
            <button
              onClick={() => onSelectRun?.(r.id)}
              className="w-full flex justify-between text-xs hover:text-accent"
            >
              <span className="text-white">{r.agentType}</span>
              <span
                className={
                  r.status === 'completed'
                    ? 'text-green-400'
                    : r.status === 'failed'
                      ? 'text-red-400'
                      : 'text-amber-400'
                }
              >
                {r.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function AiModelsWidget({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { data } = useQuery({ queryKey: queryKeys.models, queryFn: api.models });
  const enabled = (data ?? []).filter((m) => m.enabled).length;
  return (
    <Panel title="AI Models" subtitle="gateway">
      <button
        onClick={() => onNavigate?.('ai')}
        className="text-xs text-accent mb-2 hover:underline"
      >
        Manage models →
      </button>
      <p className="text-xs text-muted mb-2">
        {enabled} enabled · {(data ?? []).length} total
      </p>
      <ul className="space-y-1 overflow-auto max-h-64">
        {(data ?? []).map((m) => (
          <li key={m.id} className="flex justify-between text-xs">
            <span className="text-white">{m.displayName}</span>
            <span className={m.enabled ? 'text-green-400' : 'text-muted'}>
              {m.enabled ? 'on' : 'off'}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function AuditWidget({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { data } = useQuery({ queryKey: queryKeys.audit, queryFn: api.audit });
  return (
    <Panel title="Audit Log" subtitle="security">
      <button
        onClick={() => onNavigate?.('security')}
        className="text-xs text-accent mb-2 hover:underline"
      >
        Full audit →
      </button>
      <ul className="space-y-1 overflow-auto max-h-64">
        {(data ?? []).length === 0 && (
          <li className="text-muted text-xs">No audit entries yet.</li>
        )}
        {(data ?? []).slice(0, 8).map((a) => (
          <li key={a.id} className="flex justify-between text-xs">
            <span className="text-white truncate">{a.action}</span>
            <span
              className={
                a.outcome === 'ok'
                  ? 'text-green-400'
                  : a.outcome === 'denied'
                    ? 'text-amber-400'
                    : 'text-red-400'
              }
            >
              {a.outcome}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function IntegrationsStrip() {
  const { data } = useQuery({ queryKey: queryKeys.integrations, queryFn: api.getIntegrations });
  const chips = (data?.providers ?? []).slice(0, 6);
  const modules = (data?.modules ?? []).slice(0, 4);
  return (
    <Panel title="Integrations" subtitle="live status">
      <div className="flex flex-wrap gap-2 mb-2">
        {chips.map((p) => (
          <span
            key={p.provider}
            className={`text-xs px-2 py-1 rounded-full border ${
              p.configured
                ? 'border-green-500/40 text-green-400'
                : 'border-edge text-muted'
            }`}
          >
            {p.provider}
          </span>
        ))}
      </div>
      <ul className="text-xs text-muted space-y-1">
        {modules.map((m) => (
          <li key={m.moduleId}>
            {m.name}: {m.status}
            {m.linkedAccounts.length > 0 &&
              ` · ${m.linkedAccounts.length} account(s)`}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
