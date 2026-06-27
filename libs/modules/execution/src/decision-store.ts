import type {
  Decision,
  DecisionConfidence,
  DecisionOption,
  DecisionOutcome,
  DecisionReview,
  ExecutionLink,
  ExecutionLinkType,
} from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import type { ModuleContext } from '@bellasos/contracts';
import { SEED_OWNER } from './store-shared';

function nowIso(): string {
  return new Date().toISOString();
}

function rowToDecision(row: Record<string, unknown>): Decision {
  return {
    id: String(row.id),
    title: String(row.title),
    question: String(row.question),
    rationale: row.rationale ? String(row.rationale) : undefined,
    category: row.category as Decision['category'],
    domainId: row.domainId as Decision['domainId'],
    status: row.status as Decision['status'],
    priority: Number(row.priority) as Decision['priority'],
    confidence: row.confidence as DecisionConfidence | undefined,
    options: Array.isArray(row.options) ? (row.options as DecisionOption[]) : [],
    chosenOptionId: row.chosenOptionId ? String(row.chosenOptionId) : undefined,
    deadlineAt: row.deadlineAt ? String(row.deadlineAt) : undefined,
    goalIds: Array.isArray(row.goalIds) ? row.goalIds.map(String) : [],
    initiativeIds: Array.isArray(row.initiativeIds) ? row.initiativeIds.map(String) : [],
    projectIds: Array.isArray(row.projectIds) ? row.projectIds.map(String) : [],
    researchIds: Array.isArray(row.researchIds) ? row.researchIds.map(String) : [],
    signalIds: Array.isArray(row.signalIds) ? row.signalIds.map(String) : [],
    applicationIds: Array.isArray(row.applicationIds)
      ? row.applicationIds.map(String)
      : [],
    ownerId: String(row.ownerId),
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    decidedAt: row.decidedAt ? String(row.decidedAt) : undefined,
  };
}

function rowToOutcome(row: Record<string, unknown>): DecisionOutcome {
  return {
    id: String(row.id),
    decisionId: String(row.decisionId),
    chosenOptionId: String(row.chosenOptionId),
    summary: String(row.summary),
    actualImpact: row.actualImpact ? String(row.actualImpact) : undefined,
    successRating: row.successRating != null ? (Number(row.successRating) as DecisionOutcome['successRating']) : undefined,
    recordedAt: String(row.recordedAt),
    ownerId: String(row.ownerId),
  };
}

function rowToReview(row: Record<string, unknown>): DecisionReview {
  return {
    id: String(row.id),
    decisionId: String(row.decisionId),
    dueAt: String(row.dueAt),
    status: row.status as DecisionReview['status'],
    notes: row.notes ? String(row.notes) : undefined,
    outcomeAssessment: row.outcomeAssessment ? String(row.outcomeAssessment) : undefined,
    ownerId: String(row.ownerId),
    createdAt: String(row.createdAt),
    completedAt: row.completedAt ? String(row.completedAt) : undefined,
  };
}

async function listFromStorage<T>(ctx: ModuleContext, prefix: string): Promise<T[]> {
  const items = await ctx.storage.list(prefix);
  return items.map((i) => i.value as T);
}

