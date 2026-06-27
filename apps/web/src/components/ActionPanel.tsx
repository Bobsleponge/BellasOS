'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Panel } from './Panel';

export function ActionPanel({
  moduleId,
  actions,
}: {
  moduleId: string;
  actions: Array<{ name: string; description: string }>;
}) {
  const [selected, setSelected] = useState(actions[0]?.name ?? '');
  const [input, setInput] = useState('{}');
  const [result, setResult] = useState('');

  const run = useMutation({
    mutationFn: async () => {
      let parsed: unknown = {};
      try {
        parsed = input.trim() ? JSON.parse(input) : {};
      } catch {
        throw new Error('Input must be valid JSON.');
      }
      return api.invoke(moduleId, selected, parsed);
    },
    onSuccess: (data) => setResult(JSON.stringify(data, null, 2)),
    onError: (e) => setResult(`Error: ${(e as Error).message}`),
  });

  if (!actions.length) return null;

  return (
    <Panel title="Run action" subtitle="invoke">
      <div className="space-y-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
        >
          {actions.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name} — {a.description}
            </option>
          ))}
        </select>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-xs font-mono"
          placeholder='{"key": "value"}'
        />
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending || !selected}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {run.isPending ? 'Running...' : 'Invoke'}
        </button>
        {result && (
          <pre className="text-xs bg-panel2 border border-edge rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
            {result}
          </pre>
        )}
      </div>
    </Panel>
  );
}
