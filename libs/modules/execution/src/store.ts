import type {
  ExecutionLink,
  Goal,
  GoalProgress,
  GoalTarget,
  Initiative,
} from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import type { ModuleContext } from '@bellasos/contracts';
import { SEED_OWNER } from './store-shared';

function nowIso(): string {
  return new Date().toISOString();
}

function defaultProgress(): GoalProgress {
  return { trend: 'unknown' };
}

function rowToGoal(row: Record<string, unknown>): Goal {
  return {
    id: String(row.id),
    objective: String(row.objective),
    target: row.target as GoalTarget | undefined,
    category: row.category as Goal['category'],
    domainId: row.domainId as Goal['domainId'],
    horizon: row.horizon as Goal['horizon'],
    deadlineAt: row.deadlineAt ? String(row.deadlineAt) : undefined,
    progress: (row.progress as GoalProgress) ?? defaultProgress(),
    priority: Number(row.priority) as Goal['priority'],
    status: row.status as Goal['status'],
    initiativeId: row.initiativeId ? String(row.initiativeId) : undefined,
    organizationId: row.organizationId ? String(row.organizationId) : undefined,
    applicationIds: Array.isArray(row.applicationIds)
      ? row.applicationIds.map(String)
      : [],
    ownerId: String(row.ownerId),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToInitiative(row: Record<string, unknown>): Initiative {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : undefined,
    status: row.status as Initiative['status'],
    momentum: row.momentum as Initiative['momentum'],
    organizationId: row.organizationId ? String(row.organizationId) : undefined,
    applicationIds: Array.isArray(row.applicationIds)
      ? row.applicationIds.map(String)
      : [],
    goalIds: Array.isArray(row.goalIds) ? row.goalIds.map(String) : [],
    projectIds: Array.isArray(row.projectIds)
      ? row.projectIds.map(String)
      : undefined,
    priority: Number(row.priority) as Initiative['priority'],
    ownerId: String(row.ownerId),
    startedAt: row.startedAt ? String(row.startedAt) : undefined,
    targetAt: row.targetAt ? String(row.targetAt) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

async function listFromStorage<T>(
  ctx: ModuleContext,
  prefix: string,
): Promise<T[]> {
  const items = await ctx.storage.list(prefix);
  return items.map((i) => i.value as T);
}

export const DEFAULT_SEED: { initiatives: Initiative[]; goals: Goal[] } = {
  initiatives: [
    {
      id: '11111111-1111-1111-1111-111111111101',
      name: 'Build BellasOS',
      description: 'Ship the personal intelligence operating system.',
      status: 'active',
      momentum: 'accelerating',
      applicationIds: ['coding-studio'],
      goalIds: ['22222222-2222-2222-2222-222222222201'],
      priority: 1,
      ownerId: SEED_OWNER,
      startedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: nowIso(),
    },
    {
      id: '11111111-1111-1111-1111-111111111102',
      name: 'Grow Harvi',
      description: 'Expand Harvi and Co order volume and operational capacity.',
      status: 'active',
      momentum: 'steady',
      organizationId: 'org:harvi',
      applicationIds: ['harvi-and-co'],
      goalIds: ['22222222-2222-2222-2222-222222222202'],
      priority: 1,
      ownerId: SEED_OWNER,
      startedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: nowIso(),
    },
    {
      id: '11111111-1111-1111-1111-111111111103',
      name: 'Launch TruAfrica',
      description: 'Prepare TruAfrica market entry and launch milestones.',
      status: 'active',
      momentum: 'steady',
      organizationId: 'org:truafrica',
      applicationIds: ['truafrica'],
      goalIds: ['22222222-2222-2222-2222-222222222203'],
      priority: 2,
      ownerId: SEED_OWNER,
      startedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: nowIso(),
    },
    {
      id: '11111111-1111-1111-1111-111111111104',
      name: 'Property Portfolio Expansion',
      description: 'Grow property holdings and portfolio diversification.',
      status: 'active',
      momentum: 'steady',
      applicationIds: ['wealth'],
      goalIds: ['22222222-2222-2222-2222-222222222204'],
      priority: 2,
      ownerId: SEED_OWNER,
      startedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: nowIso(),
    },
  ],
  goals: [
    {
      id: '22222222-2222-2222-2222-222222222201',
      objective: 'Ship Jarvis goal-aware intelligence layer',
      category: 'operational',
      domainId: 'systems',
      horizon: 'quarterly',
      target: { metric: 'feature_milestones', targetValue: 1, direction: 'increase' },
      progress: { current: 1, baseline: 0, pct: 85, trend: 'up', updatedAt: nowIso() },
      priority: 1,
      status: 'active',
      initiativeId: '11111111-1111-1111-1111-111111111101',
      applicationIds: ['coding-studio'],
      ownerId: SEED_OWNER,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: nowIso(),
    },
    {
      id: '22222222-2222-2222-2222-222222222202',
      objective: 'Reach weekly order growth target for Harvi',
      category: 'business',
      domainId: 'ventures',
      horizon: 'weekly',
      target: {
        metric: 'weekly_orders',
        targetValue: 10,
        unit: 'orders',
        direction: 'increase',
      },
      progress: { current: 12, baseline: 8, pct: 120, trend: 'up', updatedAt: nowIso() },
      priority: 1,
      status: 'active',
      initiativeId: '11111111-1111-1111-1111-111111111102',
      organizationId: 'org:harvi',
      applicationIds: ['harvi-and-co'],
      ownerId: SEED_OWNER,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: nowIso(),
    },
    {
      id: '22222222-2222-2222-2222-222222222203',
      objective: 'Complete TruAfrica launch readiness checklist',
      category: 'business',
      domainId: 'ventures',
      horizon: 'quarterly',
      target: {
        metric: 'launch_readiness_pct',
        targetValue: 100,
        unit: 'percent',
        direction: 'increase',
      },
      progress: { current: 45, baseline: 30, pct: 45, trend: 'up', updatedAt: nowIso() },
      priority: 2,
      status: 'active',
      initiativeId: '11111111-1111-1111-1111-111111111103',
      organizationId: 'org:truafrica',
      applicationIds: ['truafrica'],
      ownerId: SEED_OWNER,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: nowIso(),
    },
    {
      id: '22222222-2222-2222-2222-222222222204',
      objective: 'Grow net worth by 5% this quarter',
      category: 'financial',
      domainId: 'wealth',
      horizon: 'quarterly',
      target: {
        metric: 'net_worth_pct',
        targetValue: 5,
        unit: 'percent',
        direction: 'increase',
      },
      progress: { current: 2.1, baseline: 0, pct: 42, trend: 'up', updatedAt: nowIso() },
      priority: 2,
      status: 'active',
      initiativeId: '11111111-1111-1111-1111-111111111104',
      applicationIds: ['wealth'],
      ownerId: SEED_OWNER,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: nowIso(),
    },
  ],
};

export async function ensureSeedData(ctx: ModuleContext): Promise<void> {
  const existing = await ctx.storage.list('goal:');
  if (existing.length > 0) return;
  for (const initiative of DEFAULT_SEED.initiatives) {
    await ctx.storage.set(`initiative:${initiative.id}`, initiative);
  }
  for (const goal of DEFAULT_SEED.goals) {
    await ctx.storage.set(`goal:${goal.id}`, goal);
  }
}

export async function listGoals(
  ctx: ModuleContext,
  ownerId: string,
  filters?: { status?: string; category?: string; initiativeId?: string },
): Promise<Goal[]> {
  if (isDbAvailable()) {
    try {
      let q = getDb()
        .selectFrom('execution.goals')
        .selectAll()
        .where('owner_id', '=', ownerId);
      if (filters?.status) q = q.where('status', '=', filters.status);
      if (filters?.category) q = q.where('category', '=', filters.category);
      if (filters?.initiativeId) q = q.where('initiative_id', '=', filters.initiativeId);
      const rows = await q.orderBy('priority', 'asc').execute();
      if (rows.length > 0) {
        return rows.map((r) =>
          rowToGoal({
            id: r.id,
            objective: r.objective,
            target: r.target ?? undefined,
            category: r.category,
            domainId: r.domain_id,
            horizon: r.horizon,
            deadlineAt: r.deadline_at,
            progress: r.progress,
            priority: r.priority,
            status: r.status,
            initiativeId: r.initiative_id,
            organizationId: r.organization_id,
            applicationIds: r.application_ids,
            ownerId: r.owner_id,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }),
        );
      }
    } catch {
      /* fall through to storage */
    }
  }

  await ensureSeedData(ctx);
  let goals = (await listFromStorage<Goal>(ctx, 'goal:')).filter(
    (g) => g.ownerId === ownerId || g.ownerId === SEED_OWNER,
  );
  if (filters?.status) goals = goals.filter((g) => g.status === filters.status);
  if (filters?.category) goals = goals.filter((g) => g.category === filters.category);
  if (filters?.initiativeId) {
    goals = goals.filter((g) => g.initiativeId === filters.initiativeId);
  }
  return goals.sort((a, b) => a.priority - b.priority);
}

export async function getGoal(
  ctx: ModuleContext,
  ownerId: string,
  id: string,
): Promise<Goal | null> {
  const goals = await listGoals(ctx, ownerId);
  return goals.find((g) => g.id === id) ?? null;
}

export async function saveGoal(ctx: ModuleContext, goal: Goal): Promise<Goal> {
  await ctx.storage.set(`goal:${goal.id}`, goal);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.goals')
        .values({
          id: goal.id,
          owner_id: goal.ownerId,
          objective: goal.objective,
          category: goal.category,
          domain_id: goal.domainId,
          horizon: goal.horizon,
          deadline_at: goal.deadlineAt ?? null,
          target: goal.target ?? null,
          progress: goal.progress as Record<string, unknown>,
          priority: goal.priority,
          status: goal.status,
          initiative_id: goal.initiativeId ?? null,
          organization_id: goal.organizationId ?? null,
          application_ids: goal.applicationIds ?? [],
          updated_at: goal.updatedAt,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            objective: goal.objective,
            category: goal.category,
            domain_id: goal.domainId,
            horizon: goal.horizon,
            deadline_at: goal.deadlineAt ?? null,
            target: goal.target ?? null,
            progress: goal.progress as Record<string, unknown>,
            priority: goal.priority,
            status: goal.status,
            initiative_id: goal.initiativeId ?? null,
            organization_id: goal.organizationId ?? null,
            application_ids: goal.applicationIds ?? [],
            updated_at: goal.updatedAt,
          }),
        )
        .execute();
    } catch {
      /* storage is source of truth when DB write fails */
    }
  }
  return goal;
}