export const DEFAULT_DECISION_SEED: Decision[] = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    title: 'Harvi growth strategy',
    question: 'Increase Harvi marketing spend vs optimize fulfillment capacity?',
    rationale: 'Weekly orders are below target; choose between demand generation and operational efficiency.',
    category: 'business',
    domainId: 'ventures',
    status: 'open',
    priority: 1,
    confidence: { score: 0.72, factors: ['Linked to P1 weekly_orders goal', 'Harvi initiative active'] },
    options: [
      {
        id: 'opt-harvi-marketing',
        label: 'Increase marketing spend',
        description: 'Run targeted campaigns to drive order volume',
        pros: ['Faster demand growth', 'Builds brand awareness'],
        cons: ['Higher CAC', 'Budget pressure'],
        riskLevel: 'medium',
        estimatedImpact: '+3-5 orders/week',
        recommended: true,
      },
      {
        id: 'opt-harvi-ops',
        label: 'Optimize fulfillment',
        description: 'Improve ops capacity and delivery speed',
        pros: ['Better margins', 'Higher retention'],
        cons: ['Slower top-line growth', 'Requires process changes'],
        riskLevel: 'low',
        estimatedImpact: '+1-2 orders/week retention',
      },
    ],
    deadlineAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    goalIds: ['22222222-2222-2222-2222-222222222202'],
    initiativeIds: ['11111111-1111-1111-1111-111111111102'],
    projectIds: [],
    researchIds: [],
    signalIds: [],
    applicationIds: ['harvi-and-co'],
    ownerId: SEED_OWNER,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: nowIso(),
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    title: 'Portfolio mining exposure',
    question: 'Rebalance mining exposure in portfolio?',
    rationale: 'Net worth growth is behind quarterly target; mining sector volatility affects portfolio.',
    category: 'financial',
    domainId: 'wealth',
    status: 'open',
    priority: 2,
    confidence: { score: 0.68, factors: ['Financial goal at 42% of target', 'Wealth context active'] },
    options: [
      {
        id: 'opt-rebalance-reduce',
        label: 'Reduce mining exposure',
        pros: ['Lower volatility', 'Diversification'],
        cons: ['May miss upside', 'Tax implications'],
        riskLevel: 'medium',
      },
      {
        id: 'opt-rebalance-hold',
        label: 'Hold current allocation',
        pros: ['No transaction costs', 'Stay positioned for recovery'],
        cons: ['Continued sector risk'],
        riskLevel: 'low',
        estimatedImpact: 'Status quo',
      },
      {
        id: 'opt-rebalance-increase',
        label: 'Increase mining exposure',
        pros: ['Potential upside if sector recovers'],
        cons: ['Higher concentration risk'],
        riskLevel: 'high',
        estimatedImpact: 'Higher volatility',
      },
    ],
    deadlineAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    goalIds: ['22222222-2222-2222-2222-222222222204'],
    initiativeIds: ['11111111-1111-1111-1111-111111111104'],
    projectIds: [],
    researchIds: [],
    signalIds: [],
    applicationIds: ['wealth'],
    ownerId: SEED_OWNER,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: nowIso(),
  },
  {
    id: '33333333-3333-3333-3333-333333333303',
    title: 'TruAfrica launch pricing',
    question: 'TruAfrica launch pricing: premium vs penetration?',
    category: 'product',
    domainId: 'ventures',
    status: 'open',
    priority: 2,
    confidence: { score: 0.65, factors: ['Launch readiness goal active'] },
    options: [
      {
        id: 'opt-truafrica-premium',
        label: 'Premium pricing',
        pros: ['Higher margins', 'Brand positioning'],
        cons: ['Slower adoption'],
        riskLevel: 'medium',
      },
      {
        id: 'opt-truafrica-penetration',
        label: 'Penetration pricing',
        pros: ['Faster adoption'],
        cons: ['Lower margins'],
        riskLevel: 'medium',
        recommended: true,
      },
    ],
    goalIds: ['22222222-2222-2222-2222-222222222203'],
    initiativeIds: ['11111111-1111-1111-1111-111111111103'],
    projectIds: [],
    researchIds: [],
    signalIds: [],
    applicationIds: ['truafrica'],
    ownerId: SEED_OWNER,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: nowIso(),
  },
  {
    id: '33333333-3333-3333-3333-333333333304',
    title: 'BellasOS roadmap priority',
    question: 'Ship Decision Intelligence vs polish Today UX?',
    category: 'operational',
    domainId: 'systems',
    status: 'open',
    priority: 1,
    confidence: { score: 0.7, factors: ['P1 operational goal'] },
    options: [
      {
        id: 'opt-ship-decision',
        label: 'Ship Decision Intelligence',
        pros: ['Strategic capability'],
        cons: ['Today UX gaps remain'],
        riskLevel: 'low',
        recommended: true,
      },
      {
        id: 'opt-polish-today',
        label: 'Polish Today UX',
        pros: ['Better daily experience'],
        cons: ['Delays decision capability'],
        riskLevel: 'low',
      },
    ],
    goalIds: ['22222222-2222-2222-2222-222222222201'],
    initiativeIds: ['11111111-1111-1111-1111-111111111101'],
    projectIds: [],
    researchIds: [],
    signalIds: [],
    applicationIds: ['coding-studio'],
    ownerId: SEED_OWNER,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: nowIso(),
  },
];

