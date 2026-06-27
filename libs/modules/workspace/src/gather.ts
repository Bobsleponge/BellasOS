import type {
  Artifact,
  CallContext,
  Decision,
  Goal,
  Initiative,
  ModuleContext,
  Workspace,
  WorkspaceGatherCounts,
} from '@bellasos/contracts';
import { bridgeCodingProject, bridgeResearchReport } from './artifact-adapters';
import { saveArtifact, saveWorkspace } from './store';

function uniq(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

function textMatches(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => k.length > 2 && lower.includes(k.toLowerCase()));
}

function appsForType(type: Workspace['type']): string[] {
  switch (type) {
    case 'business':
      return ['harvi-and-co', 'truafrica', 'intelligence'];
    case 'investment':
      return ['wealth', 'intelligence'];
    case 'research':
      return ['research', 'intelligence'];
    case 'project':
      return ['coding-studio', 'intelligence'];
    case 'strategy':
      return ['research', 'intelligence', 'truafrica', 'harvi-and-co'];
    default:
      return ['intelligence'];
  }
}

function sectorsForType(type: Workspace['type']): string[] {
  switch (type) {
    case 'business':
      return ['user_business', 'technology', 'south_africa'];
    case 'investment':
      return ['markets', 'user_investments', 'mining', 'macroeconomics'];
    case 'research':
      return ['ai', 'technology', 'user_research'];
    case 'project':
      return ['user_projects', 'technology'];
    case 'strategy':
      return ['macroeconomics', 'user_business'];
    default:
      return ['macroeconomics'];
  }
}

async function safeDispatch(
  ctx: ModuleContext,
  call: CallContext,
  moduleId: string,
  action: string,
  input: unknown = {},
): Promise<unknown> {
  try {
    return await ctx.call.call(moduleId, action, input, call);
  } catch {
    return null;
  }
}

export async function gatherWorkspace(
  ctx: ModuleContext,
  call: CallContext,
  workspace: Workspace,
): Promise<{ workspace: Workspace; added: WorkspaceGatherCounts }> {
  const before = {
    goals: workspace.goalIds.length,
    initiatives: workspace.initiativeIds.length,
    decisions: workspace.decisionIds.length,
    research: workspace.researchIds.length,
    artifacts: workspace.artifactIds.length,
    applications: workspace.applicationIds.length,
  };

  const goalContext = (await safeDispatch(ctx, call, 'bellasos.execution', 'context.load', {})) as {
    goals?: Goal[];
    initiatives?: Initiative[];
  } | null;

  const decisionContext = (await safeDispatch(
    ctx,
    call,
    'bellasos.execution',
    'decision.context.load',
    {},
  )) as { decisions?: Decision[] } | null;

  const goals = goalContext?.goals ?? [];
  const initiatives = goalContext?.initiatives ?? [];
  const decisions = decisionContext?.decisions ?? [];

  const goalIds: string[] = [...workspace.goalIds];
  const initiativeIds: string[] = [...workspace.initiativeIds];
  const decisionIds: string[] = [...workspace.decisionIds];
  const applicationIds: string[] = [...workspace.applicationIds, ...appsForType(workspace.type)];
  const worldSectorTags: string[] = [...workspace.worldSectorTags, ...sectorsForType(workspace.type)];
  const researchIds: string[] = [...workspace.researchIds];
  const artifactIds: string[] = [...workspace.artifactIds];

  for (const goal of goals) {
    if (goal.status !== 'active') continue;
    const match =
      workspace.applicationIds.some((app) => goal.applicationIds?.includes(app)) ||
      (workspace.organizationId && goal.organizationId === workspace.organizationId) ||
      textMatches(goal.objective, workspace.keywords) ||
      (workspace.type === 'investment' && goal.category === 'financial') ||
      (workspace.type === 'business' && goal.category === 'business') ||
      (workspace.type === 'research' && (goal.category === 'research' || goal.category === 'learning')) ||
      (workspace.type === 'project' && goal.category === 'operational');
    if (match) goalIds.push(goal.id);
  }

  for (const initiative of initiatives) {
    if (initiative.status !== 'active') continue;
    const match =
      workspace.applicationIds.some((app) => initiative.applicationIds.includes(app)) ||
      textMatches(initiative.name, workspace.keywords);
    if (match) initiativeIds.push(initiative.id);
  }

  for (const decision of decisions) {
    if (!['open', 'deferred'].includes(decision.status)) continue;
    const match =
      decision.goalIds.some((id) => goalIds.includes(id)) ||
      textMatches(decision.title, workspace.keywords) ||
      textMatches(decision.question, workspace.keywords);
    if (match) decisionIds.push(decision.id);
  }

  const reportsRaw = await safeDispatch(ctx, call, 'bellasos.research', 'reports.list', {});
  if (Array.isArray(reportsRaw)) {
    for (const raw of reportsRaw.slice(0, 10)) {
      const report = raw as { id?: string; subject?: string; title?: string };
      const subject = String(report.subject ?? report.title ?? '');
      if (!textMatches(subject, workspace.keywords) && workspace.type !== 'research') continue;
      const reportId = String(report.id ?? subject);
      researchIds.push(reportId);
      const artifact = await bridgeResearchReport(reportId, report, workspace.id, call.principal.id);
      await saveArtifact(ctx, artifact);
      artifactIds.push(artifact.id);
    }
  }

  const codingRaw = await safeDispatch(ctx, call, 'bellasos.coding', 'project.list', {});
  if (Array.isArray(codingRaw) && workspace.type === 'project') {
    for (const raw of codingRaw.slice(0, 5)) {
      const project = raw as { id?: string; name?: string; title?: string };
      const name = String(project.name ?? project.title ?? project.id ?? '');
      if (!textMatches(name, workspace.keywords) && workspace.keywords.length > 0) continue;
      const artifact = await bridgeCodingProject(project, workspace.id, call.principal.id);
      await saveArtifact(ctx, artifact);
      artifactIds.push(artifact.id);
    }
  }

  const updated: Workspace = {
    ...workspace,
    goalIds: uniq(goalIds),
    initiativeIds: uniq(initiativeIds),
    decisionIds: uniq(decisionIds),
    applicationIds: uniq(applicationIds),
    worldSectorTags: uniq(worldSectorTags),
    researchIds: uniq(researchIds),
    artifactIds: uniq(artifactIds),
    progressSummary: `Linked ${uniq(goalIds).length} goals, ${uniq(decisionIds).length} decisions, ${uniq(artifactIds).length} artifacts.`,
    updatedAt: new Date().toISOString(),
  };

  await saveWorkspace(ctx, updated);

  return {
    workspace: updated,
    added: {
      goals: updated.goalIds.length - before.goals,
      initiatives: updated.initiativeIds.length - before.initiatives,
      decisions: updated.decisionIds.length - before.decisions,
      research: updated.researchIds.length - before.research,
      artifacts: updated.artifactIds.length - before.artifacts,
      applications: updated.applicationIds.length - before.applications,
    },
  };
}
