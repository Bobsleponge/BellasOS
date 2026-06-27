import type { ContextStack, DecisionContext, GoalContext, WorldContext, WorkspaceContext } from '@bellasos/contracts';
import { domainRelevanceBoost } from './context';
import { decisionScoreForSignal } from './decision-recommendations';
import { strategicScoreForSignal } from './signal-goal-linker';
import { workspaceWeightForSignal } from './workspace-intelligence';
import type { IntelligenceSignal, SignalTier } from './types';

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').trim();
}

function tierFromComposite(composite: number): SignalTier {
  if (composite >= 0.72) return 'immediate';
  if (composite >= 0.45) return 'briefing';
  if (composite >= 0.3) return 'notification';
  return 'silent';
}

function urgencyFromAge(createdAt?: string): number {
  if (!createdAt) return 0.5;
  const hours = (Date.now() - Date.parse(createdAt)) / 3_600_000;
  if (!Number.isFinite(hours)) return 0.5;
  if (hours < 2) return 1;
  if (hours < 24) return 0.7;
  return 0.4;
}

function strategicWeight(
  signal: IntelligenceSignal,
  goalContext?: GoalContext,
): number {
  let weight = 1.0;
  const score = strategicScoreForSignal(signal);
  if (score > 0) weight += score * 0.35;

  if (signal.goalImpact?.length) {
    const topImpact = signal.goalImpact[0];
    const goal = goalContext?.goals.find((g) => g.id === topImpact?.goalId);
    if (goal) {
      weight += (6 - goal.priority) * 0.07;
      const days =
        goal.deadlineAt != null
          ? (Date.parse(goal.deadlineAt) - Date.now()) / 86_400_000
          : null;
      if (days != null && days <= 7 && days >= 0) weight += 0.25;
      if (days != null && days < 0) weight += 0.4;
    }
    const initiative = goalContext?.initiatives.find(
      (i) => i.id === topImpact?.initiativeId,
    );
    if (initiative?.momentum === 'blocked') weight += 0.3;
    if (initiative?.momentum === 'accelerating') weight += 0.1;
    if (
      goalContext?.focusInitiativeId &&
      topImpact?.initiativeId === goalContext.focusInitiativeId
    ) {
      weight += 0.2;
    }
  }

  return Math.min(weight, 2.0);
}

function decisionWeight(
  signal: IntelligenceSignal,
  decisionContext?: DecisionContext,
): number {
  let weight = 1.0;
  const score = decisionScoreForSignal(signal);
  if (score > 0) weight += score * 0.25;

  if (signal.decisionRecommendation?.confidence.score) {
    if (signal.decisionRecommendation.confidence.score > 0.7) weight += 0.15;
  }

  if (signal.decisionPoint?.linkedDecisionId && decisionContext) {
    const linked = decisionContext.openDecisions.find(
      (d) => d.id === signal.decisionPoint!.linkedDecisionId,
    );
    if (linked) {
      weight += 0.25;
      const days =
        linked.deadlineAt != null
          ? (Date.parse(linked.deadlineAt) - Date.now()) / 86_400_000
          : null;
      if (days != null && days <= 3 && days >= 0) weight += 0.2;
      if (linked.status === 'deferred') weight += 0.1;
    }
  }

  return Math.min(weight, 2.0);
}

function worldWeight(
  signal: IntelligenceSignal,
  context: ContextStack,
  goalContext?: GoalContext,
  decisionContext?: DecisionContext,
): number {
  if (!signal.worldSignal && !signal.source.startsWith('world.')) return 1.0;

  let weight = 1.0;
  const topGoal = signal.worldRelevance?.goalIds[0];
  if (topGoal && goalContext) {
    const goal = goalContext.goals.find((g) => g.id === topGoal);
    if (goal && goal.priority <= 2) weight += 0.2;
  }

  if (signal.worldRelevance?.decisionIds.length) weight += 0.15;
  if (signal.worldOpportunity?.severity === 'high') weight += 0.15;
  if (context.domain.primary === 'wealth' && signal.worldSignal?.sector === 'markets') {
    weight += 0.1;
  }
  if (context.domain.primary === 'intelligence') weight += 0.05;

  const fetchedAt = signal.worldSignal?.fetchedAt ?? signal.createdAt;
  if (fetchedAt) {
    const hours = (Date.now() - Date.parse(fetchedAt)) / 3_600_000;
    if (hours > 48) weight -= 0.2;
  }

  return Math.min(Math.max(weight, 0.6), 2.0);
}