export async function listInitiatives(
  ctx: ModuleContext,
  ownerId: string,
  filters?: { status?: string },
): Promise<Initiative[]> {
  if (isDbAvailable()) {
    try {
      let q = getDb()
        .selectFrom('execution.initiatives')
        .selectAll()
        .where('owner_id', '=', ownerId);
      if (filters?.status) q = q.where('status', '=', filters.status);
      const rows = await q.orderBy('priority', 'asc').execute();
      if (rows.length > 0) {
        return rows.map((r) =>
          rowToInitiative({
            id: r.id,
            name: r.name,
            description: r.description,
            status: r.status,
            momentum: r.momentum,
            organizationId: r.organization_id,
            applicationIds: r.application_ids,
            goalIds: r.goal_ids,
            projectIds: r.project_ids,
            priority: r.priority,
            ownerId: r.owner_id,
            startedAt: r.started_at,
            targetAt: r.target_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }),
        );
      }
    } catch {
      /* fall through */
    }
  }

  await ensureSeedData(ctx);
  let items = (await listFromStorage<Initiative>(ctx, 'initiative:')).filter(
    (i) => i.ownerId === ownerId || i.ownerId === SEED_OWNER,
  );
  if (filters?.status) items = items.filter((i) => i.status === filters.status);
  return items.sort((a, b) => a.priority - b.priority);
}

