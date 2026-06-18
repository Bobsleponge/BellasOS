'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Panel } from './Panel';
import { IntegrationCard } from './IntegrationCard';
import { RequestProgress } from './RequestProgress';

const ACCOUNTS = ['Trust', 'Personal', 'TFSA', 'Crypto', 'Property'];

export function PortfolioPanel() {
  const qc = useQueryClient();
  const [account, setAccount] = useState('Personal');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [costBasis, setCostBasis] = useState('');
  const [price, setPrice] = useState('');
  const { data: holdings } = useQuery({
    queryKey: ['holdings'],
    queryFn: () => api.invoke<Array<Record<string, unknown>>>('bellasos.portfolio', 'holdings.list', {}),
  });
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
      qc.invalidateQueries();
      setSymbol('');
    },
  });
  const del = useMutation({
    mutationFn: (id: string) =>
      api.invoke('bellasos.portfolio', 'holdings.delete', { id }),
    onSuccess: () => qc.invalidateQueries(),
  });
  const analyze = useMutation({
    mutationFn: () => api.invoke<{ analysis: string }>('bellasos.portfolio', 'analyze', {}),
  });
  return (
    <>
      <Panel title="Holdings" subtitle="bellasos.portfolio">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          >
            {ACCOUNTS.map((a) => (
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
      qc.invalidateQueries();
      setSubject('');
    },
  });
  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: () =>
      api.invoke<Array<Record<string, unknown>>>('bellasos.research', 'reports.list', {}),
  });
  const del = useMutation({
    mutationFn: (id: string) => api.invoke('bellasos.research', 'reports.delete', { id }),
    onSuccess: () => qc.invalidateQueries(),
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
        <pre className="mt-3 text-xs bg-panel2 p-3 rounded-lg max-h-64 overflow-auto whitespace-pre-wrap">
          {String(selected.content)}
        </pre>
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
    queryKey: ['sectors'],
    queryFn: () => api.invoke<string[]>('bellasos.intelligence', 'sectors.list', {}),
  });
  const brief = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.intelligence', 'brief.generate', { cadence }),
    onSuccess: () => qc.invalidateQueries(),
  });
  const addSector = useMutation({
    mutationFn: () => api.invoke('bellasos.intelligence', 'sectors.add', { name: sector }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sectors'] });
      setSector('');
    },
  });
  const addAlert = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.intelligence', 'alerts.create', {
        sector: alertSector,
        keyword,
      }),
    onSuccess: () => {
      setKeyword('');
      qc.invalidateQueries();
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
      </div>
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
      <p className="text-xs text-muted mb-2">{(sectors ?? []).join(' · ')}</p>
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
    queryKey: ['automation-status'],
    queryFn: () =>
      api.invoke<{ configured: boolean; message: string }>('bellasos.automation', 'status', {}),
  });
  const { data: devices, refetch, isFetching } = useQuery({
    queryKey: ['automation-devices'],
    queryFn: () =>
      api.invoke<Array<{ entityId: string; name: string; state: string }>>(
        'bellasos.automation',
        'devices.list',
        {},
      ),
    enabled: status?.configured,
  });
  const control = useMutation({
    mutationFn: (p: { entityId: string; action: string }) =>
      api.invoke('bellasos.automation', 'device.control', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-devices'] }),
  });
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
          <ul className="space-y-2 max-h-64 overflow-auto">
            {(devices ?? []).map((d) => (
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
            {!devices?.length && (
              <li className="text-xs text-muted">No devices returned from Home Assistant.</li>
            )}
          </ul>
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(d.ssml);
        window.speechSynthesis.speak(u);
      }
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
    <Panel title="Voice" subtitle="STT / TTS">
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
    queryKey: ['settings', 'bellasos.camera'],
    queryFn: () => api.getModuleSettings('bellasos.camera'),
  });
  const streamUrl = String(settings?.values?.streamUrl ?? '');
  const { data: events } = useQuery({
    queryKey: ['camera-events'],
    queryFn: () =>
      api.invoke<Array<Record<string, unknown>>>('bellasos.camera', 'events.list', {}),
  });
  const ingest = useMutation({
    mutationFn: () =>
      api.invoke('bellasos.camera', 'ingest', {
        camera: 'front',
        kind: 'motion',
        detail: 'Manual test event',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['camera-events'] }),
  });
  return (
    <Panel title="Camera" subtitle="stream + events">
      {streamUrl ? (
        <div className="mb-3 aspect-video bg-black rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={streamUrl} alt="Camera stream" className="w-full h-full object-contain" />
        </div>
      ) : (
        <p className="text-xs text-muted mb-2">Set streamUrl in Settings for live preview.</p>
      )}
      <button
        onClick={() => ingest.mutate()}
        className="text-xs mb-2 px-2 py-1 border border-edge rounded"
      >
        Send test motion event
      </button>
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

export function SocialAccountsPanel() {
  const qc = useQueryClient();
  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: api.getIntegrations,
  });
  const social = integrations?.modules.find((m) => m.moduleId === 'bellasos.social');
  const [platform, setPlatform] = useState('LinkedIn');
  const [token, setToken] = useState('');
  const [account, setAccount] = useState('');
  const connect = useMutation({
    mutationFn: () => api.connectSocial(platform, { accessToken: token, accountName: account }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      setToken('');
    },
  });
  const platforms = ['LinkedIn', 'X', 'Instagram', 'Facebook', 'YouTube', 'TikTok'];
  return (
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
          {platforms.map((p) => (
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
            onClick={() => api.disconnectSocial(platform).then(() => qc.invalidateQueries())}
            className="text-xs px-3 py-2 border border-edge rounded-lg text-muted hover:text-red-400"
          >
            Disconnect
          </button>
        </div>
      </div>
    </Panel>
  );
}
