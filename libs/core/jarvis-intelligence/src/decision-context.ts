import type { CallContext, DecisionContext } from '@bellasos/contracts';
import type { IntelligencePlatform } from './types';

export async function loadDecisionContext(
  platform: IntelligencePlatform,
  ctx: CallContext,
  applicationId?: string,
): Promise<DecisionContext> {
  try {
    const result = (await platform.registry.dispatch(
      'bellasos.execution',
      'decision.context.load',
      { applicationId },
      ctx,
    )) as DecisionContext;
    return {
      decisions: result.decisions ?? [],
      openDecisions: result.openDecisions ?? [],
      recentOutcomes: result.recentOutcomes ?? [],
      pendingReviews: result.pendingReviews ?? [],
      focusDecisionId: result.focusDecisionId,
    };
  } catch {
    return {
      decisions: [],
      openDecisions: [],
      recentOutcomes: [],
      pendingReviews: [],
    };
  }
}

export function decisionById(
  decisionContext: DecisionContext,
  decisionId: string,
): DecisionContext['decisions'][number] | undefined {
  return decisionContext.decisions.find((d) => d.id === decisionId);
}

export function openDecisionForGoal(
  decisionContext: DecisionContext,
  goalId: string,
): DecisionContext['openDecisions'][number] | undefined {
  return decisionContext.openDecisions.find((d) => d.goalIds.includes(goalId));
}

export function formatDecisionsForPrompt(decisionContext: DecisionContext): string {
  const open = decisionContext.openDecisions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2);
  if (open.length === 0) return '';
  return open.map((d) => `${d.title} (${d.status})`).join('; ');
}
