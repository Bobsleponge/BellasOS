import type {
  Artifact,
  FocusSession,
  Workspace,
  WorkspaceStatus,
  WorkspaceType,
} from '@bellasos/contracts';
import type { DomainId } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import type { ModuleContext } from '@bellasos/contracts';
import { SEED_OWNER } from './store-shared';

function nowIso(): string {
  return new Date().toISOString();
}

async function listFromStorage<T>(ctx: ModuleContext, prefix: string): Promise<T[]> {
  const items = await ctx.storage.list(prefix);
  return items.map((i) => i.value as T);
}

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: String(row.id),
    title: String(row.title),
    objective: String(row.objective),
    type: row.type as WorkspaceType,
    status: row.status as WorkspaceStatus,
    domainId: row.domainId as DomainId,
    organizationId: row.organizationId ? String(row.organizationId) : undefined,
    applicationIds: Array.isArray(row.applicationIds) ? row.applicationIds.map(String) : [],
    goalIds: Array.isArray(row.goalIds) ? row.goalIds.map(String) : [],
    initiativeIds: Array.isArray(row.initiativeIds) ? row.initiativeIds.map(String) : [],
    decisionIds: Array.isArray(row.decisionIds) ? row.decisionIds.map(String) : [],
    artifactIds: Array.isArray(row.artifactIds) ? row.artifactIds.map(String) : [],
    researchIds: Array.isArray(row.researchIds) ? row.researchIds.map(String) : [],
    memoryIds: Array.isArray(row.memoryIds) ? row.memoryIds.map(String) : [],
    worldSectorTags: Array.isArray(row.worldSectorTags) ? row.worldSectorTags.map(String) : [],
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    progressSummary: row.progressSummary ? String(row.progressSummary) : undefined,
    ownerId: String(row.ownerId),
    activatedAt: row.activatedAt ? String(row.activatedAt) : undefined,
    archivedAt: row.archivedAt ? String(row.archivedAt) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToSession(row: Record<string, unknown>): FocusSession {
  return {
    id: String(row.id),
    workspaceId: row.workspaceId ? String(row.workspaceId) : undefined,
    focusKind: row.focusKind as FocusSession['focusKind'],
    focusEntity: row.focusEntity as FocusSession['focusEntity'],
    jarvisSessionId: row.jarvisSessionId ? String(row.jarvisSessionId) : undefined,
    applicationId: row.applicationId ? String(row.applicationId) : undefined,
    status: row.status as FocusSession['status'],
    summary: row.summary ? String(row.summary) : undefined,
    ownerId: String(row.ownerId),
    startedAt: String(row.startedAt),
    endedAt: row.endedAt ? String(row.endedAt) : undefined,
  };
}

