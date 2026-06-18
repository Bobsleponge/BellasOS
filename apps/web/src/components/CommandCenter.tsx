'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { JarvisConsole } from './JarvisConsole';
import {
  OverviewView,
  AgentsView,
  SecurityView,
  ModuleDetailView,
} from './views';
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
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
        active
          ? 'bg-accent/15 text-accent'
          : 'text-muted hover:text-white hover:bg-panel2'
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      <span className="truncate">{label}</span>
    </button>
  );
}

function viewFromParam(v: string | null): View {
  if (!v) return 'overview';
  return v;
}

function CommandCenterInner({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [localView, setLocalView] = useState<View>('overview');
  const view = embedded ? localView : viewFromParam(params.get('view'));
  const [jarvisOpen, setJarvisOpen] = useState(!embedded);
  const [mobileJarvis, setMobileJarvis] = useState(false);
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.health });
  const { data: modules } = useQuery({ queryKey: ['modules'], queryFn: api.modules });

  const online = health?.status === 'ok';

  const setView = useCallback(
    (v: View) => {
      if (embedded) {
        setLocalView(v);
        return;
      }
      router.push(`/console?view=${encodeURIComponent(v)}`, { scroll: false });
    },
    [embedded, router],
  );

  function renderView() {
    if (view === 'overview') return <OverviewView onNavigate={setView} />;
    if (view === 'ai') return <AiView />;
    if (view === 'agents') return <AgentsView />;
    if (view === 'security') return <SecurityView />;
    if (view.startsWith('module:'))
      return <ModuleDetailView moduleId={view.slice('module:'.length)} />;
    return null;
  }

  return (
    <div className={embedded ? 'flex h-full overflow-hidden' : 'flex h-screen overflow-hidden'}>
      <aside className="w-60 shrink-0 border-r border-edge bg-panel/40 flex flex-col">
        <div className="px-4 py-4 border-b border-edge">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Bellas<span className="text-accent">OS</span>
          </h1>
          <p className="text-[11px] text-muted mt-0.5">Command Center</p>
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
            {(modules ?? []).map((m) => (
              <NavItem
                key={m.manifest.id}
                label={m.manifest.name}
                active={view === `module:${m.manifest.id}`}
                onClick={() => setView(`module:${m.manifest.id}`)}
                dot={m.status === 'enabled' || m.status === 'started' ? 'bg-green-400' : 'bg-amber-400'}
              />
            ))}
            {!modules?.length && (
              <p className="px-3 text-xs text-muted">No modules.</p>
            )}
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-edge flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`}
          />
          <span className="text-muted">
            {online
              ? health?.db
                ? 'All systems nominal'
                : 'Online (in-memory)'
              : 'connecting...'}
          </span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-edge">
          <h2 className="text-base font-semibold text-white">
            {titleFor(view, modules)}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setMobileJarvis(true)}
              className="lg:hidden text-xs px-3 py-1.5 rounded-lg border border-edge text-muted hover:text-accent hover:border-accent"
            >
              Ask Jarvis
            </button>
            <button
              onClick={() => setJarvisOpen((o) => !o)}
              className="hidden lg:inline text-xs px-3 py-1.5 rounded-lg border border-edge text-muted hover:text-accent hover:border-accent transition-colors"
            >
              {jarvisOpen ? 'Hide Jarvis' : 'Ask Jarvis'}
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">{renderView()}</div>

          {jarvisOpen && (
            <div className="w-[380px] shrink-0 border-l border-edge p-4 overflow-hidden hidden lg:block">
              <JarvisConsole />
            </div>
          )}
        </div>
      </main>

      {mobileJarvis && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Close Jarvis"
            onClick={() => setMobileJarvis(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-panel border-t border-edge p-4 rounded-t-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-accent">Jarvis</span>
              <button
                onClick={() => setMobileJarvis(false)}
                className="text-xs text-muted"
              >
                Close
              </button>
            </div>
            <div className="h-[70vh]">
              <JarvisConsole />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CommandCenter({ embedded = false }: { embedded?: boolean }) {
  return (
    <Suspense
      fallback={
        <div className={embedded ? 'h-full flex items-center justify-center text-muted' : 'h-screen flex items-center justify-center text-muted'}>
          Loading Command Center…
        </div>
      }
    >
      <CommandCenterInner embedded={embedded} />
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
    return modules?.find((m) => m.manifest.id === id)?.manifest.name ?? 'Module';
  }
  return 'Command Center';
}