export async function ensureDecisionSeed(ctx: ModuleContext): Promise<void> {
  const existing = await ctx.storage.list('decision:');
  if (existing.length > 0) return;
  for (const decision of DEFAULT_DECISION_SEED) {
    await ctx.storage.set(`decision:${decision.id}`, decision);
  }
}

export async function listDecisions(
  ctx: ModuleContext,
  ownerId: string,
  filters?: { status?: string; category?: string; goalId?: string; initiativeId?: string },
): Promise<Decision[]> {
  if (isDbAvailable()) {
    try {
      let q = getDb()
        .selectFrom('execution.decisions')
        .selectAll()
        .where('owner_id', '=', ownerId);
      if (filters?.status) q = q.where('status', '=', filters.status);
      if (filters?.category) q = q.where('category', '=', filters.category);
      const rows = await q.orderBy('priority', 'asc').execute();
      if (rows.length > 0) {
        let decisions = rows.map((r) =>
          rowToDecision({
            id: r.id,
            title: r.title,
            question: r.question,
            rationale: r.rationale,
            category: r.category,
            domainId: r.domain_id,
            status: r.status,
            priority: r.priority,
            confidence: r.confidence ?? undefined,
            options: r.options,
            chosenOptionId: r.chosen_option_id,
            deadlineAt: r.deadline_at,
            goalIds: r.goal_ids,
            initiativeIds: r.initiative_ids,
            projectIds: r.project_ids,
            researchIds: r.research_ids,
            signalIds: r.signal_ids,
            applicationIds: r.application_ids,
            ownerId: r.owner_id,
            metadata: r.metadata ?? undefined,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            decidedAt: r.decided_at,
          }),
        );
        if (filters?.goalId) {
          decisions = decisions.filter((d) => d.goalIds.includes(filters.goalId!));
        }
        if (filters?.initiativeId) {
          decisions = decisions.filter((d) => d.initiativeIds.includes(filters.initiativeId!));
        }
        return decisions;
      }
    } catch {
      /* fall through */
    }
  }

  await ensureDecisionSeed(ctx);
  let decisions = (await listFromStorage<Decision>(ctx, 'decision:')).filter(
    (d) => d.ownerId === ownerId || d.ownerId === SEED_OWNER,
  );
  if (filters?.status) decisions = decisions.filter((d) => d.status === filters.status);
  if (filters?.category) decisions = decisions.filter((d) => d.category === filters.category);
  if (filters?.goalId) decisions = decisions.filter((d) => d.goalIds.includes(filters.goalId!));
  if (filters?.initiativeId) {
    decisions = decisions.filter((d) => d.initiativeIds.includes(filters.initiativeId!));
  }
  return decisions.sort((a, b) => a.priority - b.priority);
}

export async function getDecision(
  ctx: ModuleContext,
  ownerId: string,
  id: string,
): Promise<Decision | null> {
  const decisions = await listDecisions(ctx, ownerId);
  return decisions.find((d) => d.id === id) ?? null;
}

