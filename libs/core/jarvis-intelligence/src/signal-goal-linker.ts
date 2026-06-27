import type { Goal, GoalContext, GoalImpact, Initiative } from '@bellasos/contracts';
import { goalById, initiativeById } from './goal-context';
import type { IntelligenceSignal } from './types';

export function findInitiativeForGoal(
  goal: Goal,
  goalContext: GoalContext,
): Initiative | undefined {
  if (goal.initiativeId) return initiativeById(goalContext, goal.initiativeId);
  return goalContext.initiatives.find((i) => i.goalIds.includes(goal.id));
}

function buildImpact(
  goal: Goal,
  initiative: Initiative | undefined,
  impact: GoalImpact['impact'],
  relevanceLine: string,
  progressDelta?: number,
  recommendedAction?: string,
): GoalImpact {
  return {
    goalId: goal.id,
    goalObjective: goal.objective,
    initiativeId: initiative?.id,
    initiativeName: initiative?.name,
    impact,
    progressDelta,
    relevanceLine,
    recommendedAction,
  };
}

function matchHarviGoal(signal: IntelligenceSignal, goalContext: GoalContext): GoalImpact[] {
  if (
    !signal.source.includes('harvi') &&
    signal.applicationId !== 'harvi-and-co' &&
    !signal.title.toLowerCase().includes('harvi')
  ) {
    return [];
  }

  const goal = goalContext.goals.find(
    (g) =>
      g.target?.metric === 'weekly_orders' ||
      g.applicationIds?.includes('harvi-and-co'),
  );
  if (!goal) return [];

  const initiative = findInitiativeForGoal(goal, goalContext);
  const ordersMatch = signal.summary.match(/(\d+)\s*orders?/i);
  const orders = ordersMatch ? Number(ordersMatch[1]) : undefined;
  const target = goal.target?.targetValue ?? 10;
  const current = orders ?? goal.progress.current ?? 0;
  const ahead = current >= target;
  const relevanceLine = ahead
    ? `This places the business ahead of the weekly growth target for the ${initiative?.name ?? 'Harvi'} initiative.`
    : `This affects progress toward the weekly order target for ${initiative?.name ?? 'Harvi'}.`;

  return [
    buildImpact(
      goal,
      initiative,
      ahead ? 'positive' : current > 0 ? 'neutral' : 'at_risk',
      relevanceLine,
      orders != null ? orders - target : undefined,
      ahead ? undefined : 'Review Harvi pipeline and order sources today.',
    ),
  ];
}

function matchWealthGoal(signal: IntelligenceSignal, goalContext: GoalContext): GoalImpact[] {
  if (!signal.source.includes('wealth') && signal.applicationId !== 'wealth') return [];

  const goal = goalContext.goals.find(
    (g) =>
      g.target?.metric === 'net_worth_pct' ||
      g.category === 'financial',
  );
  if (!goal) return [];

  const initiative = findInitiativeForGoal(goal, goalContext);
  const pct = goal.progress.pct ?? 0;
  const impact: GoalImpact['impact'] =
    pct >= 80 ? 'positive' : pct >= 40 ? 'neutral' : 'at_risk';

  return [
    buildImpact(
      goal,
      initiative,
      impact,
      `Wealth movement affects your ${goal.objective.toLowerCase()} (${pct}% of target).`,
      undefined,
      impact === 'at_risk' ? 'Review portfolio allocation in Wealth.' : undefined,
    ),
  ];
}

function matchResearchGoal(signal: IntelligenceSignal, goalContext: GoalContext): GoalImpact[] {
  if (!signal.source.startsWith('research')) return [];
  const goal = goalContext.goals.find(
    (g) => g.category === 'research' || g.category === 'learning',
  );
  if (!goal) return [];
  return [
    buildImpact(
      goal,
      findInitiativeForGoal(goal, goalContext),
      'neutral',
      `New research may inform ${goal.objective.toLowerCase()}.`,
      undefined,
      'Review the report when you have a few minutes.',
    ),
  ];
}

