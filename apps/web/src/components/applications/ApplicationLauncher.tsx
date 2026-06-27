'use client';

import { useQuery } from '@tanstack/react-query';
import { AppIcon } from '@/components/shell/AppIcon';
import { getLauncherApplications } from '@/lib/applications';
import { useConsoleNavigation } from '@/hooks/useConsoleNavigation';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';

type Props = {
  compact?: boolean;
  /** Responsive grid for the command deck (recommended). */
  grid?: boolean;
};

export function ApplicationLauncher({ compact = false, grid = false }: Props) {
  const { navigateToApp } = useConsoleNavigation();
  const apps = getLauncherApplications();
  const { data: health } = useQuery({ queryKey: queryKeys.health, queryFn: api.health });
  const { data: modules } = useQuery({ queryKey: queryKeys.modules, queryFn: api.modules });
  const { data: integrations } = useQuery({
    queryKey: queryKeys.integrations,
    queryFn: api.getIntegrations,
  });

  const moduleStatus = new Map((modules ?? []).map((m) => [m.manifest.id, m.status]));

  function statusForApp(app: ReturnType<typeof getLauncherApplications>[number]): string {
    if (app.requiresConnect) {
      const orgHint = app.id.split('-')[0] ?? '';
      const connected = integrations?.modules?.some((m) =>
        m.linkedAccounts?.some(
          (a) => a.status === 'connected' && a.platform.toLowerCase().includes(orgHint),
        ),
      );
      return connected ? 'enabled' : 'disconnected';
    }

    if (app.id === 'wealth') {
      const ft = moduleStatus.get('bellasos.finance-tracker');
      const portfolio = moduleStatus.get('bellasos.portfolio');
      if (ft === 'enabled' || ft === 'started' || portfolio === 'enabled' || portfolio === 'started') {
        return 'enabled';
      }
    }

    const moduleId = app.moduleIds?.[0] ?? (app.id.startsWith('bellasos.') ? app.id : undefined);
    if (moduleId) {
      return moduleStatus.get(moduleId) ?? 'enabled';
    }

    if (health?.status === 'ok') return 'enabled';
    return 'disconnected';
  }

  const items = apps.map((app) => {
    const status = statusForApp(app);
    const needsConnect = app.requiresConnect && status === 'disconnected';
    return (
      <AppIcon
        key={app.id}
        label={needsConnect ? `${app.label} · Connect` : app.label}
        icon={app.icon}
        status={status}
        compact={compact || grid}
        dock={grid}
        onOpen={() => navigateToApp(app.id)}
      />
    );
  });

  if (grid) {
    return (
      <div
        className={cn(
          'grid w-full gap-x-3 gap-y-4 justify-items-center',
          'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
        )}
      >
        {items}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="pointer-events-auto w-full px-1">
        <div className="glass-panel rounded-2xl border border-white/10 px-4 py-3">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-3">{items}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-full px-2">
      <h2 className="text-xs uppercase tracking-wider text-white/50 mb-3 text-center">
        Applications
      </h2>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-4">{items}</div>
    </div>
  );
}
