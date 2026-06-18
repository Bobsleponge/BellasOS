'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type SettingSpec } from '@/lib/api';
import { Panel } from './Panel';

export function SettingsForm({ moduleId }: { moduleId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['settings', moduleId],
    queryFn: () => api.getModuleSettings(moduleId),
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  const save = useMutation({
    mutationFn: () =>
      api.putModuleSettings(moduleId, {
        values: Object.fromEntries(
          Object.entries({ ...(data?.values ?? {}), ...values }).filter(
            ([k]) => !data?.settings.find((s) => s.key === k && (s.secret || s.type === 'secret')),
          ),
        ),
        secrets: Object.fromEntries(Object.entries(secrets).filter(([, v]) => v)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', moduleId] });
      qc.invalidateQueries({ queryKey: ['integrations'] });
      setMsg('Settings saved.');
      setSecrets({});
    },
    onError: (e) => setMsg(`Error: ${(e as Error).message}`),
  });

  const specs = data?.settings ?? [];
  if (specs.length === 0) {
    return (
      <Panel title="Settings" subtitle={moduleId}>
        <p className="text-xs text-muted">No configurable settings for this module.</p>
      </Panel>
    );
  }

  const field =
    'w-full bg-panel2 border border-edge rounded-lg px-3 py-2 text-sm outline-none focus:border-accent';

  return (
    <Panel title="Settings" subtitle={moduleId}>
      <div className="space-y-3">
        {specs.map((s: SettingSpec) => {
          const isSecret = s.secret || s.type === 'secret';
          const masked = data?.maskedSecrets?.[s.key];
          return (
            <div key={s.key}>
              <label className="block text-xs text-muted mb-1">{s.label}</label>
              {s.description && (
                <p className="text-[11px] text-muted mb-1">{s.description}</p>
              )}
              {isSecret ? (
                <>
                  {masked && (
                    <p className="text-xs text-green-400 mb-1">Configured: {masked}</p>
                  )}
                  <input
                    type="password"
                    className={field}
                    placeholder={masked ? 'Enter new token to replace' : 'Paste token / API key'}
                    onChange={(e) =>
                      setSecrets((prev) => ({ ...prev, [s.key]: e.target.value }))
                    }
                  />
                </>
              ) : (
                <input
                  className={field}
                  defaultValue={String(
                    values[s.key] ?? data?.values?.[s.key] ?? s.default ?? '',
                  )}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [s.key]: e.target.value }))
                  }
                />
              )}
            </div>
          );
        })}
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-accent text-bg font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          {save.isPending ? 'Saving...' : 'Save settings'}
        </button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </div>
    </Panel>
  );
}
