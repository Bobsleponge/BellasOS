import type {
  DecisionContext,
  Goal,
  GoalContext,
  GoalImpact,
  Initiative,
  WorldContext,
  WorldRelevance,
  WorldSector,
} from '@bellasos/contracts';
import type { IntelligenceSignal } from './types';

function findInitiativeForGoal(
  goal: Goal,
  goalContext: GoalContext,
): Initiative | undefined {
  if (goal.initiativeId) {
    return goalContext.initiatives.find((i) => i.id === goal.initiativeId);
  }
  return goalContext.initiatives.find((i) => i.goalIds.includes(goal.id));
}

const SECTOR_AUDIENCE: Partial<Record<WorldSector, string>> = {
  mining: 'Wealth and commodity exposure',
  energy: 'Energy holdings and operational costs',
  markets: 'Portfolio and financial goals',
  ai: 'Technology initiatives and research',
  technology: 'Build and research initiatives',
  user_business: 'Harvi and TruAfrica ventures',
  user_investments: 'Portfolio holdings',
  user_research: 'Active research topics',
  user_projects: 'Coding projects',
  south_africa: 'Local ventures and macro context',
  macroeconomics: 'Financial planning and ventures',
  healthcare: 'Healthcare research and investments',
};

const SECTOR_GOAL_CATEGORIES: Partial<Record<WorldSector, Goal['category'][]>> = {
  mining: ['financial'],
  energy: ['financial', 'operational'],
  markets: ['financial'],
  ai: ['learning', 'research', 'operational'],
  technology: ['operational', 'learning'],
  user_business: ['business'],
  user_research: ['research', 'learning'],
  user_projects: ['operational'],
  south_africa: ['business', 'financial'],
};

const SECTOR_APPLICATIONS: Partial<Record<WorldSector, string[]>> = {
  mining: ['wealth'],
  markets: ['wealth'],
  user_investments: ['wealth'],
  user_business: ['harvi-and-co', 'truafrica'],
  user_research: ['research'],
  user_projects: ['coding-studio'],
  ai: ['research', 'coding-studio'],
};

function buildImpact(
  goal: Goal,
  initiative: Initiative | undefined,
  impact: GoalImpact['impact'],
  relevanceLine: string,
): GoalImpact {
  return {
    goalId: goal.id,
    goalObjective: goal.objective,
    initiativeId: initiative?.id,
    initiativeName: initiative?.name,
    impact,
    relevanceLine,
  };
}

function goalsForSector(sector: WorldSector, goalContext: GoalContext): Goal[] {
  const categories = SECTOR_GOAL_CATEGORIES[sector] ?? [];
  const appIds = SECTOR_APPLICATIONS[sector] ?? [];
  return goalContext.goals.filter(
    (g) =>
      g.status === 'active' &&
      (categories.includes(g.category) ||
        appIds.some((app) => g.applicationIds?.includes(app))),
  );
}

function initiativesForSector(sector: WorldSector, goalContext: GoalContext): Initiative[] {
  const appIds = SECTOR_APPLICATIONS[sector] ?? [];
  return goalContext.initiatives.filter(
    (i) =>
      i.status === 'active' &&
      appIds.some((app) => i.applicationIds.includes(app)),
  );
}

function decisionsForGoals(
  goalIds: string[],
  decisionContext?: DecisionContext,
): string[] {
  if (!decisionContext) return [];
  return decisionContext.openDecisions
    .filter((d) => d.goalIds.some((id) => goalIds.includes(id)))
    .map((d) => d.id);
}

function textMatchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function relevanceLineForSector(sector: WorldSector, title: string): string {
  if (sector === 'mining') {
    return `Mining development "${title}" may affect commodity exposure and financial goals.`;
  }
  if (sector === 'user_business') {
    return `Venture-relevant development: ${title}.`;
  }
  if (sector === 'markets' || sector === 'user_investments') {
    return `Market move "${title}" may affect portfolio and net worth targets.`;
  }
  if (sector === 'ai' || sector === 'technology') {
    return `Technology shift "${title}" may inform build and research priorities.`;
  }
  if (sector === 'south_africa') {
    return `South Africa development "${title}" may affect local ventures and planning.`;
  }
  return `External ${sector.replace(/_/g, ' ')} signal: ${title}.`;
}

