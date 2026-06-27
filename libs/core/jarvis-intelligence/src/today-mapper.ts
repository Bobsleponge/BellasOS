import type { DecisionRecommendation, GoalProgressSummary, WorkspaceProgressSummary } from '@bellasos/contracts';
import type { DecisionContext } from '@bellasos/contracts';
import { greetingForRhythm, rhythmFromHour } from './context';
import { goalRiskTodayItems } from './strategic-intelligence';
import type { IntelligenceSignal, TodayFeed, TodayItem } from './types';

function kindFromSignal(signal: IntelligenceSignal): TodayItem['kind'] {
  if (signal.worldSignal && signal.worldRelevance) return 'world';
  if (signal.decisionRecommendation) return 'decision';
  if (signal.source.startsWith('approval')) return 'approval';
  if (signal.source.startsWith('notification')) return 'alert';
  if (signal.source.includes('intelligence') || signal.source.includes('ingestion')) {
    return 'intelligence';
  }
  if (signal.source.includes('wealth')) return 'wealth';
  if (signal.kind === 'decision') return 'priority';
  if (signal.tier === 'immediate') return 'priority';
  if (signal.source.startsWith('audit')) return 'activity';
  return 'priority';
}

function actionLabelFor(signal: IntelligenceSignal): string | undefined {
  if (signal.href?.includes('security')) return 'Review';
  if (signal.href?.includes('intelligence')) return 'Read';
  if (signal.worldSignal) return 'Explore';
  if (signal.href?.includes('finance')) return 'Open Wealth';
  if (signal.href) return 'Open';
  return undefined;
}

export function signalsToTodayItems(signals: IntelligenceSignal[]): TodayItem[] {
  const worldCount = signals.filter((s) => s.worldSignal && s.worldRelevance).length;
  const maxWorld = Math.min(3, worldCount);

  return signals
    .filter((s) => s.tier !== 'silent')
    .map((signal) => ({
      id: signal.id,
      kind: kindFromSignal(signal),
      title: signal.title,
      subtitle:
        signal.worldRelevance?.relevanceLine ??
        signal.decisionRecommendation?.tradeoffLine ??
        signal.goalImpact?.[0]?.relevanceLine ??
        signal.relevanceLine ??
        signal.summary,
      href: signal.href,
      actionLabel: actionLabelFor(signal),
      createdAt: signal.createdAt,
      priority: Math.round(signal.composite * 100),
    }))
    .sort((a, b) => b.priority - a.priority)
    .filter((item, idx, arr) => {
      if (item.kind !== 'world') return true;
      const worldIndex = arr.filter((x, i) => x.kind === 'world' && i <= idx).length;
      return worldIndex <= maxWorld;
    })
    .slice(0, 7);
}

export function goalSummariesToTodayItems(
  summaries: GoalProgressSummary[],
): TodayItem[] {
  return goalRiskTodayItems(summaries).map((item) => ({
    id: item.id,
    kind: 'goal' as const,
    title: item.title,
    subtitle: item.subtitle,
    priority: item.priority,
  }));
}

export function decisionRecommendationsToTodayItems(
  recommendations: DecisionRecommendation[],
): TodayItem[] {
  return recommendations.slice(0, 3).map((rec) => ({
    id: `decision-rec:${rec.id}`,
    kind: 'decision' as const,
    title: rec.title,
    subtitle: rec.tradeoffLine,
    actionLabel: rec.nextAction ? 'Consider' : undefined,
    priority: Math.round(rec.confidence.score * 100),
  }));
}

export function workspaceProgressToTodayItems(
  progress?: WorkspaceProgressSummary,
): TodayItem[] {
  if (!progress || progress.status !== 'active') return [];
  return [
    {
      id: `workspace:${progress.workspaceId}`,
      kind: 'workspace',
      title: progress.title,
      subtitle: progress.headline,
      priority: progress.onTrack ? 72 : 88,
    },
  ];
}

export function buildTodayFeed(
  signals: IntelligenceSignal[],
  health: { status: string; db?: boolean; modules?: Array<{ status: string }> },
  displayName?: string,
  goalProgress?: GoalProgressSummary[],
  decisionRecommendations?: DecisionRecommendation[],
  decisionContext?: DecisionContext,
  workspaceProgress?: WorkspaceProgressSummary,
): TodayFeed {
  const now = new Date();
  const rhythm = rhythmFromHour(now.getHours());
  const greeting = `${greetingForRhythm(rhythm, displayName)}`;
  const signalItems = signalsToTodayItems(signals);
  const goalItems = goalSummariesToTodayItems(goalProgress ?? []);
  const decisionItems = decisionRecommendationsToTodayItems(decisionRecommendations ?? []);
  const workspaceItems = workspaceProgressToTodayItems(workspaceProgress);
  const items = [...workspaceItems, ...decisionItems, ...goalItems, ...signalItems]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 7);

  const needsYou = items.filter(
    (i) =>
      i.kind === 'approval' ||
      i.kind === 'alert' ||
      i.kind === 'priority' ||
      i.kind === 'goal' ||
      i.kind === 'decision',
  ).length;

  const focusInitiative = goalProgress?.find((g) => g.initiativeName)?.initiativeName;
  const topGoal = goalProgress?.[0];

  let connection: TodayFeed['connection'] = {
    status: 'offline',
    label: 'Working offline',
  };

  if (health.status === 'ok') {
    const degraded =
      health.modules?.filter(
        (m) => m.status !== 'enabled' && m.status !== 'started',
      ).length ?? 0;
    connection =
      degraded > 0
        ? { status: 'degraded', label: 'Connected · some services need attention' }
        : {
            status: 'connected',
            label: health.db ? 'Connected' : 'Connected · in-memory mode',
          };
  }

  let contextLine: string | undefined;
  const openDecisionCount = decisionContext?.openDecisions.length ?? 0;
  if (workspaceProgress?.status === 'active') {
    contextLine = `${workspaceProgress.title} · ${workspaceProgress.headline}`;
    if (openDecisionCount > 0) {
      contextLine += ` · ${openDecisionCount} decision${openDecisionCount === 1 ? '' : 's'} to consider`;
    }
  } else if (focusInitiative && topGoal) {
    contextLine = `${focusInitiative} · ${topGoal.headline}`;
    if (openDecisionCount > 0) {
      contextLine += ` · ${openDecisionCount} decision${openDecisionCount === 1 ? '' : 's'} to consider`;
    }
  } else if (openDecisionCount > 0) {
    contextLine = `${openDecisionCount} open decision${openDecisionCount === 1 ? '' : 's'} to consider`;
  } else if (needsYou > 0) {
    contextLine = `${needsYou} item${needsYou === 1 ? '' : 's'} need${needsYou === 1 ? 's' : ''} you`;
  } else if (items.length > 0) {
    contextLine = `${items.length} update${items.length === 1 ? '' : 's'} for today`;
  } else {
    contextLine = 'You are caught up';
  }

  return {
    greeting,
    contextLine,
    items,
    connection,
    generatedAt: now.toISOString(),
  };
}
