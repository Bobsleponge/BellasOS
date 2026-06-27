import type { DecisionContext, GoalContext, StrategicInsight } from '@bellasos/contracts';
import { openDecisionForGoal } from './decision-context';
import type { DecisionPoint, IntelligenceSignal } from './types';

function matchApprovalDecision(
  signal: IntelligenceSignal,
  decisionContext: DecisionContext,
): DecisionPoint | null {
  if (!signal.source.startsWith('approval')) return null;
  const linked = decisionContext.openDecisions.find((d) =>
    d.signalIds.includes(signal.id.replace('approval:', '')),
  );
  return {
    signalId: signal.id,
    title: signal.title,
    question: linked?.question ?? 'How should you respond to this approval?',
    category: 'operational',
    linkedDecisionId: linked?.id,
    goalIds: linked?.goalIds ?? signal.goalImpact?.map((g) => g.goalId) ?? [],
    initiativeIds: linked?.initiativeIds ?? [],
  };
}

function matchHarviTradeoff(
  signal: IntelligenceSignal,
  goalContext: GoalContext,
  decisionContext: DecisionContext,
): DecisionPoint | null {
  const isHarvi =
    signal.source.includes('harvi') ||
    signal.applicationId === 'harvi-and-co' ||
    signal.title.toLowerCase().includes('harvi');
  if (!isHarvi) return null;

  const harviGoal = goalContext.goals.find((g) => g.target?.metric === 'weekly_orders');
  if (!harviGoal) return null;

  const belowTarget =
    (harviGoal.progress.pct ?? 100) < 100 ||
    signal.summary.toLowerCase().includes('below') ||
    (signal.summary.match(/(\d+)\s*orders?/i) &&
      Number(signal.summary.match(/(\d+)\s*orders?/i)![1]) < (harviGoal.target?.targetValue ?? 10));

  if (!belowTarget && !signal.summary.includes('below')) {
    const existing = openDecisionForGoal(decisionContext, harviGoal.id);
    if (existing) {
      return {
        signalId: signal.id,
        title: existing.title,
        question: existing.question,
        category: 'business',
        linkedDecisionId: existing.id,
        goalIds: existing.goalIds,
        initiativeIds: existing.initiativeIds,
      };
    }
    return null;
  }

  const existing = openDecisionForGoal(decisionContext, harviGoal.id);
  return {
    signalId: signal.id,
    title: existing?.title ?? 'Harvi growth strategy',
    question:
      existing?.question ??
      'Increase Harvi marketing spend vs optimize fulfillment capacity?',
    category: 'business',
    linkedDecisionId: existing?.id,
    goalIds: [harviGoal.id],
    initiativeIds: harviGoal.initiativeId ? [harviGoal.initiativeId] : [],
  };
}

function matchWealthRebalance(
  signal: IntelligenceSignal,
  goalContext: GoalContext,
  decisionContext: DecisionContext,
): DecisionPoint | null {
  if (!signal.source.includes('wealth') && signal.applicationId !== 'wealth') return null;

  const financialGoal = goalContext.goals.find(
    (g) => g.target?.metric === 'net_worth_pct' || g.category === 'financial',
  );
  if (!financialGoal) return null;

  const behind = (financialGoal.progress.pct ?? 100) < 70;
  if (!behind) {
    const existing = openDecisionForGoal(decisionContext, financialGoal.id);
    if (existing && signal.applicationId === 'wealth') {
      return {
        signalId: signal.id,
        title: existing.title,
        question: existing.question,
        category: 'financial',
        linkedDecisionId: existing.id,
        goalIds: existing.goalIds,
        initiativeIds: existing.initiativeIds,
      };
    }
    return null;
  }

  const existing = openDecisionForGoal(decisionContext, financialGoal.id);
  return {
    signalId: signal.id,
    title: existing?.title ?? 'Portfolio mining exposure',
    question: existing?.question ?? 'Rebalance mining exposure in portfolio?',
    category: 'financial',
    linkedDecisionId: existing?.id,
    goalIds: [financialGoal.id],
    initiativeIds: financialGoal.initiativeId ? [financialGoal.initiativeId] : [],
  };
}

function matchResearchDecision(
  signal: IntelligenceSignal,
  goalContext: GoalContext,
): DecisionPoint | null {
  if (!signal.source.startsWith('research')) return null;
  const goal = goalContext.goals.find(
    (g) => g.category === 'research' || g.category === 'learning',
  );
  return {
    signalId: signal.id,
    title: 'Research follow-up decision',
    question: `How should you act on: ${signal.title}?`,
    category: 'research',
    goalIds: goal ? [goal.id] : [],
    initiativeIds: goal?.initiativeId ? [goal.initiativeId] : [],
  };
}

function matchGoalRiskDecision(
  signal: IntelligenceSignal,
  insight: StrategicInsight,
  decisionContext: DecisionContext,
): DecisionPoint | null {
  if (insight.kind !== 'goal_risk') return null;
  if (!insight.goalId) return null;
  const existing = openDecisionForGoal(decisionContext, insight.goalId);
  return {
    signalId: signal.id,
    title: existing?.title ?? `Intervene on ${insight.title}`,
    question:
      existing?.question ??
      `Should you intervene on ${insight.title} or accept the delay?`,
    category: 'operational',
    linkedDecisionId: existing?.id,
    goalIds: [insight.goalId],
    initiativeIds: insight.initiativeId ? [insight.initiativeId] : [],
  };
}

function matchCodingBlocker(
  signal: IntelligenceSignal,
  decisionContext: DecisionContext,
): DecisionPoint | null {
  if (!signal.source.includes('coding')) return null;
  if (signal.kind !== 'blocker' && !signal.title.toLowerCase().includes('block')) return null;
  const existing = decisionContext.openDecisions.find((d) =>
    d.applicationIds?.includes('coding-studio'),
  );
  return {
    signalId: signal.id,
    title: existing?.title ?? 'Project scope decision',
    question: existing?.question ?? 'Cut scope or shift resources to unblock delivery?',
    category: 'operational',
    linkedDecisionId: existing?.id,
    goalIds: existing?.goalIds ?? [],
    initiativeIds: existing?.initiativeIds ?? [],
  };
}

export function detectDecisionPoints(
  signals: IntelligenceSignal[],
  goalContext: GoalContext,
  decisionContext: DecisionContext,
  strategicInsights: StrategicInsight[] = [],
): IntelligenceSignal[] {
  const riskInsights = strategicInsights.filter((i) => i.kind === 'goal_risk');

  return signals.map((signal) => {
    if (signal.decisionPoint) return signal;

    const points: DecisionPoint[] = [
      matchApprovalDecision(signal, decisionContext),
      matchHarviTradeoff(signal, goalContext, decisionContext),
      matchWealthRebalance(signal, goalContext, decisionContext),
      matchResearchDecision(signal, goalContext),
      matchCodingBlocker(signal, decisionContext),
      ...riskInsights.map((i) => matchGoalRiskDecision(signal, i, decisionContext)),
    ].filter((p): p is DecisionPoint => p != null);

    if (points.length === 0) return signal;

    const best = points[0]!;
    return {
      ...signal,
      decisionPoint: best,
      kind: signal.kind ?? 'decision',
    };
  });
}
