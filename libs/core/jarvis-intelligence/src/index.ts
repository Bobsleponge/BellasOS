import type { CallContext } from '@bellasos/contracts';
import { tagOpportunities } from './opportunities';
import { composeBriefing, briefingToTranscript, looksLikeBriefingRequest } from './briefing';
import {
  resolveContextStack,
  rhythmFromHour,
  applicationFromPathname,
  inferOperatingMode,
} from './context';
import { loadDecisionContext } from './decision-context';
import { analyzeDecisionIntelligence } from './decision-intelligence';
import { detectDecisionPoints } from './decision-point-detector';
import { generateDecisionRecommendations } from './decision-recommendations';
import { loadGoalContext } from './goal-context';
import { loadWorldContext } from './world-context';
import { loadWorkspaceContext } from './workspace-context';
import { summarizeWorkspaceProgress } from './workspace-intelligence';
import { linkWorldRelevance } from './world-relevance';
import { tagWorldOpportunities } from './world-opportunities';
import { analyzeWorldStrategicIntelligence } from './world-strategic-intelligence';
import { collectSignals } from './signals';
import { linkSignalsToGoals } from './signal-goal-linker';
import {
  analyzeStrategicIntelligence,
  summarizeGoalProgress,
} from './strategic-intelligence';
import { rankSignals, signalsForBriefing } from './priority';
import {
  buildTodayFeed,
  decisionRecommendationsToTodayItems,
  signalsToTodayItems,
} from './today-mapper';
import {
  briefingCacheKey,
  getCachedBriefing,
  invalidateAllBriefingCaches,
  invalidateBriefingCache,
  setCachedBriefing,
} from './cache';
import type {
  BriefingRhythm,
  BuildIntelligenceInput,
  ContextResolveInput,
  IntelligencePlatform,
  IntelligenceSignal,
  JarvisBriefing,
  TodayFeed,
} from './types';

export * from './types';
export * from './context';
export * from './signals';
export * from './priority';
export * from './opportunities';
export * from './briefing';
export * from './today-mapper';
export * from './cache';
export * from './goal-context';
export * from './decision-context';
export * from './decision-point-detector';
export * from './decision-recommendations';
export * from './decision-intelligence';
export * from './signal-goal-linker';
export * from './strategic-intelligence';
export * from './world-context';
export * from './world-signals';
export * from './world-relevance';
export * from './world-opportunities';
export * from './world-strategic-intelligence';
export * from './workspace-context';
export * from './workspace-intelligence';

export interface IntelligenceBundle {
  contextStack: ReturnType<typeof resolveContextStack>;
  signals: IntelligenceSignal[];
  briefing: JarvisBriefing;
  todayFeed: TodayFeed;
  todayItems: ReturnType<typeof signalsToTodayItems>;
  transcript: string;
  goalProgress: ReturnType<typeof summarizeGoalProgress>;
  strategicInsights: ReturnType<typeof analyzeStrategicIntelligence>;
  decisionContext: Awaited<ReturnType<typeof loadDecisionContext>>;
  decisionRecommendations: ReturnType<typeof generateDecisionRecommendations>['recommendations'];
  openDecisions: ReturnType<typeof analyzeDecisionIntelligence>['openDecisions'];
  nextActions: ReturnType<typeof analyzeDecisionIntelligence>['nextActions'];
  worldContext: Awaited<ReturnType<typeof loadWorldContext>>;
  worldPulse: ReturnType<typeof analyzeWorldStrategicIntelligence>['worldPulse'];
  worldTrends: ReturnType<typeof analyzeWorldStrategicIntelligence>['worldTrends'];
  externalHighlights: ReturnType<typeof analyzeWorldStrategicIntelligence>['externalHighlights'];
  workspaceContext: Awaited<ReturnType<typeof loadWorkspaceContext>>;
  workspaceProgress: ReturnType<typeof summarizeWorkspaceProgress>;
}

async function persistWorldEnrichments(
  platform: IntelligencePlatform,
  ctx: CallContext,
  signals: IntelligenceSignal[],
  trends: ReturnType<typeof analyzeWorldStrategicIntelligence>['worldTrends'],
  pulse: ReturnType<typeof analyzeWorldStrategicIntelligence>['worldPulse'],
): Promise<void> {
  const enrichments = signals
    .filter((s) => s.worldSignal)
    .map((s) => ({
      ingestDocId: s.worldSignal!.ingestDocId,
      sector: s.worldSignal!.sector,
      relevance: s.worldRelevance,
      opportunity: s.worldOpportunity,
      compositeScore: s.composite,
      goalIds: s.worldRelevance?.goalIds ?? [],
      initiativeIds: s.worldRelevance?.initiativeIds ?? [],
      decisionIds: s.worldRelevance?.decisionIds ?? [],
    }));

  if (enrichments.length === 0 && trends.length === 0) return;

  await platform.registry.dispatch(
    'bellasos.intelligence',
    'world.enrichments.save',
    { enrichments },
    ctx,
  );
  await platform.registry.dispatch(
    'bellasos.intelligence',
    'world.memory.summarize',
    { rhythm: 'morning', trends, pulse },
    ctx,
  );
}