export async function saveDecision(ctx: ModuleContext, decision: Decision): Promise<Decision> {
  await ctx.storage.set(`decision:${decision.id}`, decision);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.decisions')
        .values({
          id: decision.id,
          owner_id: decision.ownerId,
          title: decision.title,
          question: decision.question,
          rationale: decision.rationale ?? null,
          category: decision.category,
          domain_id: decision.domainId,
          status: decision.status,
          priority: decision.priority,
          confidence: decision.confidence ?? null,
          options: decision.options as unknown as Record<string, unknown>[],
          chosen_option_id: decision.chosenOptionId ?? null,
          deadline_at: decision.deadlineAt ?? null,
          goal_ids: decision.goalIds,
          initiative_ids: decision.initiativeIds,
          project_ids: decision.projectIds,
          research_ids: decision.researchIds,
          signal_ids: decision.signalIds,
          application_ids: decision.applicationIds ?? [],
          metadata: decision.metadata ?? null,
          decided_at: decision.decidedAt ?? null,
          updated_at: decision.updatedAt,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            title: decision.title,
            question: decision.question,
            rationale: decision.rationale ?? null,
            category: decision.category,
            domain_id: decision.domainId,
            status: decision.status,
            priority: decision.priority,
            confidence: decision.confidence ?? null,
            options: decision.options as unknown as Record<string, unknown>[],
            chosen_option_id: decision.chosenOptionId ?? null,
            deadline_at: decision.deadlineAt ?? null,
            goal_ids: decision.goalIds,
            initiative_ids: decision.initiativeIds,
            project_ids: decision.projectIds,
            research_ids: decision.researchIds,
            signal_ids: decision.signalIds,
            application_ids: decision.applicationIds ?? [],
            metadata: decision.metadata ?? null,
            decided_at: decision.decidedAt ?? null,
            updated_at: decision.updatedAt,
          }),
        )
        .execute();
    } catch {
      /* storage is source of truth */
    }
  }
  return decision;
}

export async function saveLink(ctx: ModuleContext, link: ExecutionLink, ownerId: string): Promise<ExecutionLink> {
  await ctx.storage.set(`link:${link.id}`, link);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.links')
        .values({
          id: link.id,
          owner_id: ownerId,
          type: link.type,
          from_id: link.fromId,
          to_id: link.toId,
          confidence: link.confidence,
          metadata: link.metadata ?? null,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            type: link.type,
            from_id: link.fromId,
            to_id: link.toId,
            confidence: link.confidence,
            metadata: link.metadata ?? null,
          }),
        )
        .execute();
    } catch {
      /* ignore */
    }
  }
  return link;
}

export async function createDecisionLinks(
  ctx: ModuleContext,
  ownerId: string,
  decision: Decision,
): Promise<void> {
  const now = nowIso();
  for (const goalId of decision.goalIds) {
    await saveLink(
      ctx,
      {
        id: crypto.randomUUID(),
        type: 'decision_affects_goal',
        fromId: decision.id,
        toId: goalId,
        confidence: 'explicit',
        createdAt: now,
      },
      ownerId,
    );
  }
  for (const initiativeId of decision.initiativeIds) {
    await saveLink(
      ctx,
      {
        id: crypto.randomUUID(),
        type: 'decision_informs_initiative',
        fromId: decision.id,
        toId: initiativeId,
        confidence: 'explicit',
        createdAt: now,
      },
      ownerId,
    );
  }
}

export async function listOutcomes(
  ctx: ModuleContext,
  ownerId: string,
  decisionId?: string,
): Promise<DecisionOutcome[]> {
  if (isDbAvailable()) {
    try {
      let q = getDb()
        .selectFrom('execution.decision_outcomes')
        .selectAll()
        .where('owner_id', '=', ownerId);
      if (decisionId) q = q.where('decision_id', '=', decisionId);
      const rows = await q.orderBy('recorded_at', 'desc').execute();
      if (rows.length > 0) {
        return rows.map((r) =>
          rowToOutcome({
            id: r.id,
            decisionId: r.decision_id,
            chosenOptionId: r.chosen_option_id,
            summary: r.summary,
            actualImpact: r.actual_impact,
            successRating: r.success_rating,
            recordedAt: r.recorded_at,
            ownerId: r.owner_id,
          }),
        );
      }
    } catch {
      /* fall through */
    }
  }
  let outcomes = await listFromStorage<DecisionOutcome>(ctx, 'outcome:');
  outcomes = outcomes.filter((o) => o.ownerId === ownerId || o.ownerId === SEED_OWNER);
  if (decisionId) outcomes = outcomes.filter((o) => o.decisionId === decisionId);
  return outcomes.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
}

