'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type NewModel, type ProviderStatus } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Panel } from './Panel';

const PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'ollama',
  'mock',
];

const ENV_KEY: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
  mock: 'none (offline fallback)',
};

function sourceLabel(source?: ProviderStatus['source']): string {
  switch (source) {
    case 'ui':
      return 'saved in AI Studio';
    case 'env':
      return 'from .env (restart API after changes)';
    default:
      return 'not configured';
  }
}

export function AiView() {
  const qc = useQueryClient();
  const {
    data: models,
    isLoading: modelsLoading,
    error: modelsError,
  } = useQuery({ queryKey: queryKeys.models, queryFn: api.models });
  const {
    data: providers,
    isLoading: providersLoading,
    error: providersError,
    refetch: refetchProviders,
  } = useQuery({
    queryKey: queryKeys.providers,
    queryFn: api.providers,
    refetchOnWindowFocus: true,
  });
  const { data: usage } = useQuery({
    queryKey: queryKeys.aiUsage,
    queryFn: () =>
      api.invoke<{
        totalCostUsd: number;
        totalTokens: number;
        byModel: Array<{ model: string; requests: number; total_tokens: number; cost_usd: number }>;
      }>('bellasos.llm', 'usage.summary', {}),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      enabled ? api.disableModel(id) : api.enableModel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.models }),
  });

  const discover = useMutation({
    mutationFn: () => api.discoverModels(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.models });
      qc.invalidateQueries({ queryKey: queryKeys.providers });
    },
  });

  const enabledCount = (models ?? []).filter((m) => m.enabled).length;

  return (
    <div className="space-y-4">
      {usage && (
        <Panel title="Usage summary" subtitle="spend & tokens">
          <div className="flex gap-6 mb-2">
            <div>
              <p className="text-xs text-muted">Total spend</p>
              <p className="text-lg text-white">${usage.totalCostUsd.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Total tokens</p>
              <p className="text-lg text-white">{usage.totalTokens.toLocaleString()}</p>
            </div>
          </div>
          <ul className="text-xs space-y-1 max-h-32 overflow-auto">
            {(usage.byModel ?? []).map((row) => (
              <li key={row.model} className="flex justify-between text-muted">
                <span>{row.model}</span>
                <span>${Number(row.cost_usd).toFixed(4)} · {row.requests} req</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Providers" subtitle="credentials">
        {(providersError || modelsError) && (
          <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {(providersError ?? modelsError)?.message ??
              'Could not reach the BellasOS API. Start it with npm run dev:api.'}
          </p>
        )}
        <div className="flex justify-between items-center mb-2 gap-2">
          <span className="text-xs text-muted">
            {providersLoading
              ? 'Checking providers…'
              : `${enabledCount}/${(models ?? []).length} models enabled`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => refetchProviders()}
              disabled={providersLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-edge text-muted hover:text-accent hover:border-accent disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => discover.mutate()}
              disabled={discover.isPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-edge text-muted hover:text-accent hover:border-accent disabled:opacity-50"
            >
              {discover.isPending ? 'Scanning...' : 'Scan local (Ollama) models'}
            </button>
          </div>
        </div>
        {discover.data && (
          <p className="text-xs text-green-400 mb-2">
            Discovery complete — {discover.data.length} model(s) in registry.
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {(providers ?? []).map((p) => (
            <div
              key={p.provider}
              className="flex items-start gap-2 bg-panel2 border border-edge rounded-lg px-3 py-2"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${p.configured ? 'bg-green-400' : 'bg-muted'}`}
              />
              <div className="min-w-0">
                <div className="text-sm text-white capitalize">{p.provider}</div>
                <div className="text-[11px] text-muted truncate">
                  {p.configured ? sourceLabel(p.source) : ENV_KEY[p.provider] ?? 'set API key'}
                </div>
                {p.configured && p.masked && (
                  <div className="text-[11px] text-slate-500 font-mono truncate">{p.masked}</div>
                )}
              </div>
            </div>
          ))}
          {!providersLoading && (providers ?? []).length === 0 && (
            <p className="col-span-full text-xs text-muted">No provider data — is the API running?</p>
          )}
        </div>
        <p className="text-xs text-muted mt-3">
          Keys saved here are stored in the database and take effect immediately. Keys in{' '}
          <code className="text-accent">.env</code> require an API restart. Ollama uses a base URL
          (default <code className="text-accent">http://localhost:11434</code>).
        </p>
        <ProviderCredentials providers={providers ?? []} />
        <RoutingStrategyPanel />
        <TestCompletionPanel providers={providers ?? []} />
      </Panel>

      <Panel title="Models" subtitle="registry">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-muted border-b border-edge">
                <th className="py-2 pr-3">Model</th>
                <th className="py-2 pr-3">Provider</th>
                <th className="py-2 pr-3">Capabilities</th>
                <th className="py-2 pr-3">Context</th>
                <th className="py-2 pr-3">Cost in/out</th>
                <th className="py-2 pr-3">State</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(models ?? []).map((m) => (
                <tr key={m.id} className="border-b border-edge/50">
                  <td className="py-2 pr-3 text-white">{m.displayName}</td>
                  <td className="py-2 pr-3 text-muted">
                    {m.local ? `${m.provider} (local)` : m.provider}
                  </td>
                  <td className="py-2 pr-3 text-muted text-xs">
                    {m.capabilities.join(', ')}
                  </td>
                  <td className="py-2 pr-3 text-muted">
                    {(m.contextWindow / 1000).toFixed(0)}k
                  </td>
                  <td className="py-2 pr-3 text-muted">
                    ${m.cost.inputPerMTokensUsd}/${m.cost.outputPerMTokensUsd}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={m.enabled ? 'text-green-400' : 'text-muted'}
                    >
                      {m.enabled ? 'enabled' : 'disabled'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() =>
                        toggle.mutate({ id: m.id, enabled: m.enabled })
                      }
                      className="text-xs px-2 py-1 rounded border border-edge text-muted hover:text-accent hover:border-accent"
                    >
                      {m.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {!modelsLoading && !models?.length && (
                <tr>
                  <td colSpan={7} className="py-3 text-muted text-xs">
                    No models registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <AddModelForm />
    </div>
  );
}

function ProviderCredentials({ providers }: { providers: ProviderStatus[] }) {
  const qc = useQueryClient();
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saveMsg, setSaveMsg] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; error?: string; model?: string; provider?: string; sample?: string }>
  >({});

  const statusByProvider = new Map(providers.map((p) => [p.provider, p]));

  const save = useMutation({
    mutationFn: ({ provider, value }: { provider: string; value: string }) =>
      api.setProviderCredential(provider, value),
    onSuccess: (_, { provider }) => {
      setSaveMsg((m) => ({ ...m, [provider]: 'Saved — provider is live now.' }));
      setKeys((k) => ({ ...k, [provider]: '' }));
      qc.invalidateQueries({ queryKey: queryKeys.providers });
      qc.invalidateQueries({ queryKey: queryKeys.models });
      qc.invalidateQueries({ queryKey: queryKeys.integrations });
    },
    onError: (err, { provider }) => {
      setSaveMsg((m) => ({
        ...m,
        [provider]: `Save failed: ${(err as Error).message}`,
      }));
    },
  });
  const clear = useMutation({
    mutationFn: (provider: string) => api.clearProviderCredential(provider),
    onSuccess: (_, provider) => {
      setSaveMsg((m) => ({
        ...m,
        [provider]:
          'UI credential cleared. Keys in .env still apply until removed and the API is restarted.',
      }));
      qc.invalidateQueries({ queryKey: queryKeys.providers });
      qc.invalidateQueries({ queryKey: queryKeys.models });
      qc.invalidateQueries({ queryKey: queryKeys.integrations });
      setTestResults((r) => {
        const next = { ...r };
        delete next[provider];
        return next;
      });
    },
    onError: (err, provider) => {
      setSaveMsg((m) => ({
        ...m,
        [provider]: `Clear failed: ${(err as Error).message}`,
      }));
    },
  });
  const test = useMutation({
    mutationFn: (provider: string) => api.testProvider(provider),
    onSuccess: (data, provider) => {
      setTestResults((r) => ({ ...r, [provider]: data }));
      setSaveMsg((m) => ({ ...m, [provider]: '' }));
    },
    onError: (err, provider) => {
      setTestResults((r) => ({
        ...r,
        [provider]: { ok: false, error: (err as Error).message },
      }));
    },
  });

  const field =
    'flex-1 min-w-[12rem] bg-panel2 border border-edge rounded-lg px-2 py-1.5 text-xs outline-none focus:border-accent';

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-accent uppercase tracking-wide">Connect providers</p>
      {PROVIDERS.filter((p) => p !== 'mock').map((p) => {
        const status = statusByProvider.get(p);
        const configured = status?.configured ?? false;
        const result = testResults[p];
        return (
          <div key={p} className="space-y-1 rounded-lg border border-edge/60 bg-panel/40 p-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-white w-20 capitalize font-medium">{p}</span>
              <span
                className={`text-[10px] uppercase tracking-wide ${configured ? 'text-green-400' : 'text-muted'}`}
              >
                {configured ? sourceLabel(status?.source) : 'not set'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="password"
                className={field}
                value={keys[p] ?? ''}
                placeholder={
                  p === 'ollama'
                    ? 'http://localhost:11434'
                    : configured
                      ? 'Paste new key to replace'
                      : 'Paste API key'
                }
                onChange={(e) => {
                  setKeys((k) => ({ ...k, [p]: e.target.value }));
                  setSaveMsg((m) => ({ ...m, [p]: '' }));
                }}
              />
              <button
                type="button"
                onClick={() => keys[p]?.trim() && save.mutate({ provider: p, value: keys[p]!.trim() })}
                disabled={!keys[p]?.trim() || save.isPending}
                className="text-xs px-2 py-1 rounded border border-edge text-accent disabled:opacity-50"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => test.mutate(p)}
                disabled={!configured || test.isPending}
                title={configured ? 'Send a test completion' : 'Configure this provider first'}
                className="text-xs px-2 py-1 rounded border border-edge text-muted disabled:opacity-40"
              >
                {test.isPending ? 'Testing…' : 'Test'}
              </button>
              <button
                type="button"
                onClick={() => clear.mutate(p)}
                disabled={clear.isPending || status?.source !== 'ui'}
                className="text-xs px-2 py-1 rounded border border-edge text-muted hover:text-red-400 disabled:opacity-40"
              >
                Clear
              </button>
            </div>
            {saveMsg[p] && <p className="text-xs text-muted">{saveMsg[p]}</p>}
            {result && (
              <p className={`text-xs ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
                {result.ok
                  ? `OK — ${result.provider ?? p}/${result.model ?? 'model'}${result.sample ? `: “${result.sample}”` : ''}`
                  : result.error ?? 'Test failed'}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoutingStrategyPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: queryKeys.routing, queryFn: api.getRoutingStrategy });
  const set = useMutation({
    mutationFn: (strategy: string) => api.setRoutingStrategy(strategy),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.routing }),
  });
  const strategies = ['quality', 'cost', 'latency', 'privacy'];
  return (
    <div className="mt-4">
      <p className="text-xs text-accent uppercase tracking-wide mb-2">Routing strategy</p>
      <select
        value={data?.strategy ?? 'quality'}
        onChange={(e) => set.mutate(e.target.value)}
        className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
      >
        {strategies.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

function TestCompletionPanel({ providers }: { providers: ProviderStatus[] }) {
  const [prompt, setPrompt] = useState('Say hello in one word.');
  const [result, setResult] = useState('');
  const openAiReady = providers.some((p) => p.provider === 'openai' && p.configured);
  const run = useMutation({
    mutationFn: () => api.complete(prompt, openAiReady ? 'gpt-4o-mini' : undefined),
    onSuccess: (r) => setResult(`${r.provider}/${r.model}: ${r.text}`),
    onError: (e) => setResult(`Error: ${(e as Error).message}`),
  });
  return (
    <div className="mt-4">
      <p className="text-xs text-accent uppercase tracking-wide mb-2">Test completion</p>
      <p className="text-[11px] text-muted mb-2">
        {openAiReady
          ? 'Pinned to gpt-4o-mini while OpenAI is configured.'
          : 'Uses the routing engine (may pick Ollama or mock when cloud keys are missing).'}
      </p>
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="bg-accent text-bg font-semibold rounded-lg px-3 py-2 text-sm"
        >
          Test
        </button>
      </div>
      {result && <p className="text-xs text-muted mt-2">{result}</p>}
    </div>
  );
}

function AddModelForm() {
  const qc = useQueryClient();
  const [form, setForm] = useState<NewModel>({
    id: '',
    provider: 'openai',
    displayName: '',
    capabilities: ['chat'],
    contextWindow: 128000,
    local: false,
    enabled: true,
    cost: { inputPerMTokensUsd: 0, outputPerMTokensUsd: 0 },
  });
  const [capsText, setCapsText] = useState('chat, reasoning');
  const [msg, setMsg] = useState('');

  const add = useMutation({
    mutationFn: () =>
      api.registerModel({
        ...form,
        capabilities: capsText
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.models });
      setMsg(`Added ${form.id}.`);
      setForm({ ...form, id: '', displayName: '' });
    },
    onError: (e) => setMsg(`Error: ${(e as Error).message}`),
  });

  function set<K extends keyof NewModel>(key: K, value: NewModel[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const field = 'w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <Panel title="Add / register a model" subtitle="how-to">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">Model ID</label>
          <input
            className={field}
            value={form.id}
            onChange={(e) => set('id', e.target.value)}
            placeholder="e.g. gpt-5.1 or my-local-model"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Display name</label>
          <input
            className={field}
            value={form.displayName}
            onChange={(e) => set('displayName', e.target.value)}
            placeholder="e.g. GPT-5.1"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Provider</label>
          <select
            className={field}
            value={form.provider}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                provider: e.target.value,
                local: e.target.value === 'ollama' || e.target.value === 'mock',
              }))
            }
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">
            Capabilities (comma-separated)
          </label>
          <input
            className={field}
            value={capsText}
            onChange={(e) => setCapsText(e.target.value)}
            placeholder="chat, reasoning, vision, tool_use, embedding"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Context window</label>
          <input
            type="number"
            className={field}
            value={form.contextWindow}
            onChange={(e) => set('contextWindow', Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Cost in ($/M)</label>
            <input
              type="number"
              step="0.01"
              className={field}
              value={form.cost.inputPerMTokensUsd}
              onChange={(e) =>
                set('cost', {
                  ...form.cost,
                  inputPerMTokensUsd: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Cost out ($/M)</label>
            <input
              type="number"
              step="0.01"
              className={field}
              value={form.cost.outputPerMTokensUsd}
              onChange={(e) =>
                set('cost', {
                  ...form.cost,
                  outputPerMTokensUsd: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={form.local}
            onChange={(e) => set('local', e.target.checked)}
          />
          Local / privacy-safe
        </label>
        <button
          onClick={() => add.mutate()}
          disabled={add.isPending || !form.id || !form.displayName}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {add.isPending ? 'Adding...' : 'Add model'}
        </button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>

      <p className="text-xs text-muted mt-3">
        The model becomes immediately available to the routing engine. For cloud
        providers, make sure the provider above shows{' '}
        <span className="text-green-400">configured</span> (its API key is set in{' '}
        <code className="text-accent">.env</code>). Without a database, additions
        last until the next restart; with Postgres they persist.
      </p>
    </Panel>
  );
}