async function processSignals(
  platform: IntelligencePlatform,
  ctx: CallContext,
  contextInput: ContextResolveInput,
): Promise<{
  rawSignals: IntelligenceSignal[];
  goalContext: Awaited<ReturnType<typeof loadGoalContext>>;
  decisionContext: Awaited<ReturnType<typeof loadDecisionContext>>;
  contextStack: ReturnType<typeof resolveContextStack>;
  linked: IntelligenceSignal[];
  ranked: IntelligenceSignal[];
  goalProgress: ReturnType<typeof summarizeGoalProgress>;
  strategicInsights: ReturnType<typeof analyzeStrategicIntelligence>;
  decisionRecommendations: ReturnType<typeof generateDecisionRecommendations>['recommendations'];
  openDecisions: ReturnType<typeof analyzeDecisionIntelligence>['openDecisions'];
  nextActions: ReturnType<typeof analyzeDecisionIntelligence>['nextActions'];
  worldContext: Awaited<ReturnType<typeof loadWorldContext>>;
  worldPulse: ReturnType<typeof analyzeWorldStrategicIntelligence>['worldPulse'];
  worldTrends: ReturnType<typeof analyzeWorldStrategicIntelligence>['worldTrends'];
  externalHighlights: ReturnType<typeof analyzeWorldStrategicIntelligence>['externalHighlights'];
  workspaceContext: Awaited<ReturnType<typeof loadWorkspaceContext>>;
  workspaceProgress: ReturnType<typeof summarizeWorkspaceProgress>;
}> {
  const rawSignals = await collectSignals(platform, ctx);
  const pendingApprovals = rawSignals.filter((s) => s.source.startsWith('approval')).length;
  const unreadNotifications = rawSignals.filter((s) => s.source.startsWith('notification')).length;
  const openResearch = rawSignals.filter((s) => s.source.startsWith('research')).length;

  const [goalContext, decisionContext, worldContext, workspaceContext] = await Promise.all([
    loadGoalContext(platform, ctx, contextInput.applicationId),
    loadDecisionContext(platform, ctx, contextInput.applicationId),
    loadWorldContext(platform, ctx),
    loadWorkspaceContext(platform, ctx, contextInput.workspaceId),
  ]);

  const contextStack = resolveContextStack({
    ...contextInput,
    pendingApprovals,
    unreadNotifications,
    openResearchReports: openResearch,
    goalContext,
    decisionContext,
    worldContext,
    workspaceContext: workspaceContext ?? undefined,
  });

  const tagged = tagOpportunities(rawSignals);
  const linked = linkSignalsToGoals(tagged, goalContext);
  const withWorldRelevance = linkWorldRelevance(
    linked,
    goalContext,
    decisionContext,
    worldContext,
  );
  const withWorldOpportunities = tagWorldOpportunities(withWorldRelevance, worldContext);
  const strategicPre = analyzeStrategicIntelligence(withWorldOpportunities, goalContext);
  const worldIntel = analyzeWorldStrategicIntelligence(withWorldOpportunities);
  const withDecisionPoints = detectDecisionPoints(
    withWorldOpportunities,
    goalContext,
    decisionContext,
    strategicPre,
  );
  const { signals: withRecommendations, recommendations: decisionRecommendations } =
    generateDecisionRecommendations(
      withDecisionPoints,
      goalContext,
      decisionContext,
      contextStack,
      [],
    );
  const ranked = rankSignals(
    withRecommendations,
    contextStack,
    12,
    goalContext,
    decisionContext,
    worldContext,
    workspaceContext,
  );
  const goalProgress = summarizeGoalProgress(goalContext);
  const workspaceProgress = summarizeWorkspaceProgress(workspaceContext);
  const strategicInsights = analyzeStrategicIntelligence(ranked, goalContext);
  const decisionIntel = analyzeDecisionIntelligence(
    ranked,
    decisionContext,
    decisionRecommendations,
  );

  void persistWorldEnrichments(platform, ctx, ranked, worldIntel.worldTrends, worldIntel.worldPulse).catch(
    () => undefined,
  );

  return {
    rawSignals,
    goalContext,
    decisionContext,
    worldContext,
    contextStack,
    linked: withRecommendations,
    ranked,
    goalProgress,
    strategicInsights,
    decisionRecommendations,
    openDecisions: decisionIntel.openDecisions,
    nextActions: decisionIntel.nextActions,
    worldPulse: worldIntel.worldPulse,
    worldTrends: worldIntel.worldTrends,
    externalHighlights: worldIntel.externalHighlights,
    workspaceContext,
    workspaceProgress,
  };
}

