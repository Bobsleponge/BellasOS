'use client';

import { useQuery } from '@tanstack/react-query';
import { api, type WidgetSpec } from '@/lib/api';
import { Panel, Stat } from './Panel';

function useAction<T>(moduleId: string, action?: string) {
  return useQuery<T>({
    queryKey: ['widget', moduleId, action],
    queryFn: () => api.invoke<T>(moduleId, action!, {}),
    enabled: Boolean(action),
  });
}

function Empty({ text }: { text: string }) {
  return <p className="text-muted text-xs">{text}</p>;
}

function AiUsageWidget({ spec }: { spec: WidgetSpec }) {
  const { data } = useAction<{
    totalCostUsd: number;
    totalTokens: number;
    byModel: Array<{ model: string; requests: number; cost_usd: number }>;
  }>(spec.moduleId, spec.dataAction);
  return (
    <div className="space-y-3">
      <div className="flex gap-6">
        <Stat label="Spend (USD)" value={`$${(data?.totalCostUsd ?? 0).toFixed(2)}`} />
        <Stat label="Tokens" value={String(data?.totalTokens ?? 0)} />
      </div>
      <ul className="space-y-1">
        {(data?.byModel ?? []).slice(0, 5).map((m) => (
          <li key={m.model} className="flex justify-between text-xs">
            <span className="text-muted">{m.model}</span>
            <span>${Number(m.cost_usd).toFixed(3)}</span>
          </li>
        ))}
        {!data?.byModel?.length && <Empty text="No usage recorded yet." />}
      </ul>
    </div>
  );
}

function ListWidget({
  spec,
  render,
  empty,
}: {
  spec: WidgetSpec;
  render: (item: any) => React.ReactNode;
  empty: string;
}) {
  const { data } = useAction<any[]>(spec.moduleId, spec.dataAction);
  const items = Array.isArray(data) ? data : [];
  return (
    <ul className="space-y-2 overflow-auto max-h-64">
      {items.length === 0 && <Empty text={empty} />}
      {items.map((item, i) => (
        <li key={i} className="border-b border-edge/60 pb-2">
          {render(item)}
        </li>
      ))}
    </ul>
  );
}

function SourceFooter({ item }: { item: { dataAsOf?: string; sources?: Array<{ title?: string; url?: string }> } }) {
  if (!item.dataAsOf && !item.sources?.length) return null;
  return (
    <div className="text-[10px] text-muted mt-1 space-y-0.5">
      {item.dataAsOf && <div>Data as of {new Date(item.dataAsOf).toLocaleString()}</div>}
      {item.sources?.slice(0, 2).map((s, i) => (
        <div key={i} className="truncate">
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer" className="text-accent2 hover:underline">
              {s.title ?? s.url}
            </a>
          ) : (
            s.title
          )}
        </div>
      ))}
    </div>
  );
}

function ResearchWidget({ spec }: { spec: WidgetSpec }) {
  return (
    <ListWidget
      spec={spec}
      empty="No research reports yet. Ask Jarvis to research a company."
      render={(r) => (
        <div>
          <div className="text-white">{r.subject}</div>
          <div className="text-xs text-muted line-clamp-2">{r.content}</div>
          <SourceFooter item={r} />
        </div>
      )}
    />
  );
}

function IntelligenceWidget({ spec }: { spec: WidgetSpec }) {
  return (
    <ListWidget
      spec={spec}
      empty="No briefings yet."
      render={(b) => (
        <div>
          <div className="text-white capitalize">{b.cadence} briefing</div>
          <div className="text-xs text-muted line-clamp-3">{b.content}</div>
          <SourceFooter item={b} />
        </div>
      )}
    />
  );
}

function PortfolioWidget({ spec }: { spec: WidgetSpec }) {
  const { data } = useAction<{
    total: number;
    allocation: Array<{ account: string; value: number; pct: number }>;
  }>(spec.moduleId, spec.dataAction);
  return (
    <div className="space-y-3">
      <Stat label="Total value" value={`R ${(data?.total ?? 0).toLocaleString()}`} />
      <ul className="space-y-1">
        {(data?.allocation ?? []).map((a) => (
          <li key={a.account} className="text-xs">
            <div className="flex justify-between">
              <span className="text-muted">{a.account}</span>
              <span>{a.pct}%</span>
            </div>
            <div className="h-1.5 bg-edge rounded mt-1">
              <div className="h-1.5 bg-accent rounded" style={{ width: `${a.pct}%` }} />
            </div>
          </li>
        ))}
        {!data?.allocation?.length && <Empty text="Add holdings to see allocation." />}
      </ul>
    </div>
  );
}

function SocialWidget({ spec }: { spec: WidgetSpec }) {
  return (
    <ListWidget
      spec={spec}
      empty="No drafts. Ask Jarvis to draft a post."
      render={(d) => (
        <div>
          <div className="flex justify-between">
            <span className="text-white">{d.platform}</span>
            <span className="text-xs text-accent2">{d.status}</span>
          </div>
          <div className="text-xs text-muted line-clamp-2">{d.content}</div>
        </div>
      )}
    />
  );
}

function AutomationWidget({ spec }: { spec: WidgetSpec }) {
  const { data: status } = useQuery({
    queryKey: ['automation-status'],
    queryFn: () =>
      api.invoke<{ configured: boolean; message: string }>('bellasos.automation', 'status', {}),
  });
  if (status && !status.configured) {
    return <Empty text={status.message} />;
  }
  return (
    <ListWidget
      spec={spec}
      empty="No devices."
      render={(d) => (
        <div className="flex justify-between">
          <span className="text-white">{d.name}</span>
          <span className="text-xs text-muted">{d.state}</span>
        </div>
      )}
    />
  );
}

function CameraWidget({ spec }: { spec: WidgetSpec }) {
  return (
    <ListWidget
      spec={spec}
      empty="No camera events."
      render={(e) => (
        <div className="flex justify-between">
          <span className="text-white">{e.kind}</span>
          <span className="text-xs text-muted">{e.camera}</span>
        </div>
      )}
    />
  );
}

function VoiceWidget() {
  return (
    <div className="text-xs text-muted">
      Wake word <span className="text-accent">jarvis</span>. Use the console
      below to issue commands. Voice capture is wired through the Voice module
      events.
    </div>
  );
}

const REGISTRY: Record<string, (p: { spec: WidgetSpec }) => React.ReactNode> = {
  AiUsageWidget,
  ResearchWidget,
  IntelligenceWidget,
  PortfolioWidget,
  SocialWidget,
  AutomationWidget,
  CameraWidget,
  VoiceWidget: () => <VoiceWidget />,
};

export function ModuleWidget({ spec }: { spec: WidgetSpec }) {
  const Component = REGISTRY[spec.component];
  const span = spec.defaultSize === 'lg' || spec.defaultSize === 'xl' ? 2 : 1;
  return (
    <Panel title={spec.title} subtitle={spec.moduleId} span={span as 1 | 2}>
      {Component ? (
        <Component spec={spec} />
      ) : (
        <Empty text={`No renderer for ${spec.component}`} />
      )}
    </Panel>
  );
}
