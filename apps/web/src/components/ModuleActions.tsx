'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ActionFieldSpec } from '@/lib/actionSchemas';
import {
  getActionFields as getFields,
  NO_INPUT_ACTIONS as NO_INPUT,
  WORKER_ONLY_ACTIONS as WORKER_ONLY,
} from '@/lib/actionSchemas';
import { Panel } from './Panel';

function buildInitialValues(fields: ActionFieldSpec[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (f.defaultValue !== undefined) out[f.key] = String(f.defaultValue);
    else out[f.key] = '';
  }
  return out;
}

function parseValues(
  fields: ActionFieldSpec[],
  raw: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = raw[f.key]?.trim() ?? '';
    if (!v) {
      if (f.required) throw new Error(`${f.label} is required.`);
      continue;
    }
    if (f.type === 'number') out[f.key] = Number(v);
    else if (f.type === 'boolean') out[f.key] = v === 'true' || v === '1';
    else out[f.key] = v;
  }
  return out;
}

export function ActionForm({
  moduleId,
  actionName,
  description,
  fields,
  onSuccess,
}: {
  moduleId: string;
  actionName: string;
  description: string;
  fields: ActionFieldSpec[];
  onSuccess?: () => void;
}) {
  const [values, setValues] = useState(() => buildInitialValues(fields));
  const [result, setResult] = useState('');

  const run = useMutation({
    mutationFn: async () => {
      const parsed = parseValues(fields, values);
      return api.invoke(moduleId, actionName, parsed);
    },
    onSuccess: (data) => {
      setResult(JSON.stringify(data, null, 2));
      onSuccess?.();
    },
    onError: (e) => setResult(`Error: ${(e as Error).message}`),
  });

  const fieldClass =
    'w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <div className="border border-edge/60 rounded-lg p-3 space-y-2">
      <div>
        <p className="text-sm text-white font-medium">{actionName}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs text-muted mb-1">
              {f.label}
              {f.required ? ' *' : ''}
            </label>
            {f.type === 'enum' && f.options ? (
              <select
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className={fieldClass}
              >
                {!f.required && <option value="">—</option>}
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === 'boolean' ? (
              <select
                value={values[f.key] ?? 'true'}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className={fieldClass}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'datetime' ? 'datetime-local' : 'text'}
                value={values[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className={fieldClass}
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => run.mutate()}
        disabled={run.isPending}
        className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
      >
        {run.isPending ? 'Running…' : 'Run'}
      </button>
      {result && (
        <pre className="text-xs bg-panel2 border border-edge rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}

export function ModuleActionsPanel({
  moduleId,
  actions,
  onInvalidate,
}: {
  moduleId: string;
  actions: Array<{ name: string; description: string }>;
  onInvalidate?: () => void;
}) {
  const [showDev, setShowDev] = useState(false);
  const [devAction, setDevAction] = useState(actions[0]?.name ?? '');
  const [devInput, setDevInput] = useState('{}');
  const [devResult, setDevResult] = useState('');

  const visibleActions = actions.filter(
    (a) => !WORKER_ONLY.has(`${moduleId}:${a.name}`),
  );

  const devRun = useMutation({
    mutationFn: async () => {
      let parsed: unknown = {};
      try {
        parsed = devInput.trim() ? JSON.parse(devInput) : {};
      } catch {
        throw new Error('Input must be valid JSON.');
      }
      return api.invoke(moduleId, devAction, parsed);
    },
    onSuccess: (data) => setDevResult(JSON.stringify(data, null, 2)),
    onError: (e) => setDevResult(`Error: ${(e as Error).message}`),
  });

  const noInputRun = useMutation({
    mutationFn: (actionName: string) => api.invoke(moduleId, actionName, {}),
    onSuccess: (data, actionName) => {
      setDevResult(`${actionName}:\n${JSON.stringify(data, null, 2)}`);
      onInvalidate?.();
    },
    onError: (e) => setDevResult(`Error: ${(e as Error).message}`),
  });

  return (
    <Panel title="Actions" subtitle={moduleId}>
      <div className="space-y-3">
        {visibleActions.map((a) => {
          const key = `${moduleId}:${a.name}`;
          const fields = getFields(moduleId, a.name);
          if (fields.length > 0) {
            return (
              <ActionForm
                key={a.name}
                moduleId={moduleId}
                actionName={a.name}
                description={a.description}
                fields={fields}
                onSuccess={onInvalidate}
              />
            );
          }
          if (NO_INPUT.has(key)) {
            return (
              <div key={a.name} className="flex items-center justify-between border border-edge/60 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm text-white">{a.name}</p>
                  <p className="text-xs text-muted">{a.description}</p>
                </div>
                <button
                  onClick={() => noInputRun.mutate(a.name)}
                  disabled={noInputRun.isPending}
                  className="text-xs px-3 py-1.5 rounded border border-edge text-accent hover:border-accent disabled:opacity-50"
                >
                  Run
                </button>
              </div>
            );
          }
          return null;
        })}
      </div>

      {devResult && (
        <pre className="mt-3 text-xs bg-panel2 border border-edge rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
          {devResult}
        </pre>
      )}

      <button
        onClick={() => setShowDev((v) => !v)}
        className="mt-3 text-xs text-muted hover:text-accent"
      >
        {showDev ? 'Hide developer invoke' : 'Developer JSON invoke'}
      </button>
      {showDev && (
        <div className="mt-2 space-y-2">
          <select
            value={devAction}
            onChange={(e) => setDevAction(e.target.value)}
            className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm"
          >
            {visibleActions.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
          <textarea
            value={devInput}
            onChange={(e) => setDevInput(e.target.value)}
            rows={3}
            className="w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={() => devRun.mutate()}
            disabled={devRun.isPending}
            className="text-xs px-3 py-1.5 rounded border border-edge"
          >
            Invoke raw JSON
          </button>
        </div>
      )}
    </Panel>
  );
}
