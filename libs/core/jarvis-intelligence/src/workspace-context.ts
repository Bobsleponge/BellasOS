import type { CallContext, WorkspaceContext } from '@bellasos/contracts';
import type { IntelligencePlatform } from './types';

export async function loadWorkspaceContext(
  platform: IntelligencePlatform,
  ctx: CallContext,
  workspaceId?: string,
): Promise<WorkspaceContext | null> {
  try {
    const result = (await platform.registry.dispatch(
      'bellasos.workspace',
      'workspace.context.load',
      workspaceId ? { workspaceId } : {},
      ctx,
    )) as WorkspaceContext | { workspace: null };
    if (!result || (result as { workspace?: null }).workspace === null) return null;
    if ('workspace' in result && result.workspace) return result as WorkspaceContext;
    return null;
  } catch {
    return null;
  }
}

export function formatWorkspaceContextForPrompt(workspaceContext?: WorkspaceContext | null): string {
  if (!workspaceContext?.workspace) return '';
  const ws = workspaceContext.workspace;
  const parts = [
    `Active workspace: ${ws.title}`,
    `Objective: ${ws.objective}`,
    `Type: ${ws.type}`,
    `Status: ${ws.status}`,
  ];
  if (workspaceContext.goals.length) {
    parts.push(`Workspace goals: ${workspaceContext.goals.map((g) => g.objective).slice(0, 3).join('; ')}`);
  }
  if (workspaceContext.openDecisions.length) {
    parts.push(`Open decisions: ${workspaceContext.openDecisions.map((d) => d.title).slice(0, 2).join('; ')}`);
  }
  if (workspaceContext.artifacts.length) {
    parts.push(`Artifacts: ${workspaceContext.artifacts.map((a) => a.title).slice(0, 3).join('; ')}`);
  }
  return parts.join('. ');
}
