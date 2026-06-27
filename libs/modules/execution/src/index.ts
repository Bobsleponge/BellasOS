import { z } from 'zod';
import {
  HOST_API_VERSION,
  type CallContext,
  type Decision,
  type DecisionContext,
  type Goal,
  type GoalProgress,
  type Initiative,
  type ModuleContext,
  type ModuleManifest,
  type ModuleRuntime,
} from '@bellasos/contracts';
import {
  createDecisionLinks,
  ensureDecisionSeed,
  getDecision,
  listDecisions,
  listOutcomes,
  listReviews,
  rememberDecision,
  rememberOutcome,
  saveDecision,
  saveLink,
  saveOutcome,
  saveReview,
} from './decision-store';
import {
  ensureSeedData,
  getGoal,
  listGoals,
  listInitiatives,
  listLinks,
  rememberGoal,
  saveGoal,
  saveInitiative,
} from './store';

const goalCreateInput = z.object({
  objective: z.string().min(1),
  category: z.enum([
    'personal',
    'business',
    'financial',
    'project',
    'research',
    'learning',
    'operational',
  ]),
  domainId: z.string().min(1),
  horizon: z
    .enum(['weekly', 'monthly', 'quarterly', 'yearly', 'ongoing'])
    .default('ongoing'),
  deadlineAt: z.string().optional(),
  target: z
    .object({
      metric: z.string(),
      targetValue: z.number(),
      unit: z.string().optional(),
      direction: z.enum(['increase', 'decrease', 'maintain']),
    })
    .optional(),
  priority: z.number().int().min(1).max(5).default(3),
  initiativeId: z.string().optional(),
  organizationId: z.string().optional(),
  applicationIds: z.array(z.string()).optional(),
});

const goalUpdateInput = z.object({
  id: z.string().min(1),
  objective: z.string().min(1).optional(),
  status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  deadlineAt: z.string().nullable().optional(),
  progress: z
    .object({
      current: z.number().optional(),
      baseline: z.number().optional(),
      pct: z.number().optional(),
      trend: z.enum(['up', 'down', 'flat', 'unknown']).optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
  target: goalCreateInput.shape.target.optional(),
});

const initiativeCreateInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  organizationId: z.string().optional(),
  applicationIds: z.array(z.string()).default([]),
  priority: z.number().int().min(1).max(5).default(3),
  targetAt: z.string().optional(),
});

const initiativeUpdateInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  momentum: z.enum(['accelerating', 'steady', 'slowing', 'blocked']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  goalIds: z.array(z.string()).optional(),
});

const progressRecordInput = z.object({
  goalId: z.string().min(1),
  current: z.number(),
  baseline: z.number().optional(),
  trend: z.enum(['up', 'down', 'flat', 'unknown']).optional(),
});

const listGoalsInput = z
  .object({
    status: z.string().optional(),
    category: z.string().optional(),
    initiativeId: z.string().optional(),
  })
  .optional();

const decisionOptionInput = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  description: z.string().optional(),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  estimatedImpact: z.string().optional(),
  recommended: z.boolean().optional(),
});

const decisionCreateInput = z.object({
  title: z.string().min(1),
  question: z.string().min(1),
  rationale: z.string().optional(),
  category: z.enum(['business', 'financial', 'product', 'research', 'operational', 'personal']),
  domainId: z.string().min(1),
  priority: z.number().int().min(1).max(5).default(3),
  deadlineAt: z.string().optional(),
  options: z.array(decisionOptionInput).min(1),
  goalIds: z.array(z.string()).default([]),
  initiativeIds: z.array(z.string()).default([]),
  projectIds: z.array(z.string()).default([]),
  researchIds: z.array(z.string()).default([]),
  signalIds: z.array(z.string()).default([]),
  applicationIds: z.array(z.string()).optional(),
});

const decisionUpdateInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  question: z.string().min(1).optional(),
  rationale: z.string().optional(),
  status: z.enum(['open', 'decided', 'deferred', 'superseded', 'cancelled']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  deadlineAt: z.string().nullable().optional(),
  options: z.array(decisionOptionInput).optional(),
  goalIds: z.array(z.string()).optional(),
  initiativeIds: z.array(z.string()).optional(),
});

const decisionCommitInput = z.object({
  id: z.string().min(1),
  chosenOptionId: z.string().min(1),
  rationale: z.string().optional(),
});

const outcomeRecordInput = z.object({
  decisionId: z.string().min(1),
  chosenOptionId: z.string().min(1),
  summary: z.string().min(1),
  actualImpact: z.string().optional(),
  successRating: z.number().int().min(1).max(5).optional(),
});

