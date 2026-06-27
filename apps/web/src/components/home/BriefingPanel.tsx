'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { INTELLIGENCE_APP_URL } from '@bellasos/contracts';
import { cn } from '@/lib/utils';
import { homeSectionUrl, type HomeSection } from '@/lib/missionRoutes';
import { DecisionQueue } from './DecisionQueue';
import { GoalsSnapshot } from './GoalsSnapshot';
import { JarvisRecommendsCard } from './JarvisRecommendsCard';
import { OpportunitiesRisks } from './OpportunitiesRisks';

type BriefingTab = 'action' | 'goals' | 'signals';

const SECTION_TAB: Partial<Record<HomeSection, BriefingTab>> = {
  decisions: 'action',
  goals: 'goals',
  intelligence: 'signals',
};

const TABS: Array<{ key: BriefingTab; label: string }> = [
  { key: 'action', label: 'Action' },
  { key: 'goals', label: 'Goals' },
  { key: 'signals', label: 'Signals' },
];

function BriefingPanelInner() {
  const params = useSearchParams();
  const section = params.get('section');
  const [tab, setTab] = useState<BriefingTab>('action');

  useEffect(() => {
    const mapped = section ? SECTION_TAB[section as HomeSection] : undefined;
    if (mapped) setTab((current) => (current === mapped ? current : mapped));
  }, [section]);

  return (
    <section className="pointer-events-auto w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs uppercase tracking-wider text-white/40">Briefing</h2>
        <nav className="flex gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                tab === key
                  ? 'bg-accent/20 text-white'
                  : 'text-white/50 hover:text-white/80',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4 min-h-[12rem]">
        {tab === 'action' && (
          <div id="decisions" className="scroll-mt-24 space-y-4">
            <JarvisRecommendsCard />
            <DecisionQueue hideJarvisPick />
          </div>
        )}
        {tab === 'goals' && (
          <div id="goals" className="scroll-mt-24">
            <GoalsSnapshot />
          </div>
        )}
        {tab === 'signals' && (
          <div id="intelligence" className="scroll-mt-24">
            <OpportunitiesRisks embedded />
          </div>
        )}
      </div>

      <div className="flex justify-end mt-3 px-1">
        {tab === 'goals' && (
          <Link href={homeSectionUrl('goals')} className="text-[10px] text-accent hover:underline">
            Manage all goals →
          </Link>
        )}
        {tab === 'action' && (
          <Link href={homeSectionUrl('decisions')} className="text-[10px] text-accent hover:underline">
            Manage all decisions →
          </Link>
        )}
        {tab === 'signals' && (
          <Link href={INTELLIGENCE_APP_URL} className="text-[10px] text-accent hover:underline">
            Open Intelligence app →
          </Link>
        )}
      </div>
    </section>
  );
}

export function BriefingPanel() {
  return (
    <Suspense fallback={null}>
      <BriefingPanelInner />
    </Suspense>
  );
}