export async function saveOutcome(ctx: ModuleContext, outcome: DecisionOutcome): Promise<DecisionOutcome> {
  await ctx.storage.set(`outcome:${outcome.id}`, outcome);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.decision_outcomes')
        .values({
          id: outcome.id,
          decision_id: outcome.decisionId,
          owner_id: outcome.ownerId,
          chosen_option_id: outcome.chosenOptionId,
          summary: outcome.summary,
          actual_impact: outcome.actualImpact ?? null,
          success_rating: outcome.successRating ?? null,
          recorded_at: outcome.recordedAt,
        })
        .execute();
    } catch {
      /* ignore */
    }
  }
  return outcome;
}

export async function listReviews(
  ctx: ModuleContext,
  ownerId: string,
  decisionId?: string,
): Promise<DecisionReview[]> {
  if (isDbAvailable()) {
    try {
      let q = getDb()
        .selectFrom('execution.decision_reviews')
        .selectAll()
        .where('owner_id', '=', ownerId);
      if (decisionId) q = q.where('decision_id', '=', decisionId);
      const rows = await q.orderBy('due_at', 'asc').execute();
      if (rows.length > 0) {
        return rows.map((r) =>
          rowToReview({
            id: r.id,
            decisionId: r.decision_id,
            dueAt: r.due_at,
            status: r.status,
            notes: r.notes,
            outcomeAssessment: r.outcome_assessment,
            ownerId: r.owner_id,
            createdAt: r.created_at,
            completedAt: r.completed_at,
          }),
        );
      }
    } catch {
      /* fall through */
    }
  }
  let reviews = await listFromStorage<DecisionReview>(ctx, 'review:');
  reviews = reviews.filter((r) => r.ownerId === ownerId || r.ownerId === SEED_OWNER);
  if (decisionId) reviews = reviews.filter((r) => r.decisionId === decisionId);
  return reviews.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export async function saveReview(ctx: ModuleContext, review: DecisionReview): Promise<DecisionReview> {
  await ctx.storage.set(`review:${review.id}`, review);
  if (isDbAvailable()) {
    try {
      await getDb()
        .insertInto('execution.decision_reviews')
        .values({
          id: review.id,
          decision_id: review.decisionId,
          owner_id: review.ownerId,
          due_at: review.dueAt,
          status: review.status,
          notes: review.notes ?? null,
          outcome_assessment: review.outcomeAssessment ?? null,
          completed_at: review.completedAt ?? null,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            due_at: review.dueAt,
            status: review.status,
            notes: review.notes ?? null,
            outcome_assessment: review.outcomeAssessment ?? null,
            completed_at: review.completedAt ?? null,
          }),
        )
        .execute();
    } catch {
      /* ignore */
    }
  }
  return review;
}

export async function rememberDecision(
  ctx: ModuleContext,
  ownerId: string,
  decision: Decision,
  extra?: string,
): Promise<void> {
  const about = [
    ...decision.goalIds,
    ...decision.initiativeIds,
    ...decision.projectIds,
    ...decision.researchIds,
  ];
  await ctx.memory.remember({
    tier: 'long',
    memoryClass: 'decision',
    ownerId,
    content: `Decision: ${decision.title} — ${extra ?? decision.rationale ?? decision.question}`,
    tags: ['decision', decision.category, decision.domainId],
    sourceRef: { type: 'decision', id: decision.id },
    about,
  });
}

export async function rememberOutcome(
  ctx: ModuleContext,
  ownerId: string,
  decision: Decision,
  outcome: DecisionOutcome,
): Promise<void> {
  await ctx.memory.remember({
    tier: 'long',
    memoryClass: 'decision',
    ownerId,
    content: `Decision outcome: ${decision.title} — ${outcome.summary}${outcome.actualImpact ? `. Impact: ${outcome.actualImpact}` : ''}`,
    tags: ['decision', 'outcome', decision.category],
    sourceRef: { type: 'decision', id: decision.id },
    about: decision.goalIds,
  });
}

export type { ExecutionLinkType };