const reviewScheduleInput = z.object({
  decisionId: z.string().min(1),
  dueAt: z.string().min(1),
  notes: z.string().optional(),
});

const reviewCompleteInput = z.object({
  id: z.string().min(1),
  notes: z.string().optional(),
  outcomeAssessment: z.string().optional(),
});

const linkCreateInput = z.object({
  type: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  confidence: z.enum(['explicit', 'inferred', 'stale']).default('explicit'),
  metadata: z.record(z.unknown()).optional(),
});

const listDecisionsInput = z
  .object({
    status: z.string().optional(),
    category: z.string().optional(),
    goalId: z.string().optional(),
    initiativeId: z.string().optional(),
  })
  .optional();

const manifest: ModuleManifest = {
  id: 'bellasos.execution',
  name: 'Execution',
  version: '0.1.0',
  apiVersion: HOST_API_VERSION,
  description: 'Goals, initiatives, and strategic progress tracking for BellasOS.',
  permissions: [
    { key: 'execution.read', description: 'View goals and initiatives' },
    { key: 'execution.write', description: 'Create and update goals and initiatives' },
    { key: 'execution.manage', description: 'Archive goals and initiatives' },
  ],
  actions: [
    {
      name: 'goal.create',
      description: 'Create a goal',
      permission: 'execution.write',
      inputSchema: goalCreateInput,
    },
    {
      name: 'goal.update',
      description: 'Update a goal',
      permission: 'execution.write',
      inputSchema: goalUpdateInput,
    },
    {
      name: 'goal.list',
      description: 'List goals',
      permission: 'execution.read',
      inputSchema: listGoalsInput,
    },
    {
      name: 'goal.get',
      description: 'Get a goal by id',
      permission: 'execution.read',
    },
    {
      name: 'goal.archive',
      description: 'Archive a goal',
      permission: 'execution.manage',
    },
    {
      name: 'initiative.create',
      description: 'Create an initiative',
      permission: 'execution.write',
      inputSchema: initiativeCreateInput,
    },
    {
      name: 'initiative.update',
      description: 'Update an initiative',
      permission: 'execution.write',
      inputSchema: initiativeUpdateInput,
    },
    {
      name: 'initiative.list',
      description: 'List initiatives',
      permission: 'execution.read',
    },
    {
      name: 'initiative.get',
      description: 'Get an initiative by id',
      permission: 'execution.read',
    },
    {
      name: 'progress.record',
      description: 'Record goal progress snapshot',
      permission: 'execution.write',
      inputSchema: progressRecordInput,
    },
    {
      name: 'links.list',
      description: 'List execution graph links',
      permission: 'execution.read',
    },
    {
      name: 'context.load',
      description: 'Load active goals and initiatives for intelligence',
      permission: 'execution.read',
    },
    {
      name: 'decision.create',
      description: 'Create a decision with options',
      permission: 'execution.write',
      inputSchema: decisionCreateInput,
      requiresApproval: true,
    },
    {
      name: 'decision.update',
      description: 'Update a decision',
      permission: 'execution.write',
      inputSchema: decisionUpdateInput,
    },
    {
      name: 'decision.list',
      description: 'List decisions',
      permission: 'execution.read',
      inputSchema: listDecisionsInput,
    },
    {
      name: 'decision.get',
      description: 'Get a decision by id',
      permission: 'execution.read',
    },
    {
      name: 'decision.defer',
      description: 'Defer a decision',
      permission: 'execution.write',
    },
    {
      name: 'decision.commit',
      description: 'Commit a decision choice',
      permission: 'execution.write',
      inputSchema: decisionCommitInput,
    },
    {
      name: 'decision.outcome.record',
      description: 'Record decision outcome',
      permission: 'execution.write',
      inputSchema: outcomeRecordInput,
    },
    {
      name: 'decision.review.schedule',
      description: 'Schedule a decision review',
      permission: 'execution.write',
      inputSchema: reviewScheduleInput,
    },
    {
      name: 'decision.review.list',
      description: 'List decision reviews',
      permission: 'execution.read',
    },
    {
      name: 'decision.review.complete',
      description: 'Complete a decision review',
      permission: 'execution.write',
      inputSchema: reviewCompleteInput,
    },
    {
      name: 'decision.context.load',
      description: 'Load decision context for intelligence',
      permission: 'execution.read',
    },
    {
      name: 'links.create',
      description: 'Create an execution graph link',
      permission: 'execution.write',
      inputSchema: linkCreateInput,
    },
  ],
  events: [],
  settings: [],
  widgets: [],
};

