'use client';

import { Suspense, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useShellStore } from '@/stores/shellStore';
import { JarvisConsole } from './JarvisConsole';
import {
  OverviewView,
  AgentsView,
  SecurityView,
  ModuleDetailView,
} from './views';
import { HIDDEN_CONSOLE_MODULES } from '@/lib/navigation';
import { AiView } from './AiView';

type View = string;

const SYSTEM_NAV: Array<{ key: View; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'ai', label: 'AI & LLMs' },
  { key: 'agents', label: 'Agents' },
  { key: 'security', label: 'Security & Audit' },
];

function NavItem({
  label,
  active,
  onClick,
  dot,
  trailing,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onClick}
        className={`flex-1 text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
          active
            ? 'bg-accent/15 text-accent'
            : 'text-muted hover:text-white hover:bg-panel2'
        }`}
      >
        {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />}
        <span className="truncate">{label}</span>
      </button>
      {trailing}
    </div>
  );
}

function viewFromParam(v: string | null): View {
  if (!v) return 'overview';
  return v;
}

function healthLabel(health: Awaited<ReturnType<typeof api.health>> | undefined): string {
  if (!health || health.status !== 'ok') return 'connecting…';
  const degradedModules = health.modules.filter(
    (m) => m.status !== 'enabled' && m.status !== 'started',
  );
  if (!health.db) return 'Online (in-memory mode)';
  if (degradedModules.length > 0) {
    return `${degradedModules.length} module(s) need attention`;
  }
  return 'All systems nominal';
}

function CommandCenterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const view = viewFromParam(params.get('view'));
  const projectParam = params.get('project');
  const setActiveCodingProjectId = useShellStore((s) => s.setActiveCodingProjectId);

  useEffect(() => {
    if (view === 'module:bellasos.coding' && projectParam) {
      setActiveCodingProjectId(projectParam);
    }
  }, [view, projectParam, setActiveCodingProjectId]);

  const { data: health } = useQuery({ queryKey: queryKeys.health, queryFn: api.health });
  const { data: modules } = useQuery({ queryKey: queryKeys.modules, queryFn: api.modules });

  const online = health?.status === 'ok';

  const setView = useCallback(
    (v: View) => {
      router.push(`/console?view=${encodeURIComponent(v)}`, { scroll: false });
    },
    [router],
  );

  const toggleModule = useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      enable ? api.enableModule(id) : api.disableModule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.modules });
      qc.invalidateQueries({ queryKey: queryKeys.health });
      qc.invalidateQueries({ queryKey: queryKeys.integrations });
    },
  });

  function renderView() {
    if (view === 'overview') return <OverviewView onNavigate={setView} />;
    if (view === 'ai') return <AiView />;
    if (view === 'agents') return <AgentsView />;
    if (view === 'security') return <SecurityView />;
    if (view.startsWith('module:')) {
      const moduleId = view.slice('module:'.length);
      const projectId = params.get('project');
      if (moduleId === 'bellasos.llm') return <AiView />;
      return <ModuleDetailView moduleId={moduleId} initialProjectId={projectId} />;
    }
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 shrink-0 border-r border-edge bg-panel/40 flex flex-col">
        <div className="px-4 py-4 border-b border-edge">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Bellas<span className="text-accent">OS</span>
          </h1>
          <p className="text-[11px] text-muted mt-0.5">Command Center</p>
          <Link
            href="/"
            className="text-[11px] text-accent hover:underline mt-1 inline-block"
          >
            ← Back to Shell
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1">
            <p className="px-3 text-[10px] uppercase tracking-wider text-muted/70 mb-1">
              System
            </p>
            {SYSTEM_NAV.map((n) => (
              <NavItem
                key={n.key}
                label={n.label}
                active={view === n.key}
                onClick={() => setView(n.key)}
              />
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] uppercase tracking-wider text-muted/70 mb-1">
              Modules
            </p>
            {(modules ?? [])
              .filter(
                (m) =>
                  m.manifest.id !== 'bellasos.llm' &&
                  !HIDDEN_CONSOLE_MODULES.has(m.manifest.id),
              )
              .map((m) => {
                const enabled = m.status === 'enabled' || m.status === 'started';
                return (
                  <NavItem
                    key={m.manifest.id}
                    label={m.manifest.name}
                    active={view === `module:${m.manifest.id}`}
                    onClick={() => setView(`module:${m.manifest.id}`)}
                    dot={enabled ? 'bg-green-400' : 'bg-amber-400'}
                    trailing={
                      <button
                        title={enabled ? 'Disable module' : 'Enable module'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleModule.mutate({ id: m.manifest.id, enable: !enabled });
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-edge text-muted hover:text-accent shrink-0"
                      >
                        {enabled ? 'off' : 'on'}
                      </button>
                    }
                  />
                );
              })}
            {!modules?.length && (
              <p className="px-3 text-xs text-muted">No modules.</p>
            )}
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-edge text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${online ? (health?.db ? 'bg-green-400' : 'bg-amber-400') : 'bg-red-400'}`}
            />
            <span className="text-muted">{healthLabel(health)}</span>
          </div>
          {health && (
            <p className="text-[10px] text-muted/80">
              DB: {health.db ? 'connected' : 'degraded'} · Agents: {health.agents.length} ·
              Modules: {health.modules.length}
            </p>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-edge">
          <h2 className="text-base font-semibold text-white">
            {titleFor(view, modules)}
          </h2>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">{renderView()}</div>

          <div className="w-[380px] shrink-0 border-l border-edge p-4 overflow-hidden hidden lg:block">
            <JarvisConsole />
          </div>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 lg:hidden z-40">
        <Link
          href="/"
          className="text-xs px-3 py-2 rounded-lg border border-edge bg-panel text-accent"
        >
          Shell
        </Link>
      </div>
    </div>
  );
}

export function CommandCenter() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-muted">
          Loading Command Center…
        </div>
      }
    >
      <CommandCenterInner />
    </Suspense>
  );
}

function titleFor(
  view: View,
  modules?: Array<{ manifest: { id: string; name: string } }>,
): string {
  const sys = SYSTEM_NAV.find((n) => n.key === view);
  if (sys) return sys.label;
  if (view.startsWith('module:')) {
    const id = view.slice('module:'.length);
    if (id === 'bellasos.llm') return 'AI & LLMs';
    return modules?.find((m) => m.manifest.id === id)?.manifest.name ?? 'Module';
  }
  return 'Command Center';
}
