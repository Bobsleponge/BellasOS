import { z } from 'zod';
import {
  HOST_API_VERSION,
  type Artifact,
  type CallContext,
  type DecisionSummary,
  type FocusSession,
  type Goal,
  type Initiative,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
  type Workspace,
  type WorkspaceContext,
  type WorkspaceType,
} from '@bellasos/contracts';
import { nativeArtifact } from './artifact-adapters';
import { gatherWorkspace } from './gather';
import {
  getActiveSession,
  getArtifact,
  getWorkspace,
  listArtifacts,
  listSessions,
  listWorkspaces,
  nowIso,
  saveArtifact,
  saveSession,
  saveWorkspace,
} from './store';
import { templateForType, templateFromMessage } from './templates';

const createInput = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  type: z.enum(['research', 'business', 'investment', 'project', 'strategy', 'custom']),
  keywords: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  applicationIds: z.array(z.string()).optional(),
  fromMessage: z.string().optional(),
});

const updateInput = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  objective: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  progressSummary: z.string().optional(),
});

const idInput = z.object({ id: z.string().min(1) });

const sessionStartInput = z.object({
  workspaceId: z.string().optional(),
  focusKind: z
    .enum(['research', 'project', 'decision', 'analysis', 'planning', 'general'])
    .optional(),
  jarvisSessionId: z.string().optional(),
  applicationId: z.string().optional(),
});

const artifactCreateInput = z.object({
  kind: z.enum([
    'research_report',
    'investment_thesis',
    'decision_record',
    'meeting_notes',
    'plan',
    'strategy',
    'coding_project',
    'document',
  ]),
  title: z.string().min(1),
  summary: z.string().optional(),
  workspaceId: z.string().optional(),
  goalIds: z.array(z.string()).optional(),
});

const manifest: ModuleManifest = {
  id: 'bellasos.workspace',
  name: 'Workspace',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description: 'Objective-centered workspaces for execution and focus sessions.',
  permissions: [
    { key: 'workspace.read', description: 'View workspaces and artifacts' },
    { key: 'workspace.run', description: 'Activate and gather workspaces' },
    { key: 'workspace.manage', description: 'Create and archive workspaces' },
  ],
  actions: [
    { name: 'workspace.create', permission: 'workspace.manage', inputSchema: createInput },
    { name: 'workspace.update', permission: 'workspace.manage', inputSchema: updateInput },
    { name: 'workspace.list', permission: 'workspace.read' },
    { name: 'workspace.get', permission: 'workspace.read', inputSchema: idInput },
    { name: 'workspace.activate', permission: 'workspace.run', inputSchema: idInput },
    { name: 'workspace.pause', permission: 'workspace.run', inputSchema: idInput },
    { name: 'workspace.archive', permission: 'workspace.manage', inputSchema: idInput },
    { name: 'workspace.restore', permission: 'workspace.manage', inputSchema: idInput },
    { name: 'workspace.gather', permission: 'workspace.run', inputSchema: idInput },
    { name: 'workspace.context.load', permission: 'workspace.read', inputSchema: idInput },
    { name: 'workspace.fromMessage', permission: 'workspace.manage' },
    { name: 'session.start', permission: 'workspace.run', inputSchema: sessionStartInput },
    { name: 'session.end', permission: 'workspace.run', inputSchema: idInput },
    { name: 'session.getActive', permission: 'workspace.read' },
    { name: 'artifact.create', permission: 'workspace.manage', inputSchema: artifactCreateInput },
    { name: 'artifact.list', permission: 'workspace.read' },
    { name: 'artifact.get', permission: 'workspace.read', inputSchema: idInput },
    { name: 'artifact.promote', permission: 'workspace.run', inputSchema: idInput },
  ],
  events: [],
  settings: [],
  widgets: [],
};