function computePct(current: number, targetValue?: number): number | undefined {
  if (!targetValue || targetValue === 0) return undefined;
  return Math.round((current / targetValue) * 100);
}

export function createExecutionModule(): ModuleRuntime {
  let ctx!: ModuleContext;
  return {
    manifest,
    async onInstall(c) {
      ctx = c;
      await ensureSeedData(c);
      await ensureDecisionSeed(c);
    },
    async onEnable(c) {
      ctx = c;
      await ensureSeedData(c);
      await ensureDecisionSeed(c);
    },
    async onDisable() {},
    async onUninstall() {},
    async handle(action: string, input: unknown, call: CallContext) {
      const ownerId = call.principal.id;

      switch (action) {
        case 'goal.create': {
          const body = goalCreateInput.parse(input);
          const now = new Date().toISOString();
          const goal: Goal = {
            id: crypto.randomUUID(),
            objective: body.objective,
            category: body.category,
            domainId: body.domainId as Goal['domainId'],
            horizon: body.horizon,
            deadlineAt: body.deadlineAt,
            target: body.target,
            progress: { trend: 'unknown', updatedAt: now },
            priority: body.priority as Goal['priority'],
            status: 'active',
            initiativeId: body.initiativeId,
            organizationId: body.organizationId,
            applicationIds: body.applicationIds,
            ownerId,
            createdAt: now,
            updatedAt: now,
          };
          await saveGoal(ctx, goal);
          await rememberGoal(ctx, ownerId, goal);
          return goal;
        }
        case 'goal.update': {
          const body = goalUpdateInput.parse(input);
          const existing = await getGoal(ctx, ownerId, body.id);
          if (!existing) throw new Error('Goal not found');
          const updated: Goal = {
            ...existing,
            ...body,
            progress: body.progress
              ? { ...existing.progress, ...body.progress, updatedAt: new Date().toISOString() }
              : existing.progress,
            deadlineAt:
              body.deadlineAt === null ? undefined : (body.deadlineAt ?? existing.deadlineAt),
            updatedAt: new Date().toISOString(),
          };
          await saveGoal(ctx, updated);
          await rememberGoal(ctx, ownerId, updated);
          return updated;
        }
        case 'goal.list': {
          const filters = listGoalsInput.parse(input);
          return listGoals(ctx, ownerId, filters);
        }
        case 'goal.get': {
          const id = String((input as { id?: string })?.id ?? '');
          if (!id) throw new Error('id required');
          const goal = await getGoal(ctx, ownerId, id);
          if (!goal) throw new Error('Goal not found');
          return goal;
        }
        case 'goal.archive': {
          const id = String((input as { id?: string })?.id ?? '');
          const existing = await getGoal(ctx, ownerId, id);
          if (!existing) throw new Error('Goal not found');
          const updated = {
            ...existing,
            status: 'abandoned' as const,
            updatedAt: new Date().toISOString(),
          };
          await saveGoal(ctx, updated);
          return updated;
        }
        case 'initiative.create': {
          const body = initiativeCreateInput.parse(input);
          const now = new Date().toISOString();
          const initiative: Initiative = {
            id: crypto.randomUUID(),
            name: body.name,
            description: body.description,
            status: 'active',
            momentum: 'steady',
            organizationId: body.organizationId,
            applicationIds: body.applicationIds,
            goalIds: [],
            priority: body.priority as Initiative['priority'],
            ownerId,
            targetAt: body.targetAt,
            createdAt: now,
            updatedAt: now,
          };
          await saveInitiative(ctx, initiative);
          return initiative;
        }
        case 'initiative.update': {
          const body = initiativeUpdateInput.parse(input);
          const initiatives = await listInitiatives(ctx, ownerId);
          const existing = initiatives.find((i) => i.id === body.id);
          if (!existing) throw new Error('Initiative not found');
          const updated: Initiative = {
            ...existing,
            ...body,
            updatedAt: new Date().toISOString(),
          };
          await saveInitiative(ctx, updated);
          return updated;
        }
        case 'initiative.list': {
          const status = (input as { status?: string })?.status;
          return listInitiatives(ctx, ownerId, status ? { status } : undefined);
        }
        case 'initiative.get': {
          const id = String((input as { id?: string })?.id ?? '');
          const initiatives = await listInitiatives(ctx, ownerId);
          const initiative = initiatives.find((i) => i.id === id);
          if (!initiative) throw new Error('Initiative not found');
          return initiative;
        }
        case 'progress.record': {
          const body = progressRecordInput.parse(input);
          const existing = await getGoal(ctx, ownerId, body.goalId);
          if (!existing) throw new Error('Goal not found');
          const progress: GoalProgress = {
            current: body.current,
            baseline: body.baseline ?? existing.progress.baseline,
            pct: computePct(body.current, existing.target?.targetValue),
            trend: body.trend ?? existing.progress.trend ?? 'unknown',
            updatedAt: new Date().toISOString(),
          };
          const updated = {
            ...existing,
            progress,
            updatedAt: new Date().toISOString(),
          };
          await saveGoal(ctx, updated);
          return updated;
        }
        case 'links.list': {
          const entityId = (input as { entityId?: string })?.entityId;
          return listLinks(ctx, ownerId, entityId);
        }
        case 'context.load': {
          const applicationId = (input as { applicationId?: string })?.applicationId;
          const goals = await listGoals(ctx, ownerId, { status: 'active' });
          const initiatives = await listInitiatives(ctx, ownerId, { status: 'active' });
          const activeGoals = applicationId
            ? goals.filter(
                (g) =>
                  g.applicationIds?.includes(applicationId) ||
                  !g.applicationIds?.length,
              )
            : goals;
          const activeInitiatives = applicationId
            ? initiatives.filter((i) => i.applicationIds.includes(applicationId))
            : initiatives;
          const focusInitiative = activeInitiatives.sort(
            (a, b) => a.priority - b.priority,
          )[0];
          const focusGoal = activeGoals.sort((a, b) => a.priority - b.priority)[0];
          return {
            goals: activeGoals,
            initiatives: activeInitiatives,
            activeGoalIds: activeGoals.map((g) => g.id),
            activeInitiativeIds: activeInitiatives.map((i) => i.id),
            focusGoalId: focusGoal?.id,
            focusInitiativeId: focusInitiative?.id,
          };
        }
        case 'decision.create': {
          const body = decisionCreateInput.parse(input);
          const now = new Date().toISOString();
          const decision: Decision = {
            id: crypto.randomUUID(),
            title: body.title,
            question: body.question,
            rationale: body.rationale,
            category: body.category,
            domainId: body.domainId as Decision['domainId'],
            status: 'open',
            priority: body.priority as Decision['priority'],
            options: body.options.map((o) => ({
              id: o.id ?? crypto.randomUUID(),
              label: o.label,
              description: o.description,
              pros: o.pros,
              cons: o.cons,
              riskLevel: o.riskLevel,
              estimatedImpact: o.estimatedImpact,
              recommended: o.recommended,
            })),
            deadlineAt: body.deadlineAt,
            goalIds: body.goalIds,
            initiativeIds: body.initiativeIds,
            projectIds: body.projectIds,
            researchIds: body.researchIds,
            signalIds: body.signalIds,
            applicationIds: body.applicationIds,
            ownerId,
            createdAt: now,
            updatedAt: now,
          };
          await saveDecision(ctx, decision);
          await createDecisionLinks(ctx, ownerId, decision);
          return decision;
        }
        case 'decision.update': {
          const body = decisionUpdateInput.parse(input);
          const existing = await getDecision(ctx, ownerId, body.id);
          if (!existing) throw new Error('Decision not found');
          const updated: Decision = {
            ...existing,
            ...body,
            deadlineAt:
              body.deadlineAt === null ? undefined : (body.deadlineAt ?? existing.deadlineAt),
            options: body.options
              ? body.options.map((o) => ({
                  id: o.id ?? crypto.randomUUID(),
                  label: o.label,
                  description: o.description,
                  pros: o.pros,
                  cons: o.cons,
                  riskLevel: o.riskLevel,
                  estimatedImpact: o.estimatedImpact,
                  recommended: o.recommended,
                }))
              : existing.options,
            updatedAt: new Date().toISOString(),
          };
          await saveDecision(ctx, updated);
          return updated;
        }
        case 'decision.list': {
          const filters = listDecisionsInput.parse(input);
          return listDecisions(ctx, ownerId, filters);
        }
        case 'decision.get': {
          const id = String((input as { id?: string })?.id ?? '');
          if (!id) throw new Error('id required');
          const decision = await getDecision(ctx, ownerId, id);
          if (!decision) throw new Error('Decision not found');
          return decision;
        }
        case 'decision.defer': {
          const id = String((input as { id?: string })?.id ?? '');
          const existing = await getDecision(ctx, ownerId, id);
          if (!existing) throw new Error('Decision not found');
          const updated = {
            ...existing,
            status: 'deferred' as const,
            updatedAt: new Date().toISOString(),
          };
          await saveDecision(ctx, updated);
          return updated;
        }
        case 'decision.commit': {
          const body = decisionCommitInput.parse(input);
          const existing = await getDecision(ctx, ownerId, body.id);
          if (!existing) throw new Error('Decision not found');
          const now = new Date().toISOString();
          const updated: Decision = {
            ...existing,
            status: 'decided',
            chosenOptionId: body.chosenOptionId,
            rationale: body.rationale ?? existing.rationale,
            decidedAt: now,
            updatedAt: now,
          };
          await saveDecision(ctx, updated);
          await rememberDecision(
            ctx,
            ownerId,
            updated,
            `Chose option ${body.chosenOptionId}. ${body.rationale ?? ''}`.trim(),
          );
          return updated;
        }
        case 'decision.outcome.record': {
          const body = outcomeRecordInput.parse(input);
          const decision = await getDecision(ctx, ownerId, body.decisionId);
          if (!decision) throw new Error('Decision not found');
          const outcome = {
            id: crypto.randomUUID(),
            decisionId: body.decisionId,
            chosenOptionId: body.chosenOptionId,
            summary: body.summary,
            actualImpact: body.actualImpact,
            successRating: body.successRating as 1 | 2 | 3 | 4 | 5 | undefined,
            recordedAt: new Date().toISOString(),
            ownerId,
          };
          await saveOutcome(ctx, outcome);
          await saveLink(
            ctx,
            {
              id: crypto.randomUUID(),
              type: 'decision_has_outcome',
              fromId: decision.id,
              toId: outcome.id,
              confidence: 'explicit',
              createdAt: new Date().toISOString(),
            },
            ownerId,
          );
          await rememberOutcome(ctx, ownerId, decision, outcome);
          return outcome;
        }
        case 'decision.review.schedule': {
          const body = reviewScheduleInput.parse(input);
          const decision = await getDecision(ctx, ownerId, body.decisionId);
          if (!decision) throw new Error('Decision not found');
          const review = {
            id: crypto.randomUUID(),
            decisionId: body.decisionId,
            dueAt: body.dueAt,
            status: 'scheduled' as const,
            notes: body.notes,
            ownerId,
            createdAt: new Date().toISOString(),
          };
          await saveReview(ctx, review);
          return review;
        }
        case 'decision.review.list': {
          const decisionId = (input as { decisionId?: string })?.decisionId;
          return listReviews(ctx, ownerId, decisionId);
        }
        case 'decision.review.complete': {
          const body = reviewCompleteInput.parse(input);
          const reviews = await listReviews(ctx, ownerId);
          const existing = reviews.find((r) => r.id === body.id);
          if (!existing) throw new Error('Review not found');
          const updated = {
            ...existing,
            status: 'completed' as const,
            notes: body.notes ?? existing.notes,
            outcomeAssessment: body.outcomeAssessment,
            completedAt: new Date().toISOString(),
          };
          await saveReview(ctx, updated);
          return updated;
        }
        case 'decision.context.load': {
          const applicationId = (input as { applicationId?: string })?.applicationId;
          const allDecisions = await listDecisions(ctx, ownerId);
          let openDecisions = allDecisions.filter((d) => d.status === 'open');
          if (applicationId) {
            openDecisions = openDecisions.filter(
              (d) =>
                d.applicationIds?.includes(applicationId) ||
                !d.applicationIds?.length,
            );
          }
          const recentOutcomes = (await listOutcomes(ctx, ownerId)).slice(0, 10);
          const pendingReviews = (await listReviews(ctx, ownerId)).filter(
            (r) => r.status === 'scheduled',
          );
          const focusDecision = openDecisions.sort((a, b) => a.priority - b.priority)[0];
          const result: DecisionContext = {
            decisions: allDecisions,
            openDecisions,
            recentOutcomes,
            pendingReviews,
            focusDecisionId: focusDecision?.id,
          };
          return result;
        }
        case 'links.create': {
          const body = linkCreateInput.parse(input);
          const link = {
            id: crypto.randomUUID(),
            type: body.type as import('@bellasos/contracts').ExecutionLinkType,
            fromId: body.fromId,
            toId: body.toId,
            confidence: body.confidence,
            metadata: body.metadata,
            createdAt: new Date().toISOString(),
          };
          await saveLink(ctx, link, ownerId);
          return link;
        }
        default:
          throw new Error(`Unknown action ${action}`);
      }
    },
  };
}
