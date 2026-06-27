'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Brain,
  CheckCircle2,
  Clock,
  Globe,
  PieChart,
  Target,
  GitBranch,
  Briefcase,
} from 'lucide-react';
import type { TodayItem as TodayItemData, TodayItemKind } from '@/lib/api';
import { todayItemMissionHref } from '@/lib/missionRoutes';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<TodayItemKind, typeof Bell> = {
  approval: CheckCircle2,
  alert: AlertTriangle,
  intelligence: Brain,
  wealth: PieChart,
  activity: Clock,
  priority: Bell,
  goal: Target,
  decision: GitBranch,
  world: Globe,
  workspace: Briefcase,
};

const KIND_ACCENT: Record<TodayItemKind, string> = {
  approval: 'text-amber-300',
  alert: 'text-red-300',
  intelligence: 'text-sky-300',
  wealth: 'text-emerald-300',
  activity: 'text-white/60',
  priority: 'text-accent2',
  goal: 'text-violet-300',
  decision: 'text-cyan-300',
  world: 'text-teal-300',
  workspace: 'text-accent',
};

export function TodayItem({ item }: { item: TodayItemData }) {
  const Icon = KIND_ICON[item.kind];
  const accent = KIND_ACCENT[item.kind];

  const content = (
    <div className="flex items-start gap-3 py-3 px-3 rounded-lg border border-white/5 bg-black/20 hover:bg-black/30 hover:border-white/10 transition-colors">
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', accent)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white font-medium truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{item.subtitle}</p>
        )}
        {item.createdAt && (
          <p className="text-[10px] text-white/40 mt-1">
            {new Date(item.createdAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
      {item.actionLabel && (
        <span className="text-xs text-accent shrink-0 flex items-center gap-1">
          {item.actionLabel}
          <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block">
        {content}
      </Link>
    );
  }

  const missionHref = todayItemMissionHref(item.kind, item.id);
  if (missionHref) {
    return (
      <Link href={missionHref} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
