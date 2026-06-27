import type {
  Goal,
  GoalContext,
  GoalProgressSummary,
  Initiative,
  StrategicInsight,
} from '@bellasos/contracts';
import { initiativeById } from './goal-context';
import type { IntelligenceSignal } from './types';

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / 86_400_000);
}

function goalHeadline(goal: Goal, initiative?: Initiative): string {
  const pct = goal.progress.pct;
  const name = initiative?.name;
  if (pct != null && pct >= 100) {
    return `${goal.objective}${name ? ` (${name})` : ''} — ahead of target.`;
  }
  if (pct != null && pct < 50 && goal.progress.trend === 'down') {
    return `${goal.objective}${name ? ` (${name})` : ''} — behind schedule.`;
  }
  if (pct != null) {
    return `${goal.objective}${name ? ` (${name})` : ''} — ${pct}% of target.`;
  }
  return goal.objective;
}

export function summarizeGoalProgress(goalContext: GoalContext): GoalProgressSummary[] {
  return goalContext.goals
    .filter((g) => g.status === 'active')
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map((goal) => {
      const initiative = initiativeById(goalContext, goal.initiativeId);
      const pct = goal.progress.pct;
      const onTrack = pct == null ? true : pct >= 70;
      return {
        goalId: goal.id,
        objective: goal.objective,
        initiativeName: initiative?.name,
        status: goal.status,
        pct,
        trend: goal.progress.trend,
        onTrack,
        headline: goalHeadline(goal, initiative),
      };
    });
}

export function analyzeStrategicIntelligence(
  signals: IntelligenceSignal[],
  goalContext: GoalContext,
): StrategicInsight[] {
  const insights: StrategicInsight[] = [];

  for (const goal of goalContext.goals.filter((g) => g.status === 'active')) {
    const initiative = initiativeById(goalContext, goal.initiativeId);
    const pct = goal.progress.pct;
    const deadlineDays = daysUntil(goal.deadlineAt);

    if (pct != null && pct >= 100) {
      insights.push({
        id: `progress-${goal.id}`,
        kind: 'goal_progress',
        title: goal.objective,
        summary: `Ahead of target${initiative ? ` for ${initiative.name}` : ''}.`,
        goalId: goal.id,
        initiativeId: initiative?.id,
        severity: 'low',
      });
    } else if (pct != null && pct < 50) {
      insights.push({
        id: `risk-${goal.id}`,
        kind: 'goal_risk',
        title: goal.objective,
        summary: `Behind target at ${pct}%${initiative ? ` (${initiative.name})` : ''}.`,
        goalId: goal.id,
        initiativeId: initiative?.id,
        severity: deadlineDays != null && deadlineDays <= 7 ? 'high' : 'medium',
        recommendedAction: 'Schedule focused time on this goal this week.',
      });
    }

    if (deadlineDays != null && deadlineDays <= 7 && deadlineDays >= 0) {
      insights.push({
        id: `deadline-${goal.id}`,
        kind: 'goal_risk',
        title: `${goal.objective} deadline approaching`,
        summary: `Deadline in ${deadlineDays} day${deadlineDays === 1 ? '' : 's'}.`,
        goalId: goal.id,
        initiativeId: initiative?.id,
        severity: 'high',
        recommendedAction: 'Confirm next actions and clear blockers.',
      });
    }
  }

  for (const initiative of goalContext.initiatives.filter((i) => i.status === 'active')) {
    if (initiative.momentum === 'blocked') {
      insights.push({
        id: `blocker-${initiative.id}`,
        kind: 'initiative_blocker',
        title: initiative.name,
        summary: `${initiative.name} momentum is blocked.`,
        initiativeId: initiative.id,
        severity: 'high',
        recommendedAction: 'Identify and resolve the top blocker today.',
      });
    } else if (initiative.momentum === 'accelerating') {
      insights.push({
        id: `momentum-${initiative.id}`,
        kind: 'initiative_momentum',
        title: initiative.name,
        summary: `${initiative.name} is gaining momentum.`,
        initiativeId: initiative.id,
        severity: 'low',
      });
    }
  }

  const opportunitySignals = signals.filter(
    (s) => s.kind === 'opportunity' && s.goalImpact?.length,
  );
  for (const signal of opportunitySignals.slice(0, 2)) {
    const impact = signal.goalImpact![0]!;
    insights.push({
      id: `opp-${signal.id}`,
      kind: 'emerging_opportunity',
      title: signal.title,
      summary: impact.relevanceLine,
      goalId: impact.goalId,
      initiativeId: impact.initiativeId,
      severity: 'medium',
      recommendedAction: impact.recommendedAction,
    });
  }

  const riskSignals = signals.filter(
    (s) =>
      (s.kind === 'risk' || s.kind === 'blocker') &&
      s.goalImpact?.length &&
      !insights.some((i) => i.goalId === s.goalImpact![0]?.goalId),
  );
  for (const signal of riskSignals.slice(0, 2)) {
    const impact = signal.goalImpact![0]!;
    insights.push({
      id: `missed-${signal.id}`,
      kind: 'missed_opportunity',
      title: signal.title,
      summary: impact.relevanceLine,
      goalId: impact.goalId,
      initiativeId: impact.initiativeId,
      severity: 'medium',
      recommendedAction: impact.recommendedAction,
    });
  }

  return insights.slice(0, 8);
}

export function goalRiskTodayItems(
  summaries: GoalProgressSummary[],
): Array<{ id: string; title: string; subtitle: string; priority: number }> {
  return summaries
    .filter((s) => !s.onTrack || (s.pct != null && s.pct < 50))
    .map((s) => ({
      id: `goal-risk-${s.goalId}`,
      title: s.objective,
      subtitle: s.headline,
      priority: 90 - (summaries.findIndex((x) => x.goalId === s.goalId) ?? 0),
    }));
}