function rowToArtifact(row: Record<string, unknown>): Artifact {
  return {
    id: String(row.id),
    kind: row.kind as Artifact['kind'],
    title: String(row.title),
    summary: row.summary ? String(row.summary) : undefined,
    contentRef: row.contentRef as Artifact['contentRef'],
    workspaceIds: Array.isArray(row.workspaceIds) ? row.workspaceIds.map(String) : [],
    goalIds: Array.isArray(row.goalIds) ? row.goalIds.map(String) : [],
    initiativeIds: Array.isArray(row.initiativeIds) ? row.initiativeIds.map(String) : [],
    decisionIds: Array.isArray(row.decisionIds) ? row.decisionIds.map(String) : [],
    applicationIds: Array.isArray(row.applicationIds) ? row.applicationIds.map(String) : [],
    memoryId: row.memoryId ? String(row.memoryId) : undefined,
    ownerId: String(row.ownerId),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

const DEFAULT_SEED: Workspace = {
  id: '22222222-2222-2222-2222-222222222201',
  title: 'Grow Harvi',
  objective: 'Increase weekly orders and venture momentum for Harvi & Co',
  type: 'business',
  status: 'active',
  domainId: 'ventures',
  organizationId: 'org:harvi',
  applicationIds: ['harvi-and-co', 'intelligence'],
  goalIds: [],
  initiativeIds: [],
  decisionIds: [],
  artifactIds: [],
  researchIds: [],
  memoryIds: [],
  worldSectorTags: ['user_business', 'technology'],
  keywords: ['Harvi', 'orders', 'growth'],
  progressSummary: 'Active business workspace for Harvi growth.',
  ownerId: SEED_OWNER,
  activatedAt: nowIso(),
  createdAt: nowIso(),
  updatedAt: nowIso(),
};

export async function ensureWorkspaceSeed(ctx: ModuleContext): Promise<void> {
  const existing = await ctx.storage.list('workspace:');
  if (existing.length > 0) return;
  await ctx.storage.set(`workspace:${DEFAULT_SEED.id}`, DEFAULT_SEED);
}

export async function listWorkspaces(
  ctx: ModuleContext,
  ownerId: string,
  filters?: { status?: WorkspaceStatus; type?: WorkspaceType },
): Promise<Workspace[]> {
  if (isDbAvailable()) {
    try {
      let q = getDb()
        .selectFrom('execution.workspaces')
        .selectAll()
        .where('owner_id', '=', ownerId);
      if (filters?.status) q = q.where('status', '=', filters.status);
      if (filters?.type) q = q.where('type', '=', filters.type);
      const rows = await q.orderBy('updated_at', 'desc').execute();
      if (rows.length > 0) {
        return rows.map((r) =>
          rowToWorkspace({
            id: r.id,
            title: r.title,
            objective: r.objective,
            type: r.type,
            status: r.status,
            domainId: r.domain_id,
            organizationId: r.organization_id,
            applicationIds: r.application_ids,
            goalIds: r.goal_ids,
            initiativeIds: r.initiative_ids,
            decisionIds: r.decision_ids,
            artifactIds: r.artifact_ids,
            researchIds: r.research_ids,
            memoryIds: r.memory_ids,
            worldSectorTags: r.world_sector_tags,
            keywords: r.keywords,
            progressSummary: r.progress_summary,
            ownerId: r.owner_id,
            activatedAt: r.activated_at,
            archivedAt: r.archived_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }),
        );
      }
    } catch {
      /* fall through */
    }
  }

  await ensureWorkspaceSeed(ctx);
  let workspaces = (await listFromStorage<Workspace>(ctx, 'workspace:')).filter(
    (w) => w.ownerId === ownerId || w.ownerId === SEED_OWNER,
  );
  if (filters?.status) workspaces = workspaces.filter((w) => w.status === filters.status);
  if (filters?.type) workspaces = workspaces.filter((w) => w.type === filters.type);
  return workspaces.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getWorkspace(
  ctx: ModuleContext,
  ownerId: string,
  id: string,
): Promise<Workspace | null> {
  const workspaces = await listWorkspaces(ctx, ownerId);
  return workspaces.find((w) => w.id === id) ?? null;
}

export async function saveWorkspace(ctx: ModuleContext, workspace: Workspace): Promise<Workspace> {
  await ctx.storage.set(`workspace:${workspace.id}`, workspace);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.workspaces')
        .values({
          id: workspace.id,
          owner_id: workspace.ownerId,
          title: workspace.title,
          objective: workspace.objective,
          type: workspace.type,
          status: workspace.status,
          domain_id: workspace.domainId,
          organization_id: workspace.organizationId ?? null,
          application_ids: workspace.applicationIds,
          goal_ids: workspace.goalIds,
          initiative_ids: workspace.initiativeIds,
          decision_ids: workspace.decisionIds,
          artifact_ids: workspace.artifactIds,
          research_ids: workspace.researchIds,
          memory_ids: workspace.memoryIds,
          world_sector_tags: workspace.worldSectorTags,
          keywords: workspace.keywords,
          progress_summary: workspace.progressSummary ?? null,
          activated_at: workspace.activatedAt ?? null,
          archived_at: workspace.archivedAt ?? null,
          updated_at: workspace.updatedAt,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            title: workspace.title,
            objective: workspace.objective,
            type: workspace.type,
            status: workspace.status,
            domain_id: workspace.domainId,
            organization_id: workspace.organizationId ?? null,
            application_ids: workspace.applicationIds,
            goal_ids: workspace.goalIds,
            initiative_ids: workspace.initiativeIds,
            decision_ids: workspace.decisionIds,
            artifact_ids: workspace.artifactIds,
            research_ids: workspace.researchIds,
            memory_ids: workspace.memoryIds,
            world_sector_tags: workspace.worldSectorTags,
            keywords: workspace.keywords,
            progress_summary: workspace.progressSummary ?? null,
            activated_at: workspace.activatedAt ?? null,
            archived_at: workspace.archivedAt ?? null,
            updated_at: workspace.updatedAt,
          }),
        )
        .execute();
    } catch {
      /* storage fallback */
    }
  }
  return workspace;
}

