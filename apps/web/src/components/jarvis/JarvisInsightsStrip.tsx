'use client';

import Link from 'next/link';
import { homeSectionUrl } from '@/lib/missionRoutes';
import { Brain, GitBranch, Target, TrendingUp } from 'lucide-react';
import { useShellStore } from '@/stores/shellStore';

export function JarvisInsightsStrip() {
  const insights = useShellStore((s) => s.lastBriefingInsights);
  if (!insights) return null;

  const goals = insights.goalProgress?.slice(0, 2) ?? [];
  const decisions = insights.decisionRecommendations?.slice(0, 2) ?? [];
  const world = insights.worldPulse?.slice(0, 2) ?? [];
  const strategic = insights.strategicInsights?.slice(0, 1) ?? [];

  if (goals.length === 0 && decisions.length === 0 && world.length === 0 && strategic.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs uppercase tracking-wider text-white/50">Jarvis insights</h2>
        <Link href={homeSectionUrl('overview')} className="text-[10px] text-accent hover:underline">
          See all
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {goals.map((g) => (
          <InsightCard
            key={g.goalId}
            icon={Target}
            title={g.objective}
            subtitle={g.headline}
            href={homeSectionUrl('goals')}
            atRisk={!g.onTrack}
          />
        ))}
        {decisions.map((d) => (
          <InsightCard
            key={d.id}
            icon={GitBranch}
            title={d.title}
            subtitle={d.tradeoffLine}
            href={homeSectionUrl('decisions')}
          />
        ))}
        {world.map((w) => (
          <InsightCard
            key={w.id}
            icon={TrendingUp}
            title={w.headline}
            subtitle={w.relevanceLine}
            href={homeSectionUrl('intelligence')}
          />
        ))}
        {strategic.map((s) => (
          <InsightCard
            key={s.id}
            icon={Brain}
            title={s.title}
            subtitle={s.summary}
            href={homeSectionUrl('overview')}
            atRisk={s.severity === 'high'}
          />
        ))}
      </div>
    </section>
  );
}

function InsightCard({
  icon: Icon,
  title,
  subtitle,
  href,
  atRisk,
}: {
  icon: typeof Target;
  title: string;
  subtitle?: string;
  href: string;
  atRisk?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border px-3 py-2.5 transition-colors hover:bg-white/5 ${
        atRisk ? 'border-amber-400/30 bg-amber-400/5' : 'border-white/10 bg-black/20'
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${atRisk ? 'text-amber-400' : 'text-accent'}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{title}</p>
          {subtitle && <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{subtitle}</p>}
        </div>
      </div>
    </Link>
  );
}
