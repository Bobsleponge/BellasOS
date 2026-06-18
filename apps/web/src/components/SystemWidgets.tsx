'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Panel, Stat } from './Panel';

export function SystemHealthWidget() {
  const { data } = useQuery({ queryKey: ['health'], queryFn: api.health });
  return (
    <Panel title="System Health" subtitle="core">
      <div className="flex gap-6 mb-3">
        <Stat label="Status" value={data?.status ?? '...'} />
        <Stat label="Modules" value={String(data?.modules.length ?? 0)} />
        <Stat label="Agents" value={String(data?.agents.length ?? 0)} />
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span
          className={`h-2 w-2 rounded-full ${data?.db ? 'bg-green-400' : 'bg-amber-400'}`}
        />
        <span className="text-muted">
          Database {data?.db ? 'connected' : 'degraded (in-memory)'}
        </span>
      </div>
    </Panel>
  );
}

export function ModulesWidget({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { data } = useQuery({ queryKey: ['modules'], queryFn: api.modules });
  return (
    <Panel title="Modules" subtitle="registry">
      <ul className="space-y-1 overflow-auto max-h-64">
        {(data ?? []).map((m) => (
          <li key={m.manifest.id}>
            <button
              onClick={() => onNavigate?.(`module:${m.manifest.id}`)}
              className="w-full flex justify-between text-xs hover:text-accent"
            >
              <span className="text-white">{m.manifest.name}</span>
              <span className="text-accent2">{m.status}</span>
            </button>
          </li>
        ))}
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
  const { data } = useQuery({ queryKey: ['runs'], queryFn: api.runs });
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
  const { data } = useQuery({ queryKey: ['models'], queryFn: api.models });
  return (
    <Panel title="AI Models" subtitle="gateway">
      <button
        onClick={() => onNavigate?.('ai')}
        className="text-xs text-accent mb-2 hover:underline"
      >
        Manage models →
      </button>
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
  const { data } = useQuery({ queryKey: ['audit'], queryFn: api.audit });
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
  const { data } = useQuery({ queryKey: ['integrations'], queryFn: api.getIntegrations });
  const chips = (data?.providers ?? []).slice(0, 6);
  return (
    <Panel title="Integrations" subtitle="live status">
      <div className="flex flex-wrap gap-2">
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
    </Panel>
  );
}
