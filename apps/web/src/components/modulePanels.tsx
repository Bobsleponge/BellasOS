'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { portfolioKeys, queryKeys, socialKeys } from '@/lib/queryKeys';
import { speakText } from '@/lib/speechOutput';
import { Panel } from './Panel';
import { IntegrationCard } from './IntegrationCard';
import { RequestProgress } from './RequestProgress';
import { FinanceInvestmentsSummary } from './FinancePanel';

const ACCOUNTS = ['Trust', 'Personal', 'TFSA', 'Crypto', 'Property'];

export function PortfolioPanel() {
  const qc = useQueryClient();
  const [account, setAccount] = useState('Personal');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [costBasis, setCostBasis] = useState('');
  const [price, setPrice] = useState('');
  const [watchSymbol, setWatchSymbol] = useState('');

  const { data: holdings } = useQuery({
    queryKey: queryKeys.holdings,
    queryFn: () => api.invoke<Array<Record<string, unknown>>>('bellasos.portfolio', 'holdings.list', {}),
  });
  const { data: accounts } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => api.invoke<string[]>('bellasos.portfolio', 'accounts.list', {}),
  });
  const { data: watchlist } = useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: () => api.invoke<string[]>('bellasos.portfolio', 'watchlist.list', {}),
  });
  const { data: summary } = useQuery({
    queryKey: queryKeys.portfolioSummary,
    queryFn: () => api.invoke<Record<string, unknown>>('bellasos.portfolio', 'summary', {}),
  });
  const { data: syncStatus } = useQuery({
    queryKey: queryKeys.portfolioSync,
    queryFn: () =>
      api.invoke<Record<string, unknown>>('bellasos.portfolio', 'sync.status', {}),
  });
  const { data: integrations } = useQuery({
    queryKey: queryKeys.integrations,
    queryFn: api.getIntegrations,
  });

  const [syncUrl, setSyncUrl] = useState('');
  const [syncAppName, setSyncAppName] = useState('');
  const [syncApiKey, setSyncApiKey] = useState('');
  const financeTrackerDefaultUrl =
    process.env.NEXT_PUBLIC_FINANCE_TRACKER_URL ?? 'http://localhost:5000';
  const [ftBaseUrl, setFtBaseUrl] = useState(financeTrackerDefaultUrl);
  const [ftApiKey, setFtApiKey] = useState('');
  const [ftConnectError, setFtConnectError] = useState('');
  const [ftTestSuccess, setFtTestSuccess] = useState('');
  const [connectResult, setConnectResult] = useState<{
    apiKey: string;
    webhookUrl: string;
    exportUrl: string;
  } | null>(null);

  const portfolioIntegration = integrations?.modules.find(
    (m) => m.moduleId === 'bellasos.portfolio',
  );
  const financeTrackerIntegration = integrations?.modules.find(
    (m) => m.moduleId === 'bellasos.finance-tracker',
  );

  const { data: ftConnection, refetch: refetchFtConnection } = useQuery({
    queryKey: queryKeys.financeTrackerConnection,
    queryFn: () =>
      api.invoke<{
        connected?: boolean;
        baseUrl?: string;
        error?: string;
        user?: { email?: string; name?: string };
      }>('bellasos.finance-tracker', 'connection.status', {}),
  });

  const invalidatePortfolio = () => {
    for (const key of portfolioKeys) qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: queryKeys.portfolioSync });
    qc.invalidateQueries({ queryKey: queryKeys.integrations });
    qc.invalidateQueries({ queryKey: queryKeys.financeTrackerConnection });
  };

  const add = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.portfolio', 'holdings.add', {
        account,
        symbol: symbol.toUpperCase(),
        quantity: Number(quantity),
        costBasis: Number(costBasis),
        price: price ? Number(price) : undefined,
      }),
    onSuccess: () => {
      invalidatePortfolio();
      setSymbol('');
    },
  });
  const del = useMutation({
    mutationFn: (id: string) =>
      api.invoke('bellasos.portfolio', 'holdings.delete', { id }),
    onSuccess: invalidatePortfolio,
  });
  const analyze = useMutation({
    mutationFn: () => api.invoke<{ analysis: string }>('bellasos.portfolio', 'analyze', {}),
  });
  const refreshPrices = useMutation({
    mutationFn: () => api.invoke('bellasos.portfolio', 'prices.refresh', {}),
    onSuccess: invalidatePortfolio,
  });
  const addWatch = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.portfolio', 'watchlist.add', { symbol: watchSymbol.toUpperCase() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.watchlist });
      setWatchSymbol('');
    },
  });
  const removeWatch = useMutation({
    mutationFn: (sym: string) =>
      api.invoke('bellasos.portfolio', 'watchlist.remove', { symbol: sym }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.watchlist }),
  });
  const connectExternal = useMutation({
    mutationFn: () =>
      api.connectPortfolio({
        syncUrl,
        appName: syncAppName || 'Financial tracker',
        apiKey: syncApiKey || undefined,
      }),
    onSuccess: (res) => {
      setConnectResult({
        apiKey: res.apiKey,
        webhookUrl: res.webhookUrl,
        exportUrl: res.exportUrl,
      });
      setSyncApiKey('');
      invalidatePortfolio();
    },
  });
  const disconnectExternal = useMutation({
    mutationFn: () => api.disconnectPortfolio(),
    onSuccess: () => {
      setConnectResult(null);
      invalidatePortfolio();
    },
  });
  const syncPull = useMutation({
    mutationFn: () => api.invoke('bellasos.portfolio', 'sync.pull', {}),
    onSuccess: invalidatePortfolio,
  });
  const syncPush = useMutation({
    mutationFn: () => api.invoke('bellasos.portfolio', 'sync.push', {}),
    onSuccess: invalidatePortfolio,
  });
  const connectFinanceTracker = useMutation({
    mutationFn: () =>
      api.connectFinanceTracker({
        baseUrl: ftBaseUrl,
        apiKey: ftApiKey,
      }),
    onSuccess: (res) => {
      setFtConnectError('');
      if (!res.connected) {
        setFtConnectError(res.error ?? 'Connection failed');
        return;
      }
      setFtApiKey('');
      invalidatePortfolio();
      void refetchFtConnection();
    },
    onError: (err: Error) => setFtConnectError(err.message),
  });
  const disconnectFinanceTracker = useMutation({
    mutationFn: () => api.disconnectFinanceTracker(),
    onSuccess: () => {
      setFtConnectError('');
      invalidatePortfolio();
      void refetchFtConnection();
    },
  });
  const testFinanceTracker = useMutation({
    mutationFn: () =>
      api.invoke<{
        connected?: boolean;
        error?: string;
        user?: { email?: string; name?: string };
      }>('bellasos.finance-tracker', 'connection.status', {}),
    onSuccess: (res) => {
      if (!res.connected) {
        setFtTestSuccess('');
        setFtConnectError(res.error ?? 'Connection test failed');
        return;
      }
      setFtConnectError('');
      setFtTestSuccess(
        res.user?.email
          ? `Connection OK — authenticated as ${res.user.email}`
          : 'Connection OK',
      );
    },
    onError: (err: Error) => {
      setFtTestSuccess('');
      setFtConnectError(err.message);
    },
  });

  const accountOptions = accounts?.length ? accounts : ACCOUNTS;
  const syncConnected = Boolean(syncStatus?.connected);
  const ftConnected = Boolean(ftConnection?.connected);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';

  return (
    <>
      <FinanceInvestmentsSummary />

      <Panel title="Finance Tracker" subtitle="Live connection to your Finance-Tracker app">
        <p className="text-xs text-muted mb-3">
          This is the only place you need to connect BellasOS to Finance-Tracker. Generate an API
          key in the Finance app under <strong>Settings → API Keys</strong>, then paste it here.
          Jarvis uses this to read net worth, transactions, and log expenses.
        </p>

        {financeTrackerIntegration?.linkedAccounts?.some(
          (a) => a.platform === 'finance-tracker' && a.status === 'connected',
        ) &&
        !ftConnected ? (
          <p className="text-xs text-amber-400 mb-2">
            Previous connection expired — paste your API key and connect again.
          </p>
        ) : null}

        {ftConnected ? (
          <div className="space-y-2 mb-2">
            <p className="text-xs text-green-400">
              Connected to Finance-Tracker
              {ftConnection?.user?.email ? ` (${ftConnection.user.email})` : ''}
            </p>
            <p className="text-xs text-muted break-all">
              URL: {String(ftConnection?.baseUrl ?? ftBaseUrl)}
            </p>
            {financeTrackerIntegration?.credentials?.apiKey ? (
              <p className="text-xs text-muted">API key saved securely</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => testFinanceTracker.mutate()}
                disabled={testFinanceTracker.isPending}
                className="text-xs px-3 py-1.5 rounded border border-edge text-accent"
              >
                {testFinanceTracker.isPending ? 'Testing…' : 'Test connection'}
              </button>
              <button
                onClick={() => disconnectFinanceTracker.mutate()}
                disabled={disconnectFinanceTracker.isPending}
                className="text-xs px-3 py-1.5 rounded border border-edge text-muted hover:text-red-400"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 mb-2">
            <input
              value={ftBaseUrl}
              onChange={(e) => setFtBaseUrl(e.target.value)}
              placeholder="Finance-Tracker URL"
              className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={ftApiKey}
              onChange={(e) => setFtApiKey(e.target.value)}
              placeholder="API key from Finance app (ft_live_…)"
              type="password"
              autoComplete="off"
              className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => connectFinanceTracker.mutate()}
              disabled={!ftApiKey || connectFinanceTracker.isPending}
              className="text-xs px-3 py-2 border border-edge rounded-lg text-accent w-fit"
            >
              {connectFinanceTracker.isPending ? 'Connecting…' : 'Connect Finance Tracker'}
            </button>
          </div>
        )}

        {ftConnectError ? (
          <p className="text-xs text-red-400 mt-2">{ftConnectError}</p>
        ) : null}
        {ftTestSuccess ? (
          <p className="text-xs text-green-400 mt-2">{ftTestSuccess}</p>
        ) : null}
        {ftConnection?.error && !ftConnected ? (
          <p className="text-xs text-muted mt-2">{ftConnection.error}</p>
        ) : null}
      </Panel>

      <Panel title="External financial app" subtitle="two-way portfolio sync (advanced)">
        {portfolioIntegration?.linkedAccounts?.length ? (
          <ul className="text-xs text-muted mb-2 space-y-1">
            {portfolioIntegration.linkedAccounts.map((a) => (
              <li key={a.platform}>
                {a.accountName ?? a.platform}: {a.status}
              </li>
            ))}
          </ul>
        ) : null}

        {syncConnected ? (
          <div className="space-y-2 mb-2">
            <p className="text-xs text-green-400">
              Connected to {String(syncStatus?.syncAppName ?? 'external app')}
            </p>
            <p className="text-xs text-muted break-all">
              Sync URL: {String(syncStatus?.externalSyncUrl ?? '')}
            </p>
            {syncStatus?.lastPullAt ? (
              <p className="text-xs text-muted">Last pull: {String(syncStatus.lastPullAt)}</p>
            ) : null}
            {syncStatus?.lastPushAt ? (
              <p className="text-xs text-muted">Last push: {String(syncStatus.lastPushAt)}</p>
            ) : null}
            {syncStatus?.lastError ? (
              <p className="text-xs text-red-400">Last error: {String(syncStatus.lastError)}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => syncPull.mutate()}
                disabled={syncPull.isPending}
                className="text-xs px-3 py-1.5 rounded border border-edge text-accent"
              >
                {syncPull.isPending ? 'Syncing…' : 'Pull now'}
              </button>
              <button
                onClick={() => syncPush.mutate()}
                disabled={syncPush.isPending}
                className="text-xs px-3 py-1.5 rounded border border-edge text-accent"
              >
                {syncPush.isPending ? 'Pushing…' : 'Push now'}
              </button>
              <button
                onClick={() => disconnectExternal.mutate()}
                disabled={disconnectExternal.isPending}
                className="text-xs px-3 py-1.5 rounded border border-edge text-muted hover:text-red-400"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 mb-2">
            <input
              value={syncAppName}
              onChange={(e) => setSyncAppName(e.target.value)}
              placeholder="App name (e.g. My Finance Tracker)"
              className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)}
              placeholder="Your app sync URL (GET/POST JSON)"
              className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={syncApiKey}
              onChange={(e) => setSyncApiKey(e.target.value)}
              placeholder="Shared API key (optional — one will be generated)"
              className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => connectExternal.mutate()}
              disabled={!syncUrl || connectExternal.isPending}
              className="text-xs px-3 py-2 border border-edge rounded-lg text-accent w-fit"
            >
              {connectExternal.isPending ? 'Connecting…' : 'Connect app'}
            </button>
          </div>
        )}

        {connectResult ? (
          <div className="text-xs bg-panel2 p-3 rounded-lg space-y-1 mt-2">
            <p className="text-accent">Save this API key in your app — it is shown once:</p>
            <pre className="whitespace-pre-wrap break-all">{connectResult.apiKey}</pre>
            <p className="text-muted mt-2">Push holdings to BellasOS:</p>
            <pre className="whitespace-pre-wrap break-all">
              POST {apiBase}{connectResult.webhookUrl}
            </pre>
            <p className="text-muted mt-2">Pull holdings from BellasOS:</p>
            <pre className="whitespace-pre-wrap break-all">
              GET {apiBase}{connectResult.exportUrl}
            </pre>
            <p className="text-muted mt-2">
              Use header <code>X-BellasOS-Sync-Key: {'<api-key>'}</code> or{' '}
              <code>Authorization: Bearer {'<api-key>'}</code>
            </p>
          </div>
        ) : null}
      </Panel>

      {summary && (
        <Panel title="Portfolio summary" subtitle="allocation">
          <pre className="text-xs bg-panel2 p-3 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </Panel>
      )}

      <Panel title="Accounts" subtitle="bellasos.portfolio">
        <ul className="flex flex-wrap gap-2">
          {accountOptions.map((a) => (
            <li key={a} className="text-xs px-2 py-1 rounded border border-edge text-muted">
              {a}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Watchlist" subtitle="symbols">
        <div className="flex gap-2 mb-2">
          <input
            value={watchSymbol}
            onChange={(e) => setWatchSymbol(e.target.value)}
            placeholder="Symbol"
            className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => addWatch.mutate()}
            disabled={!watchSymbol || addWatch.isPending}
            className="text-xs px-3 py-2 border border-edge rounded-lg text-accent"
          >
            Add
          </button>
          <button
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isPending}
            className="text-xs px-3 py-2 border border-edge rounded-lg text-accent"
          >
            {refreshPrices.isPending ? 'Refreshing…' : 'Refresh prices'}
          </button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {(watchlist ?? []).map((s) => (
            <li key={s} className="text-xs px-2 py-1 rounded border border-edge flex items-center gap-1">
              {s}
              <button onClick={() => removeWatch.mutate(s)} className="text-muted hover:text-red-400">
                ×
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Holdings" subtitle="bellasos.portfolio">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          >
            {accountOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Symbol"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            placeholder="Cost basis"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price override (optional)"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => add.mutate()}
            disabled={!symbol || !costBasis || add.isPending}
            className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            Add / update
          </button>
        </div>
        <ul className="space-y-2 max-h-48 overflow-auto">
          {(holdings ?? []).map((h) => (
            <li key={String(h.id)} className="flex justify-between text-sm border-b border-edge/60 pb-1">
              <span>
                {String(h.symbol)} · {String(h.account)} × {String(h.quantity)}
              </span>
              <button
                onClick={() => del.mutate(String(h.id))}
                className="text-xs text-muted hover:text-red-400"
              >
                delete
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending}
          className="mt-3 text-xs px-3 py-1.5 rounded border border-edge text-accent"
        >
          {analyze.isPending ? 'Analyzing…' : 'Analyze portfolio'}
        </button>
        {analyze.data && (
          <pre className="mt-2 text-xs bg-panel2 p-3 rounded-lg whitespace-pre-wrap text-accent2">
            {analyze.data.analysis}
          </pre>
        )}
      </Panel>
    </>
  );
}

export function ResearchPanel() {
  const qc = useQueryClient();
  const [subject, setSubject] = useState('');
  const [kind, setKind] = useState('company');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const run = useMutation({
    mutationFn: () => api.invoke('bellasos.research', 'run', { subject, kind }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reports });
      setSubject('');
    },
  });
  const { data: reports } = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () =>
      api.invoke<Array<Record<string, unknown>>>('bellasos.research', 'reports.list', {}),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.invoke('bellasos.research', 'reports.delete', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reports }),
  });
  return (
    <Panel title="Research" subtitle="bellasos.research">
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (company, industry, topic)"
          className="flex-1 min-w-[12rem] bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        >
          <option value="company">Company</option>
          <option value="industry">Industry</option>
          <option value="topic">Topic</option>
        </select>
        <button
          onClick={() => run.mutate()}
          disabled={!subject || run.isPending}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {run.isPending ? 'Running…' : 'Run research'}
        </button>
      </div>
      <RequestProgress active={run.isPending} />
      <ul className="space-y-2 max-h-40 overflow-auto">
        {(reports ?? []).map((r) => (
          <li key={String(r.id)} className="text-sm border-b border-edge/60 pb-1">
            <button
              className="text-left w-full hover:text-accent"
              onClick={() => setSelected(r)}
            >
              {String(r.subject)} <span className="text-xs text-muted">({String(r.kind)})</span>
            </button>
            <button
              onClick={() => del.mutate(String(r.id))}
              className="text-xs text-muted hover:text-red-400"
            >
              delete
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-3 bg-panel2 border border-edge rounded-lg p-3 max-h-64 overflow-auto">
          <h4 className="text-sm text-white mb-2">{String(selected.subject)}</h4>
          <div className="text-sm text-accent2 whitespace-pre-wrap prose-invert">
            {String(selected.content ?? selected.report ?? JSON.stringify(selected, null, 2))}
          </div>
        </div>
      )}
    </Panel>
  );
}