function toDecisionSummaries(
  decisions: Array<{
    id: string;
    title: string;
    question?: string;
    status: string;
    category?: string;
    priority?: number;
    options?: unknown[];
    deadlineAt?: string;
    goalIds?: string[];
    initiativeIds?: string[];
  }>,
): DecisionSummary[] {
  return decisions.map((d) => ({
    id: d.id,
    title: d.title,
    question: d.question ?? d.title,
    status: d.status as DecisionSummary['status'],
    category: (d.category ?? 'strategic') as DecisionSummary['category'],
    priority: (d.priority ?? 3) as DecisionSummary['priority'],
    optionCount: Array.isArray(d.options) ? d.options.length : 0,
    deadlineAt: d.deadlineAt,
    goalIds: d.goalIds ?? [],
    initiativeIds: d.initiativeIds ?? [],
  }));
}

async function loadWorkspaceContext(
  ctx: ModuleContext,
  call: CallContext,
  workspaceId: string,
): Promise<WorkspaceContext | null> {
  const workspace = await getWorkspace(ctx, call.principal.id, workspaceId);
  if (!workspace) return null;

  const goalContext = (await ctx.call.call('bellasos.execution', 'context.load', {}, call)) as {
    goals?: Goal[];
    initiatives?: Initiative[];
  };

  const decisionContext = (await ctx.call.call(
    'bellasos.execution',
    'decision.context.load',
    {},
    call,
  )) as {
    decisions?: Array<{
      id: string;
      title: string;
      question?: string;
      status: string;
      category?: string;
      priority?: number;
      options?: unknown[];
      deadlineAt?: string;
      goalIds?: string[];
      initiativeIds?: string[];
    }>;
  };

  const goals = (goalContext?.goals ?? []).filter((g) => workspace.goalIds.includes(g.id));
  const initiatives = (goalContext?.initiatives ?? []).filter((i) =>
    workspace.initiativeIds.includes(i.id),
  );
  const openDecisions = toDecisionSummaries(
    (decisionContext?.decisions ?? []).filter(
      (d) => workspace.decisionIds.includes(d.id) && ['open', 'deferred'].includes(d.status),
    ),
  );
  const artifacts = (await listArtifacts(ctx, call.principal.id, { workspaceId })).filter((a) =>
    workspace.artifactIds.includes(a.id),
  );
  const activeSession = await getActiveSession(ctx, call.principal.id);

  let recentMemories: WorkspaceContext['recentMemories'] = [];
  try {
    const hits = await ctx.memory.recall({
      ownerId: call.principal.id,
      query: workspace.title,
      limit: 3,
    });
    recentMemories = hits.map((h) => ({ id: h.id, content: h.content, tags: h.tags }));
  } catch {
    /* optional */
  }

  return {
    workspace,
    activeSession: activeSession ?? undefined,
    goals,
    initiatives,
    openDecisions,
    artifacts,
    recentMemories,
    worldPulse: [],
    applicationCapabilities: workspace.applicationIds.map((app) => `${app}.read`),
  };
}

