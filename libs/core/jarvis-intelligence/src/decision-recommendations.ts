import type {
  Decision,
  DecisionConfidence,
  DecisionContext,
  DecisionRecommendation,
  GoalContext,
  StrategicInsight,
} from '@bellasos/contracts';
import { decisionById } from './decision-context';
import type { ContextStack, IntelligenceSignal } from './types';

function clampConfidence(score: number): number {
  return Math.min(0.95, Math.max(0.2, score));
}

function computeConfidence(
  signal: IntelligenceSignal,
  goalContext: GoalContext,
  decision?: Decision,
  historicalSuccess = false,
): DecisionConfidence {
  let score = 0.5;
  const factors: string[] = [];

  if (signal.goalImpact?.length) {
    score += 0.1;
    factors.push('Signal linked to active goal');
  }
  const linkedGoal = signal.goalImpact?.[0]?.goalId
    ? goalContext.goals.find((g) => g.id === signal.goalImpact![0]!.goalId)
    : undefined;
  if (linkedGoal && linkedGoal.priority <= 2) {
    score += 0.15;
    factors.push('Linked to high-priority goal');
  }
  if (signal.composite >= 0.6) {
    score += 0.1;
    factors.push('Strong signal relevance');
  }
  if (decision?.confidence?.score) {
    score = (score + decision.confidence.score) / 2;
    factors.push('Existing decision confidence');
  }
  if (historicalSuccess) {
    score += 0.1;
    factors.push('Similar past outcome was positive');
  }
  const blockedInitiative = goalContext.initiatives.find((i) => i.momentum === 'blocked');
  if (blockedInitiative) {
    score -= 0.1;
    factors.push('Blocked initiative adds uncertainty');
  }

  return { score: clampConfidence(score), factors };
}

function recommendationFromDecision(
  decision: Decision,
  signal: IntelligenceSignal,
  confidence: DecisionConfidence,
): DecisionRecommendation {
  const recommended = decision.options.find((o) => o.recommended) ?? decision.options[0];
  const alternative = decision.options.find((o) => o.id !== recommended?.id);
  const tradeoffLine = alternative
    ? `${recommended?.label} vs ${alternative.label}: ${recommended?.estimatedImpact ?? 'higher upside'} but ${alternative.cons?.[0] ?? 'tradeoffs exist'}.`
    : `${recommended?.label} is the recommended path based on current goals.`;

  return {
    id: `rec-${decision.id}-${signal.id}`,
    decisionId: decision.id,
    signalId: signal.id,
    title: decision.title,
    question: decision.question,
    recommendedOption: recommended?.label ?? 'Review options',
    tradeoffLine,
    risks: recommended?.cons ?? [],
    opportunities: recommended?.pros ?? [],
    confidence,
    rationale:
      decision.rationale ??
      signal.goalImpact?.[0]?.relevanceLine ??
      'This decision affects your active strategic goals.',
    goalIds: decision.goalIds,
    initiativeIds: decision.initiativeIds,
    nextAction: `Review "${decision.title}" and choose an option.`,
  };
}

