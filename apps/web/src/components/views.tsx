'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAgentCommand } from '@/hooks/useAgentCommand';
import { Panel, Stat } from './Panel';
import { ModuleWidget } from './widgets';
import { SettingsForm } from './SettingsForm';
import { ModuleActionsPanel } from './ModuleActions';
import { RequestProgress } from './RequestProgress';
import { RunDetailDrawer } from './RunDetailDrawer';
import { AiView } from './AiView';
import {
  AutomationPanel,
  CameraPanel,
  IntelligencePanel,
  PortfolioPanel,
  ResearchPanel,
  SocialPanel,
  VoicePanel,
} from './modulePanels';
import { CodingPanel } from './CodingPanel';
import { FinancePanel } from './FinancePanel';
import {
  SystemHealthWidget,
  ModulesWidget,
  AgentsWidget,
  AiModelsWidget,
  AuditWidget,
  IntegrationsStrip,
} from './SystemWidgets';

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export function OverviewView({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  const [runId, setRunId] = useState<string | null>(null);
  const { data: runs } = useQuery({ queryKey: queryKeys.runs, queryFn: api.runs });
  const selectedRun = runs?.find((r) => r.id === runId) ?? null;

  return (
    <div className="space-y-4">
      <Panel title="Quick actions" subtitle="shortcuts">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('module:bellasos.research')}
            className="text-xs px-3 py-2 rounded-lg border border-edge hover:border-accent text-accent"
          >
            New research
          </button>
          <button
            onClick={() => onNavigate('module:bellasos.social')}
            className="text-xs px-3 py-2 rounded-lg border border-edge hover:border-accent"
          >
            Create draft
          </button>
          <button
            onClick={() => onNavigate('module:bellasos.portfolio')}
            className="text-xs px-3 py-2 rounded-lg border border-edge hover:border-accent"
          >
            Add holding
          </button>
          <button
            onClick={() => onNavigate('agents')}
            className="text-xs px-3 py-2 rounded-lg border border-edge hover:border-accent"
          >
            Run agent
          </button>
        </div>
      </Panel>
      <IntegrationsStrip />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SystemHealthWidget />
        <ModulesWidget onNavigate={onNavigate} />
        <AiModelsWidget onNavigate={onNavigate} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgentsWidget onNavigate={onNavigate} onSelectRun={setRunId} />
        <AuditWidget onNavigate={onNavigate} />
      </div>
      <RunDetailDrawer run={selectedRun} onClose={() => setRunId(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agents                                                             */
/* ------------------------------------------------------------------ */

function extractResponse(data: unknown): string {
  const out = (data as { output?: Record<string, unknown> })?.output ?? data;
  if (out && typeof out === 'object') {
    const o = out as Record<string, any>;
    const text =
      o.response ??
      o.report?.content ??
      o.briefing?.content ??
      o.draft ??
      o.result ??
      o.analysis ??
      o.summary;
    if (typeof text === 'string') return text;
  }
  return JSON.stringify(out, null, 2);
}

export function AgentsView() {
  const qc = useQueryClient();
  const { data: agents } = useQuery({ queryKey: queryKeys.agents, queryFn: api.agents });
  const { data: runs } = useQuery({ queryKey: queryKeys.runs, queryFn: api.runs });
  const [agentName, setAgentName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState('');

  const selected = agentName || agents?.[0]?.name || '';
  const selectedRun = runs?.find((r) => r.id === runId) ?? null;
  const filteredRuns = (runs ?? []).filter(
    (r) => !agentFilter || r.agentType === agentFilter,
  );

  const run = useAgentCommand();

  const remove = useMutation({
    mutationFn: (name: string) => api.removeAgent(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents }),
  });

  function handleRun() {
    run.mutate(
      { agentType: selected, prompt },
      {
        onSuccess: (data) => setResult(extractResponse(data)),
        onError: (err) =>
          setResult(
            (err as Error).name === 'AbortError'
              ? 'Error: Request timed out after 120s.'
              : `Error: ${(err as Error).message}`,
          ),
      },
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Talk to an agent */}
      <Panel title="Talk to an agent" subtitle="natural language">
        <div className="space-y-2">
          <label className="block text-xs text-muted">Agent</label>
          <select
            value={selected}
            onChange={(e) => setAgentName(e.target.value)}
            className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {(agents ?? []).map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
                {a.dynamic ? ' (custom)' : ''}
              </option>
            ))}
          </select>
          <label className="block text-xs text-muted">What should it do?</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. Research a company's competitive position and key risks"
            className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={handleRun}
            disabled={run.isPending || !selected || !prompt.trim()}
            className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            {run.isPending ? 'Thinking...' : 'Send'}
          </button>
          <RequestProgress active={run.isPending} />
          {result && (
            <div className="mt-2 text-sm bg-panel2 border border-edge rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap text-accent2">
              {result}
            </div>
          )}
        </div>
      </Panel>

      {/* Create a new agent */}
      <CreateAgentPanel />

      {/* Agent roster */}
      <Panel title="Agents" subtitle="orchestrator">
        <ul className="space-y-2">
          {(agents ?? []).map((a) => (
            <li
              key={a.name}
              className="flex items-start justify-between border-b border-edge/60 pb-2"
            >
              <div className="min-w-0">
                <div className="text-sm text-white flex items-center gap-2">
                  {a.name}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      a.dynamic
                        ? 'bg-accent/15 text-accent'
                        : 'bg-panel2 text-muted'
                    }`}
                  >
                    {a.dynamic ? 'custom' : 'built-in'}
                  </span>
                </div>
                {a.role && (
                  <p className="text-xs text-muted line-clamp-2">{a.role}</p>
                )}
              </div>
              {a.dynamic && (
                <button
                  onClick={() => {
                    if (confirm(`Remove agent "${a.name}"?`)) remove.mutate(a.name);
                  }}
                  className="text-xs text-muted hover:text-red-400 shrink-0 ml-2"
                >
                  remove
                </button>
              )}
            </li>
          ))}
          {!agents?.length && <li className="text-muted text-xs">None.</li>}
        </ul>
      </Panel>

      <Panel title="Run history" subtitle="click for details">
        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="w-full mb-2 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All agents</option>
          {(agents ?? []).map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
        <ul className="space-y-1 max-h-48 overflow-auto">
          {filteredRuns.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setRunId(r.id)}
                className="w-full flex justify-between text-xs hover:text-accent"
              >
                <span className="text-white">{r.agentType}</span>
                <span className="text-muted">{r.status}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <AgentsWidget />
      <RunDetailDrawer run={selectedRun} onClose={() => setRunId(null)} />
    </div>
  );
}

function CreateAgentPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [msg, setMsg] = useState('');

  const create = useMutation({
    mutationFn: () => api.createAgent({ name, role }),
    onSuccess: (info) => {
      qc.invalidateQueries({ queryKey: queryKeys.agents });
      setMsg(`Created "${info.name}". It's ready to use now.`);
      setName('');
      setRole('');
    },
    onError: (err) => setMsg(`Error: ${(err as Error).message}`),
  });

  return (
    <Panel title="Create an agent" subtitle="no code, no restart">
      <div className="space-y-2">
        <label className="block text-xs text-muted">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. legal-reviewer"
          className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <label className="block text-xs text-muted">
          Role / instructions (plain language)
        </label>
        <textarea
          value={role}
          onChange={(e) => setRole(e.target.value)}
          rows={4}
          placeholder="Describe what this agent is and how it should behave. e.g. You are a contract reviewer. Summarise risks, flag unusual clauses, and suggest edits."
          className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !name.trim() || !role.trim()}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {create.isPending ? 'Creating...' : 'Create agent'}
        </button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
        <p className="text-xs text-muted">
          New agents are LLM-driven: their role becomes the system prompt, and you
          talk to them in plain language. Built-in agents understand natural
          language too.
        </p>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Security & Audit                                                   */
/* ------------------------------------------------------------------ */

export function SecurityView() {
  const qc = useQueryClient();
  const [auditFilter, setAuditFilter] = useState('');
  const [reason, setReason] = useState('');
  const { data: approvals } = useQuery({
    queryKey: queryKeys.approvals,
    queryFn: api.approvals,
  });
  const { data: audit } = useQuery({ queryKey: queryKeys.audit, queryFn: api.audit });
  const { data: notifications } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: api.notifications,
  });

  const resolve = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: 'approved' | 'rejected';
    }) => api.resolveApproval(id, decision, reason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.approvals });
      qc.invalidateQueries({ queryKey: queryKeys.audit });
      qc.invalidateQueries({ queryKey: queryKeys.modules });
      setReason('');
    },
  });

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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Panel title="Pending Approvals" subtitle="governance">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason for approve/reject"
          className="w-full mb-3 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        />
        <ul className="space-y-2">
          {(approvals ?? []).length === 0 && (
            <li className="text-muted text-xs">Nothing awaiting approval.</li>
          )}
          {(approvals ?? []).map((a) => (
            <li key={a.id} className="border-b border-edge/60 pb-2">
              <div className="text-sm text-white">
                {a.moduleId} — {a.action}
              </div>
              <div className="text-xs text-muted mb-1">
                {a.status} · {a.requestedBy ?? 'unknown'} ·{' '}
                {new Date(a.createdAt).toLocaleString()}
              </div>
              {a.input != null && (
                <pre className="text-[10px] bg-panel2 p-2 rounded mb-2 overflow-auto max-h-24">
                  {JSON.stringify(a.input, null, 2)}
                </pre>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => resolve.mutate({ id: a.id, decision: 'approved' })}
                  className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400"
                >
                  Approve
                </button>
                <button
                  onClick={() => resolve.mutate({ id: a.id, decision: 'rejected' })}
                  className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Notifications" subtitle="read-only">
        <p className="text-[11px] text-muted mb-2">
          Notifications are system-generated and read-only until mark-read API is added.
        </p>
        <ul className="space-y-2 max-h-64 overflow-auto">
          {(notifications ?? []).length === 0 && (
            <li className="text-muted text-xs">No notifications.</li>
          )}
          {(notifications ?? []).map((n) => (
            <li key={n.id} className="border-b border-edge/60 pb-2 text-sm">
              <div className="text-white">{n.title}</div>
              <div className="text-xs text-muted">{n.body}</div>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="xl:col-span-2">
        <Panel title="Audit log" subtitle="filterable">
          <input
            value={auditFilter}
            onChange={(e) => setAuditFilter(e.target.value)}
            placeholder="Filter by action, outcome, or actor"
            className="w-full mb-3 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <ul className="space-y-2 max-h-96 overflow-auto">
            {filteredAudit.map((a) => (
              <li key={a.id} className="border-b border-edge/60 pb-2 text-xs">
                <div className="flex justify-between text-white">
                  <span>{a.action}</span>
                  <span>{a.outcome}</span>
                </div>
                <div className="text-muted">
                  {a.actorId ?? 'system'} · {new Date(a.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Module detail                                                      */
/* ------------------------------------------------------------------ */

export function ModuleDetailView({
  moduleId,
  initialProjectId,
}: {
  moduleId: string;
  initialProjectId?: string | null;
}) {
  const qc = useQueryClient();
  const { data: modules } = useQuery({ queryKey: queryKeys.modules, queryFn: api.modules });
  const { data: widgets } = useQuery({ queryKey: queryKeys.widgets, queryFn: api.widgets });
  const mod = modules?.find((m) => m.manifest.id === moduleId);
  const moduleWidgets = (widgets ?? []).filter((w) => w.moduleId === moduleId);

  const invalidateModule = () => {
    qc.invalidateQueries({ queryKey: queryKeys.modules });
    qc.invalidateQueries({ queryKey: queryKeys.widgets });
  };

  if (moduleId === 'bellasos.llm') return <AiView />;

  if (!mod) return <p className="text-muted text-sm">Loading module...</p>;

  return (
    <div className="space-y-4">
      <Panel title={mod.manifest.name} subtitle={`v${mod.manifest.version}`}>
        <p className="text-sm text-muted mb-3">{mod.manifest.description}</p>
        <div className="flex gap-6">
          <Stat label="Status" value={mod.status} />
          <Stat label="Actions" value={String(mod.manifest.actions.length)} />
          <Stat label="Widgets" value={String(moduleWidgets.length)} />
        </div>
      </Panel>

      {moduleWidgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleWidgets.map((w) => (
            <ModuleWidget key={`${w.moduleId}:${w.id}`} spec={w} />
          ))}
        </div>
      )}

      {moduleId === 'bellasos.portfolio' && <PortfolioPanel />}
      {moduleId === 'bellasos.finance' && <FinancePanel />}
      {moduleId === 'bellasos.research' && <ResearchPanel />}
      {moduleId === 'bellasos.intelligence' && <IntelligencePanel />}
      {moduleId === 'bellasos.automation' && <AutomationPanel />}
      {moduleId === 'bellasos.social' && <SocialPanel />}
      {moduleId === 'bellasos.voice' && <VoicePanel />}
      {moduleId === 'bellasos.camera' && <CameraPanel />}
      {moduleId === 'bellasos.coding' && <CodingPanel initialProjectId={initialProjectId} />}

      {moduleId !== 'bellasos.coding' && (
        <>
          <SettingsForm moduleId={moduleId} />
          <ModuleActionsPanel
            moduleId={moduleId}
            actions={mod.manifest.actions}
            onInvalidate={invalidateModule}
          />
        </>
      )}
    </div>
  );
}