export async function listSessions(
  ctx: ModuleContext,
  ownerId: string,
  filters?: { status?: FocusSession['status']; workspaceId?: string },
): Promise<FocusSession[]> {
  let sessions = (await listFromStorage<FocusSession>(ctx, 'session:')).filter(
    (s) => s.ownerId === ownerId,
  );
  if (filters?.status) sessions = sessions.filter((s) => s.status === filters.status);
  if (filters?.workspaceId) {
    sessions = sessions.filter((s) => s.workspaceId === filters.workspaceId);
  }
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getActiveSession(
  ctx: ModuleContext,
  ownerId: string,
): Promise<FocusSession | null> {
  const sessions = await listSessions(ctx, ownerId, { status: 'active' });
  return sessions[0] ?? null;
}

export async function saveSession(ctx: ModuleContext, session: FocusSession): Promise<FocusSession> {
  await ctx.storage.set(`session:${session.id}`, session);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.focus_sessions')
        .values({
          id: session.id,
          owner_id: session.ownerId,
          workspace_id: session.workspaceId ?? null,
          focus_kind: session.focusKind,
          focus_entity: session.focusEntity ?? null,
          jarvis_session_id: session.jarvisSessionId ?? null,
          application_id: session.applicationId ?? null,
          status: session.status,
          summary: session.summary ?? null,
          started_at: session.startedAt,
          ended_at: session.endedAt ?? null,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            workspace_id: session.workspaceId ?? null,
            focus_kind: session.focusKind,
            focus_entity: session.focusEntity ?? null,
            jarvis_session_id: session.jarvisSessionId ?? null,
            application_id: session.applicationId ?? null,
            status: session.status,
            summary: session.summary ?? null,
            ended_at: session.endedAt ?? null,
          }),
        )
        .execute();
    } catch {
      /* storage fallback */
    }
  }
  return session;
}

export async function listArtifacts(
  ctx: ModuleContext,
  ownerId: string,
  filters?: { workspaceId?: string; kind?: Artifact['kind'] },
): Promise<Artifact[]> {
  let artifacts = (await listFromStorage<Artifact>(ctx, 'artifact:')).filter(
    (a) => a.ownerId === ownerId,
  );
  if (filters?.workspaceId) {
    artifacts = artifacts.filter((a) => a.workspaceIds.includes(filters.workspaceId!));
  }
  if (filters?.kind) artifacts = artifacts.filter((a) => a.kind === filters.kind);
  return artifacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getArtifact(
  ctx: ModuleContext,
  ownerId: string,
  id: string,
): Promise<Artifact | null> {
  const artifacts = await listArtifacts(ctx, ownerId);
  return artifacts.find((a) => a.id === id) ?? null;
}

export async function saveArtifact(ctx: ModuleContext, artifact: Artifact): Promise<Artifact> {
  await ctx.storage.set(`artifact:${artifact.id}`, artifact);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.artifacts')
        .values({
          id: artifact.id,
          owner_id: artifact.ownerId,
          kind: artifact.kind,
          title: artifact.title,
          summary: artifact.summary ?? null,
          content_ref: artifact.contentRef ?? null,
          workspace_ids: artifact.workspaceIds,
          goal_ids: artifact.goalIds,
          initiative_ids: artifact.initiativeIds,
          decision_ids: artifact.decisionIds,
          application_ids: artifact.applicationIds,
          memory_id: artifact.memoryId ?? null,
          updated_at: artifact.updatedAt,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            kind: artifact.kind,
            title: artifact.title,
            summary: artifact.summary ?? null,
            content_ref: artifact.contentRef ?? null,
            workspace_ids: artifact.workspaceIds,
            goal_ids: artifact.goalIds,
            initiative_ids: artifact.initiativeIds,
            decision_ids: artifact.decisionIds,
            application_ids: artifact.applicationIds,
            memory_id: artifact.memoryId ?? null,
            updated_at: artifact.updatedAt,
          }),
        )
        .execute();
    } catch {
      /* storage fallback */
    }
  }
  return artifact;
}

export { nowIso };
