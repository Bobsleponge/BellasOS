'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function IntegrationCard({
  moduleId,
  name,
  status,
  linkedAccounts,
}: {
  moduleId: string;
  name: string;
  status: string;
  linkedAccounts?: Array<{ platform: string; accountName: string | null; status: string }>;
}) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (enable: boolean) =>
      enable ? api.enableModule(moduleId) : api.disableModule(moduleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.modules });
      qc.invalidateQueries({ queryKey: queryKeys.health });
      qc.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });

  return (
    <div className="bg-panel2 border border-edge rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white">{name}</span>
        <span
          className={`text-xs ${status === 'started' || status === 'enabled' ? 'text-green-400' : 'text-amber-400'}`}
        >
          {status}
        </span>
      </div>
      {linkedAccounts?.length ? (
        <ul className="text-xs text-muted mb-2 space-y-1">
          {linkedAccounts.map((a) => (
            <li key={a.platform}>
              {a.platform}: {a.accountName ?? 'connected'}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        {status !== 'started' && status !== 'enabled' ? (
          <button
            onClick={() => toggle.mutate(true)}
            className="text-xs px-2 py-1 rounded border border-edge text-accent"
          >
            Enable
          </button>
        ) : (
          <button
            onClick={() => toggle.mutate(false)}
            className="text-xs px-2 py-1 rounded border border-edge text-muted hover:text-red-400"
          >
            Disable
          </button>
        )}
      </div>
    </div>
  );
}
