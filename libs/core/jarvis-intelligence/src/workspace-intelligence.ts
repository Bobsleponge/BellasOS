import type { WorkspaceContext, WorkspaceProgressSummary } from '@bellasos/contracts';
import type { IntelligenceSignal } from './types';

export function summarizeWorkspaceProgress(
  workspaceContext: WorkspaceContext | null | undefined,
): WorkspaceProgressSummary | undefined {
  if (!workspaceContext?.workspace) return undefined;
  const ws = workspaceContext.workspace;
  const goals = workspaceContext.goals;
  const onTrack =
    goals.length === 0 ||
    goals.every((g) => g.progress.pct == null || g.progress.pct >= 50);

  let headline = ws.progressSummary ?? `${ws.title} is active.`;
  if (goals.length > 0) {
    const top = goals[0];
    if (top) {
      const pct = top.progress.pct;
      headline =
        pct != null
          ? `${ws.title}: ${top.objective} at ${pct}% of target.`
          : `${ws.title}: working on ${top.objective}.`;
    }
  } else if (workspaceContext.openDecisions.length > 0) {
    headline = `${ws.title}: ${workspaceContext.openDecisions.length} decision(s) to consider.`;
  }

  return {
    workspaceId: ws.id,
    title: ws.title,
    objective: ws.objective,
    status: ws.status,
    headline,
    onTrack,
    linkedGoalCount: ws.goalIds.length,
    openDecisionCount: workspaceContext.openDecisions.length,
    artifactCount: workspaceContext.artifacts.length,
  };
}

export function workspaceSignalsForBriefing(
  signals: IntelligenceSignal[],
  workspaceContext?: WorkspaceContext | null,
  max = 2,
): IntelligenceSignal[] {
  if (!workspaceContext?.workspace) return [];
  const goalIds = new Set(workspaceContext.workspace.goalIds);
  const appIds = new Set(workspaceContext.workspace.applicationIds);

  return signals
    .filter((s) => {
      if (s.goalImpact?.some((i) => goalIds.has(i.goalId))) return true;
      if (s.applicationId && appIds.has(s.applicationId)) return true;
      if (s.worldRelevance?.goalIds.some((id) => goalIds.has(id))) return true;
      return false;
    })
    .slice(0, max);
}

export function workspaceWeightForSignal(
  signal: IntelligenceSignal,
  workspaceContext?: WorkspaceContext | null,
): number {
  if (!workspaceContext?.workspace) return 1.0;
  const goalIds = new Set(workspaceContext.workspace.goalIds);
  let weight = 1.0;

  if (signal.goalImpact?.some((i) => goalIds.has(i.goalId))) weight += 0.2;
  if (signal.worldRelevance?.goalIds.some((id) => goalIds.has(id))) weight += 0.15;
  if (
    signal.applicationId &&
    workspaceContext.workspace.applicationIds.includes(signal.applicationId)
  ) {
    weight += 0.1;
  }

  return Math.min(weight, 2.0);
}