export function IntelligencePanel() {
  const qc = useQueryClient();
  const [sector, setSector] = useState('');
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('daily');
  const [alertSector, setAlertSector] = useState('');
  const [keyword, setKeyword] = useState('');
  const { data: sectors } = useQuery({
    queryKey: queryKeys.sectors,
    queryFn: () => api.invoke<string[]>('bellasos.intelligence', 'sectors.list', {}),
  });
  const { data: alerts } = useQuery({
    queryKey: queryKeys.alerts,
    queryFn: () =>
      api.invoke<Array<Record<string, unknown>>>('bellasos.intelligence', 'alerts.list', {}),
  });
  const brief = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.intelligence', 'brief.generate', { cadence }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.briefings }),
  });
  const pollFeeds = useMutation({
    mutationFn: () => api.ingestFeedsPoll(sectors ?? undefined),
  });
  const addSector = useMutation({
    mutationFn: () => api.invoke('bellasos.intelligence', 'sectors.add', { name: sector }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.sectors });
      setSector('');
    },
  });
  const removeSector = useMutation({
    mutationFn: (name: string) => api.invoke('bellasos.intelligence', 'sectors.remove', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sectors }),
  });
  const addAlert = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.intelligence', 'alerts.create', {
        sector: alertSector,
        keyword,
      }),
    onSuccess: () => {
      setKeyword('');
      qc.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
  return (
    <Panel title="Intelligence" subtitle="bellasos.intelligence">
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={cadence}
          onChange={(e) => setCadence(e.target.value as 'daily' | 'weekly')}
          className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        >
          <option value="daily">Daily briefing</option>
          <option value="weekly">Weekly briefing</option>
        </select>
        <button
          onClick={() => brief.mutate()}
          disabled={brief.isPending}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          Generate
        </button>
        <button
          onClick={() => pollFeeds.mutate()}
          disabled={pollFeeds.isPending}
          className="text-xs px-3 py-2 border border-edge rounded-lg text-accent"
        >
          {pollFeeds.isPending ? 'Polling…' : 'Poll news feeds'}
        </button>
      </div>
      {pollFeeds.data && (
        <p className="text-xs text-green-400 mb-2">
          Polled {pollFeeds.data.count} docs across {pollFeeds.data.sectors.join(', ')}
        </p>
      )}
      <RequestProgress active={brief.isPending} />
      <div className="flex gap-2 mb-3">
        <input
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          placeholder="Add custom sector"
          className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => addSector.mutate()}
          disabled={!sector}
          className="text-xs px-3 py-2 border border-edge rounded-lg text-accent"
        >
          Add sector
        </button>
      </div>
      <p className="text-xs text-muted mb-2">
        {(sectors ?? []).map((s) => (
          <span key={s} className="inline-flex items-center gap-1 mr-2">
            {s}
            <button
              onClick={() => removeSector.mutate(s)}
              className="text-muted hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </p>
      {(alerts ?? []).length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-accent uppercase mb-1">Active alerts</p>
          <ul className="text-xs space-y-1">
            {(alerts ?? []).map((a, i) => (
              <li key={i} className="text-muted">
                {String(a.sector)} · {String(a.keyword)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={alertSector}
          onChange={(e) => setAlertSector(e.target.value)}
          placeholder="Alert sector"
          className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Keyword"
          className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => addAlert.mutate()}
          disabled={!alertSector || !keyword}
          className="text-xs px-3 py-2 border border-edge rounded-lg"
        >
          Add alert
        </button>
      </div>
    </Panel>
  );
}

export function AutomationPanel() {
  const qc = useQueryClient();
  const { data: status } = useQuery({
    queryKey: queryKeys.automationStatus,
    queryFn: () =>
      api.invoke<{ configured: boolean; message: string }>('bellasos.automation', 'status', {}),
  });
  const { data: devices, refetch, isFetching } = useQuery({
    queryKey: queryKeys.automationDevices,
    queryFn: () =>
      api.invoke<Array<{ entityId: string; name: string; state: string; area?: string }>>(
        'bellasos.automation',
        'devices.list',
        {},
      ),
    enabled: status?.configured,
  });
  const control = useMutation({
    mutationFn: (p: { entityId: string; action: string }) =>
      api.invoke('bellasos.automation', 'device.control', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.automationDevices }),
  });

  const grouped = (devices ?? []).reduce<
    Record<string, Array<{ entityId: string; name: string; state: string; area?: string }>>
  >((acc, d) => {
    const area = d.area ?? 'Other';
    if (!acc[area]) acc[area] = [];
    acc[area]!.push(d);
    return acc;
  }, {});
  return (
    <Panel title="Devices" subtitle="Home Assistant">
      {!status?.configured && (
        <p className="text-sm text-amber-400 mb-2">{status?.message}</p>
      )}
      {status?.configured && (
        <>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs mb-2 px-2 py-1 border border-edge rounded text-accent"
          >
            {isFetching ? 'Refreshing…' : 'Refresh devices'}
          </button>
          <div className="space-y-4 max-h-64 overflow-auto">
            {Object.entries(grouped).map(([area, list]) => (
              <div key={area}>
                <p className="text-xs text-accent uppercase mb-1">{area}</p>
                <ul className="space-y-2">
                  {(list ?? []).map((d) => (
                    <li key={d.entityId} className="flex justify-between items-center text-sm">
                      <span>
                        {d.name} <span className="text-muted text-xs">({d.state})</span>
                      </span>
                      <div className="flex gap-1">
                        {(['turn_on', 'turn_off', 'toggle'] as const).map((act) => (
                          <button
                            key={act}
                            onClick={() => control.mutate({ entityId: d.entityId, action: act })}
                            className="text-[10px] px-1.5 py-0.5 border border-edge rounded hover:text-accent"
                          >
                            {act.replace('turn_', '')}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!devices?.length && (
              <li className="text-xs text-muted">No devices returned from Home Assistant.</li>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

export function VoicePanel() {
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [listening, setListening] = useState(false);
  const cmd = useMutation({
    mutationFn: () => api.invoke<{ reply: string }>('bellasos.voice', 'command', { transcript }),
    onSuccess: (d) => setReply(d.reply),
  });
  const speak = useMutation({
    mutationFn: (text: string) => api.invoke<{ ssml: string }>('bellasos.voice', 'speak', { text }),
    onSuccess: (d) => {
      speakText(d.ssml.replace(/<[^>]+>/g, ' '));
    },
  });

  function startListen() {
    if (typeof window === 'undefined') return;
    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
        onend: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
        onend: () => void;
        start: () => void;
      };
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setReply('Speech recognition not supported in this browser.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      setTranscript(e.results[0][0].transcript);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  return (
    <Panel title="Voice" subtitle="module STT / TTS">
      <p className="text-xs text-muted mb-2">
        Shell Jarvis uses <code className="text-accent">/jarvis/speak</code> for neural TTS.
        This panel uses the voice module for command routing and SSML-based speak.
      </p>
      <div className="flex gap-2 mb-2">
        <button
          onClick={startListen}
          disabled={listening}
          className="text-xs px-3 py-2 border border-edge rounded-lg text-accent"
        >
          {listening ? 'Listening…' : 'Push to talk'}
        </button>
        <input
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Or type a command"
          className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => cmd.mutate()}
          disabled={!transcript || cmd.isPending}
          className="bg-accent text-bg font-semibold rounded-lg px-3 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
      <RequestProgress active={cmd.isPending} />
      {reply && (
        <div className="text-sm text-accent2 mb-2 whitespace-pre-wrap">{reply}</div>
      )}
      {reply && (
        <button
          onClick={() => speak.mutate(reply)}
          className="text-xs px-2 py-1 border border-edge rounded"
        >
          Speak reply
        </button>
      )}
    </Panel>
  );
}

export function CameraPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: queryKeys.settings('bellasos.camera'),
    queryFn: () => api.getModuleSettings('bellasos.camera'),
  });
  const streamUrl = String(settings?.values?.streamUrl ?? '');
  const [streamError, setStreamError] = useState(false);
  const { data: events } = useQuery({
    queryKey: queryKeys.cameraEvents,
    queryFn: () =>
      api.invoke<Array<Record<string, unknown>>>('bellasos.camera', 'events.list', {}),
  });
  const [ingestMsg, setIngestMsg] = useState('');
  const testIngest = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.camera', 'ingest', {
        camera: 'front',
        kind: 'motion',
        detail: 'Manual test event',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cameraEvents });
      setIngestMsg('Event ingested successfully.');
    },
    onError: (e) => setIngestMsg(`Failed: ${(e as Error).message}`),
  });
  return (
    <Panel title="Camera" subtitle="stream + events">
      {streamUrl && !streamError ? (
        <div className="mb-3 aspect-video bg-black rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={streamUrl}
            alt="Camera stream"
            className="w-full h-full object-contain"
            onError={() => setStreamError(true)}
          />
        </div>
      ) : (
        <p className="text-xs text-amber-400 mb-2">
          {streamUrl
            ? 'Stream URL configured but preview failed — check URL in Settings.'
            : 'Set streamUrl in Settings for live preview.'}
        </p>
      )}
      <button
        onClick={() => testIngest.mutate()}
        className="text-xs mb-2 px-2 py-1 border border-edge rounded"
      >
        Send test motion event
      </button>
      {ingestMsg && <p className="text-xs text-muted mb-2">{ingestMsg}</p>}
      <ul className="space-y-1 max-h-40 overflow-auto text-xs">
        {(events ?? []).map((e, i) => (
          <li key={i} className="flex justify-between">
            <span>{String(e.kind)}</span>
            <span className="text-muted">{String(e.at)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function SocialPanel() {
  const qc = useQueryClient();
  const { data: integrations } = useQuery({
    queryKey: queryKeys.integrations,
    queryFn: api.getIntegrations,
  });
  const { data: platforms } = useQuery({
    queryKey: queryKeys.socialPlatforms,
    queryFn: () => api.invoke<string[]>('bellasos.social', 'platforms.list', {}),
  });
  const { data: drafts } = useQuery({
    queryKey: queryKeys.socialDrafts,
    queryFn: () =>
      api.invoke<Array<Record<string, unknown>>>('bellasos.social', 'drafts.list', {}),
  });
  const { data: analytics } = useQuery({
    queryKey: queryKeys.socialAnalytics,
    queryFn: () => api.invoke<Record<string, unknown>>('bellasos.social', 'analytics', {}),
  });

  const social = integrations?.modules.find((m) => m.moduleId === 'bellasos.social');
  const [platform, setPlatform] = useState('LinkedIn');
  const [token, setToken] = useState('');
  const [account, setAccount] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [scheduleDraftId, setScheduleDraftId] = useState('');
  const [scheduleWhen, setScheduleWhen] = useState('');

  const invalidateSocial = () => {
    for (const key of socialKeys) qc.invalidateQueries({ queryKey: key });
  };

  const connect = useMutation({
    mutationFn: () => api.connectSocial(platform, { accessToken: token, accountName: account }),
    onSuccess: () => {
      invalidateSocial();
      setToken('');
    },
  });
  const createDraft = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.social', 'draft.create', { platform, topic, tone }),
    onSuccess: () => {
      invalidateSocial();
      setTopic('');
    },
  });
  const scheduleDraft = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.social', 'schedule', {
        draftId: scheduleDraftId,
        when: new Date(scheduleWhen).toISOString(),
      }),
    onSuccess: invalidateSocial,
  });
  const publishDraft = useMutation({
    mutationFn: (draftId: string) =>
      api.invoke('bellasos.social', 'publish', { draftId }),
    onSuccess: () => {
      invalidateSocial();
      qc.invalidateQueries({ queryKey: queryKeys.approvals });
    },
  });

  const platformList = platforms ?? ['LinkedIn', 'X', 'Instagram', 'Facebook', 'YouTube', 'TikTok'];

  return (
    <>
      <Panel title="Platforms" subtitle="status">
        <div className="flex flex-wrap gap-2 mb-2">
          {platformList.map((p) => {
            const linked = social?.linkedAccounts.find(
              (a) => a.platform.toLowerCase() === p.toLowerCase(),
            );
            return (
              <span
                key={p}
                className={`text-xs px-2 py-1 rounded border ${
                  linked ? 'border-green-500/40 text-green-400' : 'border-edge text-muted'
                }`}
              >
                {p}
              </span>
            );
          })}
        </div>
      </Panel>

      <Panel title="Social accounts" subtitle="connect / disconnect">
        {social && (
          <IntegrationCard
            moduleId={social.moduleId}
            name={social.name}
            status={social.status}
            linkedAccounts={social.linkedAccounts}
          />
        )}
        <div className="space-y-2 mt-4">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          >
            {platformList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Account name"
            className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="OAuth access token"
            className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => connect.mutate()}
              disabled={!token || connect.isPending}
              className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              Connect
            </button>
            <button
              onClick={() => api.disconnectSocial(platform).then(invalidateSocial)}
              className="text-xs px-3 py-2 border border-edge rounded-lg text-muted hover:text-red-400"
            >
              Disconnect
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Drafts" subtitle="compose · schedule · publish">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          >
            {platformList.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Tone"
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => createDraft.mutate()}
          disabled={!topic || createDraft.isPending}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50 mb-3"
        >
          {createDraft.isPending ? 'Drafting…' : 'Create draft with AI'}
        </button>

        <div className="flex gap-2 mb-3">
          <input
            value={scheduleDraftId}
            onChange={(e) => setScheduleDraftId(e.target.value)}
            placeholder="Draft ID to schedule"
            className="flex-1 bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={scheduleWhen}
            onChange={(e) => setScheduleWhen(e.target.value)}
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => scheduleDraft.mutate()}
            disabled={!scheduleDraftId || !scheduleWhen}
            className="text-xs px-3 py-2 border border-edge rounded-lg"
          >
            Schedule
          </button>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted border-b border-edge">
              <th className="text-left py-1">Platform</th>
              <th className="text-left py-1">Status</th>
              <th className="text-left py-1">Preview</th>
              <th className="text-right py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(drafts ?? []).map((d) => (
              <tr key={String(d.id)} className="border-b border-edge/50">
                <td className="py-1">{String(d.platform)}</td>
                <td className="py-1">{String(d.status)}</td>
                <td className="py-1 truncate max-w-[12rem]">{String(d.content).slice(0, 60)}…</td>
                <td className="py-1 text-right">
                  <button
                    onClick={() => publishDraft.mutate(String(d.id))}
                    disabled={publishDraft.isPending}
                    className="text-accent hover:underline"
                    title="May require approval in Security view"
                  >
                    Publish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {analytics && (
        <Panel title="Analytics" subtitle="engagement">
          <pre className="text-xs bg-panel2 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
            {JSON.stringify(analytics, null, 2)}
          </pre>
        </Panel>
      )}
    </>
  );
}

/** @deprecated use SocialPanel */
export function SocialAccountsPanel() {
  return <SocialPanel />;
}
