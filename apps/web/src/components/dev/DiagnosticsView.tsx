'use client';

import { IntegrationsStrip, ModulesWidget, SystemHealthWidget } from '@/components/SystemWidgets';
import { Panel } from '@/components/Panel';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function DiagnosticsView() {
  const { data: ingest } = useQuery({
    queryKey: queryKeys.ingestStatus,
    queryFn: api.ingestStatus,
    refetchInterval: 60_000,
  });

  const connectors = ingest?.connectors ?? [];
  const active = connectors.filter((c) => c.enabled && (!c.requiresKey || c.configured)).length;

  return (
    <div className="space-y-4">
      <IntegrationsStrip />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SystemHealthWidget />
        <ModulesWidget />
      </div>
      <Panel title="Ingestion health" subtitle="connectors">
        <p className="text-sm text-white mb-2">
          {active} of {connectors.length} connectors active
          {ingest?.lastCollectionAt
            ? ` · last collection ${new Date(ingest.lastCollectionAt).toLocaleString()}`
            : ''}
        </p>
        <ul className="space-y-1 text-xs text-muted">
          {connectors.map((c) => (
            <li key={c.id}>
              {c.name}: {c.enabled ? 'on' : 'off'}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
