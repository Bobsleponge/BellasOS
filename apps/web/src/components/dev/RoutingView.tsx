'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Panel } from '@/components/Panel';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const STRATEGIES = ['auto', 'local-first', 'cloud-first', 'local-only'] as const;

export function RoutingView() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['routing-strategy'],
    queryFn: api.getRoutingStrategy,
  });

  const save = useMutation({
    mutationFn: (strategy: string) => api.setRoutingStrategy(strategy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routing-strategy'] });
      setDraft(null);
    },
  });

  const strategy = draft ?? data?.strategy ?? 'auto';

  return (
    <div className="space-y-4 max-w-xl">
      <Panel title="AI routing strategy" subtitle="Jarvis model selection">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Controls how Jarvis routes requests between local and cloud models.
            </p>
            <select
              value={strategy}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm text-white"
            >
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => save.mutate(strategy)}
              disabled={save.isPending || strategy === data?.strategy}
              className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : 'Save strategy'}
            </button>
          </div>
        )}
      </Panel>
      <Panel title="Jarvis intent routing" subtitle="reference">
        <p className="text-sm text-muted">
          Jarvis resolves user intent to module actions and specialist agents. Use Logs
          to inspect agent runs and audit entries for routing outcomes.
        </p>
      </Panel>
    </div>
  );
}
