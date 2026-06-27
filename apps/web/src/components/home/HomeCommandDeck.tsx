'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { INTELLIGENCE_APP_URL } from '@bellasos/contracts';
import { ArrowUpRight, Radio, Target, Zap } from 'lucide-react';
import { ApplicationLauncher } from '@/components/applications/ApplicationLauncher';
import { AskJarvisButton } from '@/components/jarvis/AskJarvisButton';
import { DecisionQueue } from './DecisionQueue';
import { GoalsSnapshot } from './GoalsSnapshot';
import { JarvisRecommendsCard } from './JarvisRecommendsCard';
import { OpportunitiesRisks } from './OpportunitiesRisks';
import { TodayStack } from '@/components/today/TodayStack';
import { homeSectionUrl } from '@/lib/missionRoutes';

const cardMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

function HudCard({
  title,
  icon: Icon,
  action,
  children,
  className = '',
}: {
  title: string;
  icon: typeof Zap;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      {...cardMotion}
      className={`hud-card flex flex-col min-h-0 ${className}`}
    >
      <header className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-accent" />
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/50">{title}</h2>
        </div>
        {action}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </motion.section>
  );
}

/** Bento command deck — actionable briefing + spaced app grid. */
export function HomeCommandDeck() {
  return (
    <div className="pointer-events-auto w-full space-y-6 pb-6">
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <HudCard
          title="Priority"
          icon={Zap}
          className="lg:col-span-7"
          action={
            <Link
              href={homeSectionUrl('decisions')}
              className="inline-flex items-center gap-1 text-[10px] text-accent hover:underline"
            >
              All decisions
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="space-y-4">
            <JarvisRecommendsCard />
            <DecisionQueue hideJarvisPick />
          </div>
        </HudCard>

        <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
          <HudCard
            title="Goals"
            icon={Target}
            action={
              <Link
                href={homeSectionUrl('goals')}
                className="text-[10px] text-accent hover:underline"
              >
                Manage
              </Link>
            }
          >
            <GoalsSnapshot />
          </HudCard>

          <HudCard
            title="Signals"
            icon={Radio}
            action={
              <Link href={INTELLIGENCE_APP_URL} className="text-[10px] text-accent hover:underline">
                Intelligence
              </Link>
            }
          >
            <OpportunitiesRisks embedded />
          </HudCard>
        </div>
      </div>

      <TodayStack />

      <motion.section {...cardMotion} className="hud-card">
        <header className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/50">Applications</h2>
          <AskJarvisButton prompt="Open the app I need right now" variant="ghost" size="sm">
            Ask Jarvis
          </AskJarvisButton>
        </header>
        <ApplicationLauncher grid />
      </motion.section>
    </div>
  );
}