function recommendationFromPoint(
  signal: IntelligenceSignal,
  goalContext: GoalContext,
  confidence: DecisionConfidence,
): DecisionRecommendation | null {
  const point = signal.decisionPoint;
  if (!point) return null;

  if (point.category === 'business' && point.title.includes('Harvi')) {
    return {
      id: `rec-harvi-${signal.id}`,
      signalId: signal.id,
      title: point.title,
      question: point.question,
      recommendedOption: 'Increase marketing spend',
      tradeoffLine:
        'Marketing drives faster order growth but increases CAC; ops optimization improves margins but slows top-line growth.',
      risks: ['Budget pressure', 'Higher CAC'],
      opportunities: ['+3-5 orders/week', 'Brand awareness'],
      confidence,
      rationale: signal.goalImpact?.[0]?.relevanceLine ?? 'Harvi weekly order target needs attention.',
      goalIds: point.goalIds,
      initiativeIds: point.initiativeIds,
      nextAction: 'Decide between marketing spend and fulfillment optimization for Harvi.',
    };
  }

  if (point.category === 'financial') {
    return {
      id: `rec-wealth-${signal.id}`,
      signalId: signal.id,
      title: point.title,
      question: point.question,
      recommendedOption: 'Review allocation in Wealth',
      tradeoffLine:
        'Rebalancing reduces sector concentration but may forgo mining upside; holding maintains exposure to volatility.',
      risks: ['Sector concentration', 'Missed diversification'],
      opportunities: ['Lower volatility', 'Align with net worth goal'],
      confidence,
      rationale: 'Net worth growth is behind quarterly target.',
      goalIds: point.goalIds,
      initiativeIds: point.initiativeIds,
      nextAction: 'Open Wealth and review mining exposure options.',
    };
  }

  if (point.category === 'operational' && signal.source.startsWith('approval')) {
    return {
      id: `rec-approval-${signal.id}`,
      decisionId: point.linkedDecisionId,
      signalId: signal.id,
      title: point.title,
      question: point.question,
      recommendedOption: 'Review and approve in System Console',
      tradeoffLine: 'Delaying may block downstream work; approving commits to the action.',
      risks: ['Blocks operational goals'],
      opportunities: ['Clears decision queue'],
      confidence,
      rationale: signal.relevanceLine ?? 'Pending approval requires your decision.',
      goalIds: point.goalIds,
      initiativeIds: point.initiativeIds,
      nextAction: 'Review and approve in System Console.',
    };
  }

  return {
    id: `rec-${signal.id}`,
    decisionId: point.linkedDecisionId,
    signalId: signal.id,
    title: point.title,
    question: point.question,
    recommendedOption: 'Evaluate options and commit a choice',
    tradeoffLine: 'Each path has different impact on your active goals.',
    risks: ['Delay reduces momentum'],
    opportunities: ['Clarity on next steps'],
    confidence,
    rationale: signal.summary,
    goalIds: point.goalIds,
    initiativeIds: point.initiativeIds,
    nextAction: 'Discuss options with Jarvis or record your decision.',
  };
}

export function generateDecisionRecommendations(
  signals: IntelligenceSignal[],
  goalContext: GoalContext,
  decisionContext: DecisionContext,
  contextStack: ContextStack,
  strategicInsights: StrategicInsight[] = [],
): { signals: IntelligenceSignal[]; recommendations: DecisionRecommendation[] } {
  void contextStack;
  void strategicInsights;

  const historicalSuccess = decisionContext.recentOutcomes.some(
    (o) => (o.successRating ?? 0) >= 4,
  );

  const recommendations: DecisionRecommendation[] = [];
  const updatedSignals = signals.map((signal) => {
    if (signal.decisionRecommendation) {
      recommendations.push(signal.decisionRecommendation);
      return signal;
    }
    if (!signal.decisionPoint) return signal;

    const linkedDecision = signal.decisionPoint.linkedDecisionId
      ? decisionById(decisionContext, signal.decisionPoint.linkedDecisionId)
      : decisionContext.openDecisions.find((d) =>
          d.goalIds.some((g) => signal.decisionPoint!.goalIds.includes(g)),
        );

    const confidence = computeConfidence(
      signal,
      goalContext,
      linkedDecision,
      historicalSuccess,
    );

    const rec = linkedDecision
      ? recommendationFromDecision(linkedDecision, signal, confidence)
      : recommendationFromPoint(signal, goalContext, confidence);

    if (!rec) return signal;
    recommendations.push(rec);
    return { ...signal, decisionRecommendation: rec };
  });

  for (const decision of decisionContext.openDecisions.slice(0, 3)) {
    if (recommendations.some((r) => r.decisionId === decision.id)) continue;
    const confidence = decision.confidence ?? { score: 0.55, factors: ['Open decision'] };
    recommendations.push({
      id: `rec-open-${decision.id}`,
      decisionId: decision.id,
      title: decision.title,
      question: decision.question,
      recommendedOption:
        decision.options.find((o) => o.recommended)?.label ??
        decision.options[0]?.label ??
        'Choose an option',
      tradeoffLine: decision.options.length >= 2
        ? `${decision.options[0]!.label} vs ${decision.options[1]!.label}`
        : decision.question,
      risks: decision.options.flatMap((o) => o.cons).slice(0, 3),
      opportunities: decision.options.flatMap((o) => o.pros).slice(0, 3),
      confidence,
      rationale: decision.rationale ?? decision.question,
      goalIds: decision.goalIds,
      initiativeIds: decision.initiativeIds,
      nextAction: `Decide: ${decision.title}`,
    });
  }

  const deduped = recommendations.filter(
    (r, idx, arr) => arr.findIndex((x) => x.id === r.id) === idx,
  );

  return { signals: updatedSignals, recommendations: deduped.slice(0, 8) };
}

export function decisionScoreForSignal(signal: IntelligenceSignal): number {
  if (signal.decisionRecommendation?.confidence.score) {
    return signal.decisionRecommendation.confidence.score;
  }
  if (signal.decisionPoint) return 0.6;
  return 0;
}