export async function saveInitiative(
  ctx: ModuleContext,
  initiative: Initiative,
): Promise<Initiative> {
  await ctx.storage.set(`initiative:${initiative.id}`, initiative);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.initiatives')
        .values({
          id: initiative.id,
          owner_id: initiative.ownerId,
          name: initiative.name,
          description: initiative.description ?? null,
          status: initiative.status,
          momentum: initiative.momentum,
          organization_id: initiative.organizationId ?? null,
          application_ids: initiative.applicationIds,
          goal_ids: initiative.goalIds,
          project_ids: initiative.projectIds ?? [],
          priority: initiative.priority,
          started_at: initiative.startedAt ?? null,
          target_at: initiative.targetAt ?? null,
          updated_at: initiative.updatedAt,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            name: initiative.name,
            description: initiative.description ?? null,
            status: initiative.status,
            momentum: initiative.momentum,
            organization_id: initiative.organizationId ?? null,
            application_ids: initiative.applicationIds,
            goal_ids: initiative.goalIds,
            project_ids: initiative.projectIds ?? [],
            priority: initiative.priority,
            started_at: initiative.startedAt ?? null,
            target_at: initiative.targetAt ?? null,
            updated_at: initiative.updatedAt,
          }),
        )
        .execute();
    } catch {
      /* ignore */
    }
  }
  return initiative;
}

export async function listLinks(
  ctx: ModuleContext,
  ownerId: string,
  entityId?: string,
): Promise<ExecutionLink[]> {
  let links = await listFromStorage<ExecutionLink>(ctx, 'link:');
  links = links.filter((l) => {
    if (entityId) return l.fromId === entityId || l.toId === entityId;
    return true;
  });
  return links;
}

export async function rememberGoal(
  ctx: ModuleContext,
  ownerId: string,
  goal: Goal,
): Promise<void> {
  await ctx.memory.remember({
    tier: 'long',
    ownerId,
    content: `Goal: ${goal.objective} (${goal.status}, priority ${goal.priority})`,
    tags: ['goal', goal.category, goal.domainId],
    sourceRef: { type: 'goal', id: goal.id },
  });
}