export async function buildTodaySnapshot(
  input: Omit<BuildIntelligenceInput, 'deep' | 'skipCache'>,
): Promise<{ todayFeed: TodayFeed; signals: IntelligenceSignal[] }> {
  const processed = await processSignals(
    input.platform,
    input.ctx,
    input.contextInput,
  );
  const health = input.platform.health();
  const todayFeed = buildTodayFeed(
    processed.ranked,
    health,
    input.contextInput.principalDisplayName,
    processed.goalProgress,
    processed.decisionRecommendations,
    processed.decisionContext,
    processed.workspaceProgress,
  );

  return { todayFeed, signals: processed.ranked };
}

export async function buildWorldSnapshot(
  input: Omit<BuildIntelligenceInput, 'deep' | 'skipCache' | 'rhythm'>,
): Promise<{
  signals: IntelligenceSignal[];
  trends: ReturnType<typeof analyzeWorldStrategicIntelligence>['worldTrends'];
  pulse: ReturnType<typeof analyzeWorldStrategicIntelligence>['worldPulse'];
}> {
  const processed = await processSignals(
    input.platform,
    input.ctx,
    input.contextInput,
  );
  return {
    signals: processed.ranked.filter((s) => s.worldSignal),
    trends: processed.worldTrends,
    pulse: processed.worldPulse,
  };
}

export async function buildIntelligenceBundle(
  input: BuildIntelligenceInput,
): Promise<IntelligenceBundle> {
  const rhythm =
    input.rhythm ??
    rhythmFromHour(new Date().getHours());

  const processed = await processSignals(
    input.platform,
    input.ctx,
    input.contextInput,
  );
  const forRhythm = signalsForBriefing(processed.ranked, rhythm);

  const cacheKey = briefingCacheKey({
    userId: input.ctx.principal.id,
    rhythm,
    application: input.contextInput.applicationId,
    mode: processed.contextStack.operatingMode,
    workspaceId: input.contextInput.workspaceId ?? processed.workspaceContext?.workspace.id,
  });

  let briefing: JarvisBriefing | null = null;
  if (!input.skipCache && !input.deep) {
    briefing = getCachedBriefing(cacheKey);
  }

  if (!briefing) {
    briefing = await composeBriefing({
      platform: input.platform,
      ctx: input.ctx,
      rhythm,
      contextStack: processed.contextStack,
      signals: forRhythm.length > 0 ? forRhythm : processed.ranked,
      userDisplayName: input.contextInput.principalDisplayName,
      deep: input.deep,
      goalContext: processed.goalContext,
      strategicInsights: processed.strategicInsights,
      goalProgress: processed.goalProgress,
      decisionContext: processed.decisionContext,
      decisionRecommendations: processed.decisionRecommendations,
      openDecisions: processed.openDecisions,
      nextActions: processed.nextActions,
      worldContext: processed.worldContext,
      worldPulse: processed.worldPulse,
      worldTrends: processed.worldTrends,
      externalHighlights: processed.externalHighlights,
      workspaceContext: processed.workspaceContext ?? undefined,
      workspaceProgress: processed.workspaceProgress,
    });
    if (!input.deep) {
      setCachedBriefing(cacheKey, briefing);
    }
  }

  const health = input.platform.health();
  const todayFeed = buildTodayFeed(
    processed.ranked,
    health,
    input.contextInput.principalDisplayName,
    processed.goalProgress,
    processed.decisionRecommendations,
    processed.decisionContext,
    processed.workspaceProgress,
  );
  const todayItems = todayFeed.items;

  return {
    contextStack: processed.contextStack,
    signals: processed.ranked,
    briefing,
    todayFeed,
    todayItems,
    transcript: briefingToTranscript(briefing),
    goalProgress: processed.goalProgress,
    strategicInsights: processed.strategicInsights,
    decisionContext: processed.decisionContext,
    decisionRecommendations: processed.decisionRecommendations,
    openDecisions: processed.openDecisions,
    nextActions: processed.nextActions,
    worldContext: processed.worldContext,
    worldPulse: processed.worldPulse,
    worldTrends: processed.worldTrends,
    externalHighlights: processed.externalHighlights,
    workspaceContext: processed.workspaceContext,
    workspaceProgress: processed.workspaceProgress,
  };
}

export {
  applicationFromPathname,
  inferOperatingMode,
  invalidateBriefingCache,
  invalidateAllBriefingCaches,
  looksLikeBriefingRequest,
};
export {
  filterAgentsForMode,
  filterModulesForMode,
  formatModeRoutingRules,
  formatOperatingModeForPrompt,
  getOperatingModeSpec,
  isOperatingMode,
  isUserSelectableMode,
  modeDomainIds,
  modeFromAgentType,
  parseExplicitModeFromMessage,
  inferModeFromMessage,
  resolveAdaptiveModeSwitch,
  resolveOperatingModeForContext,
  USER_SELECTABLE_MODES,
} from './operating-mode';
export {
  appendReplyScopeToPrompt,
  formatReplyScopeForPrompt,
  REPLY_SCOPE_INSTRUCTIONS,
  resolveReplyScope,
  shouldUseSourceAttribution,
  type JarvisReplyScope,
  type ReplyScopeResult,
} from './reply-scope';
