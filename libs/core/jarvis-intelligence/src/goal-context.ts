import type { CallContext, GoalContext } from '@bellasos/contracts';
import type { IntelligencePlatform } from './types';

export async function loadGoalContext(
  platform: IntelligencePlatform,
  ctx: CallContext,
  applicationId?: string,
): Promise<GoalContext> {
  try {
    const result = (await platform.registry.dispatch(
      'bellasos.execution',
      'context.load',
      { applicationId },
      ctx,
    )) as GoalContext;
    return {
      goals: result.goals ?? [],
      initiatives: result.initiatives ?? [],
      activeGoalIds: result.activeGoalIds ?? [],
      activeInitiativeIds: result.activeInitiativeIds ?? [],
      focusGoalId: result.focusGoalId,
      focusInitiativeId: result.focusInitiativeId,
    };
  } catch {
    return {
      goals: [],
      initiatives: [],
      activeGoalIds: [],
      activeInitiativeIds: [],
    };
  }
}

export function initiativeById(
  goalContext: GoalContext,
  initiativeId?: string,
): GoalContext['initiatives'][number] | undefined {
  if (!initiativeId) return undefined;
  return goalContext.initiatives.find((i) => i.id === initiativeId);
}

export function goalById(
  goalContext: GoalContext,
  goalId: string,
): GoalContext['goals'][number] | undefined {
  return goalContext.goals.find((g) => g.id === goalId);
}

export function topActiveGoals(goalContext: GoalContext, max = 3) {
  return [...goalContext.goals]
    .filter((g) => g.status === 'active')
    .sort((a, b) => a.priority - b.priority)
    .slice(0, max);
}

export function formatGoalsForPrompt(goalContext: GoalContext): string {
  const goals = topActiveGoals(goalContext, 3);
  if (goals.length === 0) return '';
  return goals
    .map((g) => {
      const pct = g.progress.pct != null ? `${g.progress.pct}%` : 'n/a';
      return `${g.objective} (${pct}, priority ${g.priority})`;
    })
    .join('; ');
}
