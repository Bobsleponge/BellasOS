'use client';

import { Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home } from 'lucide-react';
import { JarvisConsole } from '@/components/JarvisConsole';
import { ModeChip } from '@/components/mission/ModeChip';
import { OverviewTab } from '@/components/mission/OverviewTab';
import { WorkspacesTab } from '@/components/mission/WorkspacesTab';
import { GoalsTab } from '@/components/mission/GoalsTab';
import { DecisionsTab } from '@/components/mission/DecisionsTab';
import { IntelligenceTab } from '@/components/mission/IntelligenceTab';
import { MemoryTab } from '@/components/mission/MemoryTab';
import { Button } from '@/components/ui/button';
import { currentRhythm } from '@/lib/jarvisRhythm';
import { MISSION_TABS, parseMissionTab, type MissionTab } from '@/lib/missionRoutes';
import { useShellStore } from '@/stores/shellStore';
import { useWorkspaceBootstrap } from '@/hooks/useWorkspaceBootstrap';

function phaseLabel(): string {
  const rhythm = currentRhythm();
  if (rhythm === 'morning') return 'Morning';
  if (rhythm === 'midday') return 'Execution';
  if (rhythm === 'evening') return 'Synthesis';
  return 'Night';
}

function MissionControlInner() {
  useWorkspaceBootstrap();
  const router = useRouter();
  const params = useSearchParams();
  const tab = parseMissionTab(params.get('tab'));
  const activeWorkspaceId = useShellStore((s) => s.activeWorkspaceId);

  const setTab = useCallback(
    (next: MissionTab) => {
      router.push(`/mission?tab=${next}`, { scroll: false });
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-panel text-white flex">
      <aside className="w-52 shrink-0 border-r border-edge flex flex-col">
        <div className="p-4 border-b border-edge">
          <Link href="/" className="text-sm font-semibold text-white hover:text-accent">
            ← Today
          </Link>
          <h1 className="text-lg font-semibold mt-2">
            Mission<span className="text-accent">Control</span>
          </h1>
          <p className="text-[10px] text-muted mt-1 uppercase tracking-wider">{phaseLabel()}</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {MISSION_TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                tab === item.key
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:text-white hover:bg-panel2'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-edge flex items-center justify-between px-4 gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ModeChip />
            {activeWorkspaceId && (
              <button
                type="button"
                onClick={() => setTab('workspaces')}
                className="text-xs text-accent truncate max-w-[12rem] hover:underline"
              >
                Active workspace
              </button>
            )}
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <Home className="h-4 w-4 mr-1" />
              Today
            </Button>
          </Link>
        </header>

        <div className="flex-1 flex min-h-0">
          <main className="flex-1 overflow-y-auto p-6">
            {tab === 'overview' && <OverviewTab />}
            {tab === 'workspaces' && <WorkspacesTab />}
            {tab === 'goals' && <GoalsTab />}
            {tab === 'decisions' && <DecisionsTab />}
            {tab === 'intelligence' && <IntelligenceTab />}
            {tab === 'memory' && <MemoryTab />}
          </main>
          <aside className="hidden xl:flex w-80 border-l border-edge flex-col min-h-0">
            <JarvisConsole />
          </aside>
        </div>
      </div>
    </div>
  );
}

export function MissionControl() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-panel p-6 text-muted">Loading…</div>}>
      <MissionControlInner />
    </Suspense>
  );
}