export function workspaceWeight(
  signal: IntelligenceSignal,
  workspaceContext?: WorkspaceContext | null,
): number {
  return workspaceWeightForSignal(signal, workspaceContext);
}

export function scoreSignal(
  signal: IntelligenceSignal,
  context: ContextStack,
  goalContext?: GoalContext,
  decisionContext?: DecisionContext,
  worldContext?: WorldContext,
  workspaceContext?: WorkspaceContext | null,
): IntelligenceSignal {
  const relevance =
    signal.scores.relevance * domainRelevanceBoost(signal.domain, context);
  const urgency = Math.max(signal.scores.urgency, urgencyFromAge(signal.createdAt));
  const strategic = strategicWeight(signal, goalContext);
  const decision = decisionWeight(signal, decisionContext);
  const world = worldWeight(signal, context, goalContext, decisionContext);
  const workspace = workspaceWeight(signal, workspaceContext);
  const composite =
    signal.scores.importance *
    urgency *
    relevance *
    signal.scores.confidence *
    strategic *
    decision *
    world *
    workspace;

  return {
    ...signal,
    scores: { ...signal.scores, urgency, relevance },
    composite,
    tier: tierFromComposite(composite),
  };
}

export function dedupeSignals(signals: IntelligenceSignal[]): IntelligenceSignal[] {
  const byKey = new Map<string, IntelligenceSignal>();
  for (const signal of signals) {
    const key = `${signal.source}:${normalizeTitle(signal.title)}`;
    const existing = byKey.get(key);
    if (!existing || signal.composite > existing.composite) {
      byKey.set(key, signal);
    }
  }
  return [...byKey.values()];
}

export function rankSignals(
  signals: IntelligenceSignal[],
  context: ContextStack,
  maxItems = 7,
  goalContext?: GoalContext,
  decisionContext?: DecisionContext,
  worldContext?: WorldContext,
  workspaceContext?: WorkspaceContext | null,
): IntelligenceSignal[] {
  const scored = signals.map((s) =>
    scoreSignal(s, context, goalContext, decisionContext, worldContext, workspaceContext),
  );
  const deduped = dedupeSignals(scored);
  deduped.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bTime - aTime;
  });
  return deduped.slice(0, maxItems);
}

export function signalsForBriefing(
  signals: IntelligenceSignal[],
  rhythm: 'morning' | 'midday' | 'evening' | 'night',
): IntelligenceSignal[] {
  if (rhythm === 'night') {
    return signals.filter(
      (s) => s.tier === 'immediate' && s.scores.confidence >= 0.85,
    );
  }
  if (rhythm === 'midday') {
    return signals.filter((s) => s.tier === 'immediate' || s.tier === 'briefing');
  }
  return signals.filter((s) => s.tier !== 'silent');
}

export function intelSignalsForNarrative(signals: IntelligenceSignal[], max = 3): IntelligenceSignal[] {
  return signals
    .filter(
      (s) =>
        s.source.startsWith('intelligence') ||
        s.source.startsWith('ingestion') ||
        s.source.startsWith('world.') ||
        s.kind === 'opportunity' ||
        s.kind === 'risk',
    )
    .slice(0, max);
}

export function worldSignalsForNarrative(signals: IntelligenceSignal[], max = 3): IntelligenceSignal[] {
  return signals
    .filter((s) => s.worldSignal && s.tier !== 'silent')
    .slice(0, max);
}