export function createWorkspaceModule(): ModuleRuntime {
  let ctx!: ModuleContext;

  return {
    manifest,
    async onInstall(c) {
      ctx = c;
    },
    async onEnable(c) {
      ctx = c;
    },
    async onDisable() {},
    async onUninstall() {},
    async handle(action: string, input: unknown, call: CallContext) {
      const ownerId = call.principal.id;
      const now = nowIso();

      switch (action) {
        case 'workspace.create': {
          const body = createInput.parse(input);
          let template = templateForType(body.type as WorkspaceType);
          if (body.fromMessage) {
            template = templateFromMessage(body.fromMessage) ?? template;
          }
          const workspace: Workspace = {
            id: crypto.randomUUID(),
            title: body.title || template.title,
            objective: body.objective || template.objective,
            type: body.type,
            status: 'draft',
            domainId: template.domainId,
            organizationId: body.organizationId ?? template.organizationId,
            applicationIds: body.applicationIds ?? template.applicationIds,
            goalIds: [],
            initiativeIds: [],
            decisionIds: [],
            artifactIds: [],
            researchIds: [],
            memoryIds: [],
            worldSectorTags: template.worldSectorTags,
            keywords: body.keywords ?? template.keywords,
            ownerId,
            createdAt: now,
            updatedAt: now,
          };
          await saveWorkspace(ctx, workspace);
          return workspace;
        }
        case 'workspace.fromMessage': {
          const message = String((input as { message?: string })?.message ?? '');
          const template = templateFromMessage(message);
          if (!template) return { matched: false };
          const workspace: Workspace = {
            id: crypto.randomUUID(),
            title: template.title,
            objective: template.objective,
            type: template.type,
            status: 'draft',
            domainId: template.domainId,
            organizationId: template.organizationId,
            applicationIds: template.applicationIds,
            goalIds: [],
            initiativeIds: [],
            decisionIds: [],
            artifactIds: [],
            researchIds: [],
            memoryIds: [],
            worldSectorTags: template.worldSectorTags,
            keywords: template.keywords.length ? template.keywords : message.split(/\s+/).slice(0, 5),
            ownerId,
            createdAt: now,
            updatedAt: now,
          };
          await saveWorkspace(ctx, workspace);
          const gathered = await gatherWorkspace(ctx, call, workspace);
          const activated = {
            ...gathered.workspace,
            status: 'active' as const,
            activatedAt: now,
            updatedAt: now,
          };
          await saveWorkspace(ctx, activated);
          const session: FocusSession = {
            id: crypto.randomUUID(),
            workspaceId: activated.id,
            focusKind: template.focusKind,
            status: 'active',
            ownerId,
            startedAt: now,
            jarvisSessionId: (input as { jarvisSessionId?: string })?.jarvisSessionId,
          };
          await saveSession(ctx, session);
          return {
            matched: true,
            workspace: activated,
            session,
            added: gathered.added,
            openApp: template.openApp,
          };
        }
        case 'workspace.update': {
          const body = updateInput.parse(input);
          const existing = await getWorkspace(ctx, ownerId, body.id);
          if (!existing) throw new Error('Workspace not found');
          const updated = {
            ...existing,
            ...body,
            updatedAt: now,
          };
          return saveWorkspace(ctx, updated);
        }
        case 'workspace.list': {
          const filters = input as { status?: Workspace['status']; type?: WorkspaceType };
          return listWorkspaces(ctx, ownerId, filters);
        }
        case 'workspace.get': {
          const { id } = idInput.parse(input);
          return getWorkspace(ctx, ownerId, id);
        }
        case 'workspace.gather': {
          const { id } = idInput.parse(input);
          const workspace = await getWorkspace(ctx, ownerId, id);
          if (!workspace) throw new Error('Workspace not found');
          return gatherWorkspace(ctx, call, workspace);
        }
        case 'workspace.activate': {
          const { id } = idInput.parse(input);
          const workspace = await getWorkspace(ctx, ownerId, id);
          if (!workspace) throw new Error('Workspace not found');
          const gathered = await gatherWorkspace(ctx, call, workspace);
          const activated = {
            ...gathered.workspace,
            status: 'active' as const,
            activatedAt: now,
            archivedAt: undefined,
            updatedAt: now,
          };
          await saveWorkspace(ctx, activated);
          const existing = await getActiveSession(ctx, ownerId);
          if (existing) {
            await saveSession(ctx, { ...existing, status: 'ended', endedAt: now });
          }
          const session: FocusSession = {
            id: crypto.randomUUID(),
            workspaceId: activated.id,
            focusKind: 'general',
            status: 'active',
            ownerId,
            startedAt: now,
            jarvisSessionId: (input as { jarvisSessionId?: string })?.jarvisSessionId,
          };
          await saveSession(ctx, session);
          return { workspace: activated, session, added: gathered.added };
        }
        case 'workspace.pause': {
          const { id } = idInput.parse(input);
          const workspace = await getWorkspace(ctx, ownerId, id);
          if (!workspace) throw new Error('Workspace not found');
          const paused = { ...workspace, status: 'paused' as const, updatedAt: now };
          await saveWorkspace(ctx, paused);
          const active = await getActiveSession(ctx, ownerId);
          if (active?.workspaceId === id) {
            await saveSession(ctx, { ...active, status: 'paused' });
          }
          return paused;
        }
        case 'workspace.archive': {
          const { id } = idInput.parse(input);
          const workspace = await getWorkspace(ctx, ownerId, id);
          if (!workspace) throw new Error('Workspace not found');
          const archived = {
            ...workspace,
            status: 'archived' as const,
            archivedAt: now,
            updatedAt: now,
          };
          await saveWorkspace(ctx, archived);
          const active = await getActiveSession(ctx, ownerId);
          if (active?.workspaceId === id) {
            await saveSession(ctx, { ...active, status: 'ended', endedAt: now, summary: workspace.progressSummary });
          }
          return archived;
        }
        case 'workspace.restore': {
          const { id } = idInput.parse(input);
          const workspace = await getWorkspace(ctx, ownerId, id);
          if (!workspace) throw new Error('Workspace not found');
          const restored = {
            ...workspace,
            status: 'paused' as const,
            archivedAt: undefined,
            updatedAt: now,
          };
          return saveWorkspace(ctx, restored);
        }
        case 'workspace.context.load': {
          const workspaceId = (input as { workspaceId?: string; id?: string })?.workspaceId
            ?? (input as { id?: string })?.id;
          if (!workspaceId) {
            const active = await getActiveSession(ctx, ownerId);
            if (!active?.workspaceId) return { workspace: null, goals: [], initiatives: [], openDecisions: [], artifacts: [] };
            return loadWorkspaceContext(ctx, call, active.workspaceId);
          }
          return loadWorkspaceContext(ctx, call, workspaceId);
        }
        case 'session.start': {
          const body = sessionStartInput.parse(input);
          const existing = await getActiveSession(ctx, ownerId);
          if (existing) {
            await saveSession(ctx, { ...existing, status: 'ended', endedAt: now });
          }
          const session: FocusSession = {
            id: crypto.randomUUID(),
            workspaceId: body.workspaceId,
            focusKind: body.focusKind ?? 'general',
            jarvisSessionId: body.jarvisSessionId,
            applicationId: body.applicationId,
            status: 'active',
            ownerId,
            startedAt: now,
          };
          return saveSession(ctx, session);
        }
        case 'session.end': {
          const { id } = idInput.parse(input);
          const sessions = await listSessions(ctx, ownerId);
          const session = sessions.find((s) => s.id === id);
          if (!session) throw new Error('Session not found');
          return saveSession(ctx, { ...session, status: 'ended', endedAt: now });
        }
        case 'session.getActive':
          return getActiveSession(ctx, ownerId);
        case 'artifact.create': {
          const body = artifactCreateInput.parse(input);
          const artifact = nativeArtifact({
            kind: body.kind,
            title: body.title,
            summary: body.summary,
            workspaceId: body.workspaceId,
            goalIds: body.goalIds,
            ownerId,
          });
          await saveArtifact(ctx, artifact);
          if (body.workspaceId) {
            const ws = await getWorkspace(ctx, ownerId, body.workspaceId);
            if (ws) {
              await saveWorkspace(ctx, {
                ...ws,
                artifactIds: [...new Set([...ws.artifactIds, artifact.id])],
                updatedAt: now,
              });
            }
          }
          return artifact;
        }
        case 'artifact.list': {
          const filters = input as { workspaceId?: string; kind?: Artifact['kind'] };
          return listArtifacts(ctx, ownerId, filters);
        }
        case 'artifact.get': {
          const { id } = idInput.parse(input);
          return getArtifact(ctx, ownerId, id);
        }
        case 'artifact.promote': {
          const { id } = idInput.parse(input);
          const artifact = await getArtifact(ctx, ownerId, id);
          if (!artifact) throw new Error('Artifact not found');
          const item = await ctx.memory.remember({
            tier: 'long',
            memoryClass: 'knowledge',
            ownerId,
            content: `${artifact.title}\n${artifact.summary ?? ''}`,
            tags: ['workspace', 'artifact', artifact.kind],
            domainId: 'execution',
            sourceRef: { type: 'artifact', id: artifact.id },
          });
          const updated = { ...artifact, memoryId: item.id, updatedAt: now };
          return saveArtifact(ctx, updated);
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}
