import type {
  DecisionContext,
  DecisionRecommendation,
  DecisionReview,
  DecisionSummary,
  NextAction,
} from '@bellasos/contracts';
import type { IntelligenceSignal } from './types';

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / 86_400_000);
}

export function summarizeOpenDecisions(
  decisionContext: DecisionContext,
): DecisionSummary[] {
  return decisionContext.openDecisions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      title: d.title,
      question: d.question,
      status: d.status,
      category: d.category,
      priority: d.priority,
      optionCount: d.options.length,
      deadlineAt: d.deadlineAt,
      goalIds: d.goalIds,
      initiativeIds: d.initiativeIds,
    }));
}

export function buildNextActions(
  recommendations: DecisionRecommendation[],
  openDecisions: DecisionSummary[],
): NextAction[] {
  const actions: NextAction[] = [];

  for (const rec of recommendations.slice(0, 3)) {
    if (rec.confidence.score < 0.5) continue;
    actions.push({
      id: `action-${rec.id}`,
      label: rec.nextAction ?? rec.recommendedOption,
      rationale: rec.tradeoffLine,
      confidence: rec.confidence.score,
      decisionId: rec.decisionId,
      signalId: rec.signalId,
    });
  }

  for (const decision of openDecisions) {
    const days = daysUntil(decision.deadlineAt);
    if (days != null && days <= 3 && days >= 0) {
      actions.push({
        id: `action-deadline-${decision.id}`,
        label: `Decision due soon: ${decision.title}`,
        rationale: `${days} day${days === 1 ? '' : 's'} until deadline.`,
        confidence: 0.75,
        decisionId: decision.id,
      });
    }
  }

  return actions.slice(0, 5);
}

export function overdueReviewInsights(
  pendingReviews: DecisionReview[],
): string[] {
  const now = Date.now();
  return pendingReviews
    .filter((r) => Date.parse(r.dueAt) < now)
    .map((r) => `Decision review overdue — assess outcome for decision ${r.decisionId}.`);
}

export function analyzeDecisionIntelligence(
  signals: IntelligenceSignal[],
  decisionContext: DecisionContext,
  recommendations: DecisionRecommendation[],
): {
  openDecisions: DecisionSummary[];
  nextActions: NextAction[];
  reviewAlerts: string[];
} {
  const openDecisions = summarizeOpenDecisions(decisionContext);
  const nextActions = buildNextActions(recommendations, openDecisions);
  const reviewAlerts = overdueReviewInsights(decisionContext.pendingReviews);

  void signals;

  return { openDecisions, nextActions, reviewAlerts };
}