export function computeWorldRelevance(
  signal: IntelligenceSignal,
  goalContext: GoalContext,
  decisionContext: DecisionContext | undefined,
  worldContext: WorldContext,
): WorldRelevance | undefined {
  const world = signal.worldSignal;
  if (!world) return undefined;

  const sector = world.sector;
  const text = `${world.title} ${world.summary} ${world.tags.join(' ')}`;
  const matchedGoals = goalsForSector(sector, goalContext);
  const matchedInitiatives = initiativesForSector(sector, goalContext);
  const goalIds = matchedGoals.map((g) => g.id);
  const initiativeIds = matchedInitiatives.map((i) => i.id);
  const decisionIds = decisionsForGoals(goalIds, decisionContext);

  const applicationIds = [...(SECTOR_APPLICATIONS[sector] ?? [])];
  if (sector === 'user_business' && textMatchesKeywords(text, worldContext.ventureKeywords)) {
    if (!applicationIds.includes('harvi-and-co')) applicationIds.push('harvi-and-co');
  }

  const researchIds: string[] = [];
  for (const topic of worldContext.researchTopics) {
    if (text.toLowerCase().includes(topic.toLowerCase())) researchIds.push(topic);
  }

  const projectIds: string[] = [];
  for (const project of worldContext.projectNames) {
    if (text.toLowerCase().includes(project.toLowerCase())) projectIds.push(project);
  }

  for (const symbol of worldContext.symbols) {
    if (text.toUpperCase().includes(symbol.toUpperCase()) && !applicationIds.includes('wealth')) {
      applicationIds.push('wealth');
    }
  }

  const hasLinks =
    goalIds.length > 0 ||
    initiativeIds.length > 0 ||
    decisionIds.length > 0 ||
    applicationIds.length > 0 ||
    researchIds.length > 0 ||
    projectIds.length > 0;

  if (!hasLinks && world.baseScore < 0.55) return undefined;

  const affectedEntities = [
    ...matchedGoals.map((g) => g.objective),
    ...matchedInitiatives.map((i) => i.name),
    ...applicationIds,
  ].slice(0, 6);

  return {
    relevanceLine: relevanceLineForSector(sector, world.title),
    audienceLine: SECTOR_AUDIENCE[sector] ?? 'General strategic awareness',
    goalIds,
    initiativeIds,
    decisionIds,
    applicationIds,
    researchIds,
    projectIds,
    affectedEntities,
  };
}

export function linkWorldRelevance(
  signals: IntelligenceSignal[],
  goalContext: GoalContext,
  decisionContext: DecisionContext | undefined,
  worldContext: WorldContext,
): IntelligenceSignal[] {
  return signals.map((signal) => {
    if (!signal.worldSignal) return signal;
    const worldRelevance = computeWorldRelevance(
      signal,
      goalContext,
      decisionContext,
      worldContext,
    );
    if (!worldRelevance) return signal;

    const sectorGoals = goalsForSector(signal.worldSignal.sector, goalContext);
    const goalImpacts: GoalImpact[] = sectorGoals.slice(0, 2).map((goal) =>
      buildImpact(
        goal,
        findInitiativeForGoal(goal, goalContext),
        signal.worldSignal!.sector === 'mining' ? 'neutral' : 'neutral',
        worldRelevance.relevanceLine,
      ),
    );

    return {
      ...signal,
      worldRelevance,
      relevanceLine: signal.relevanceLine ?? worldRelevance.relevanceLine,
      goalImpact: signal.goalImpact?.length ? signal.goalImpact : goalImpacts,
      strategicScore: Math.max(signal.strategicScore ?? 0, goalImpacts.length ? 0.7 : 0.55),
    };
  });
}