function matchCodingGoal(signal: IntelligenceSignal, goalContext: GoalContext): GoalImpact[] {
  if (!signal.source.includes('coding')) return [];
  const goal = goalContext.goals.find(
    (g) =>
      g.applicationIds?.includes('coding-studio') ||
      g.initiativeId === '11111111-1111-1111-1111-111111111101',
  );
  if (!goal) return [];
  const initiative = findInitiativeForGoal(goal, goalContext);
  return [
    buildImpact(
      goal,
      initiative,
      'positive',
      `Active coding work supports ${initiative?.name ?? 'Build BellasOS'}.`,
    ),
  ];
}

function matchMiningGoal(signal: IntelligenceSignal, goalContext: GoalContext): GoalImpact[] {
  const sector = signal.worldSignal?.sector;
  if (sector !== 'mining' && !signal.source.includes('world.mining')) return [];

  const goal = goalContext.goals.find(
    (g) => g.category === 'financial' || g.target?.metric === 'net_worth_pct',
  );
  if (!goal) return [];

  return [
    buildImpact(
      goal,
      findInitiativeForGoal(goal, goalContext),
      'neutral',
      `Mining sector news may affect ${goal.objective.toLowerCase()}.`,
    ),
  ];
}

function matchApprovalGoal(signal: IntelligenceSignal, goalContext: GoalContext): GoalImpact[] {
  if (!signal.source.startsWith('approval')) return [];
  const goal = goalContext.goals.find((g) => g.category === 'operational');
  if (!goal) return [];
  return [
    buildImpact(
      goal,
      findInitiativeForGoal(goal, goalContext),
      'at_risk',
      `Pending approval may block ${goal.objective.toLowerCase()}.`,
      undefined,
      'Review and approve in System Console.',
    ),
  ];
}

function matchByApplication(
  signal: IntelligenceSignal,
  goalContext: GoalContext,
): GoalImpact[] {
  if (!signal.applicationId) return [];
  const goal = goalContext.goals.find((g) =>
    g.applicationIds?.includes(signal.applicationId!),
  );
  if (!goal) return [];
  return [
    buildImpact(
      goal,
      findInitiativeForGoal(goal, goalContext),
      'neutral',
      `Relevant to ${goal.objective}.`,
    ),
  ];
}

export function linkSignalsToGoals(
  signals: IntelligenceSignal[],
  goalContext: GoalContext,
): IntelligenceSignal[] {
  if (goalContext.goals.length === 0) return signals;

  return signals.map((signal) => {
    if (signal.goalImpact?.length) return signal;

    const impacts = [
      ...matchHarviGoal(signal, goalContext),
      ...matchWealthGoal(signal, goalContext),
      ...matchResearchGoal(signal, goalContext),
      ...matchCodingGoal(signal, goalContext),
      ...matchApprovalGoal(signal, goalContext),
      ...matchMiningGoal(signal, goalContext),
      ...matchByApplication(signal, goalContext),
    ];

    const deduped = impacts.filter(
      (impact, idx, arr) => arr.findIndex((i) => i.goalId === impact.goalId) === idx,
    );

    if (deduped.length === 0) return signal;

    const bestRelevance = deduped[0]?.relevanceLine;
    return {
      ...signal,
      goalImpact: deduped,
      relevanceLine: signal.relevanceLine ?? bestRelevance,
      strategicScore: Math.max(
        signal.strategicScore ?? 0,
        deduped.some((i) => i.impact === 'positive')
          ? 0.75
          : deduped.some((i) => i.impact === 'at_risk')
            ? 0.85
            : 0.55,
      ),
    };
  });
}

export function strategicScoreForSignal(signal: IntelligenceSignal): number {
  if (signal.strategicScore != null) return signal.strategicScore;
  if (!signal.goalImpact?.length) return 0;
  const maxPriorityBoost =
    signal.goalImpact.some((i) => i.impact === 'at_risk') ? 0.85 : 0.65;
  return maxPriorityBoost;
}
