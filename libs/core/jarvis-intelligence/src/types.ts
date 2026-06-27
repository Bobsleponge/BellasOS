import type {
  CallContext,
  CompletionRequest,
  ContextStack,
  DayPhase,
  DecisionContext,
  DecisionPoint,
  DecisionRecommendation,
  DecisionSummary,
  DomainId,
  GoalContext,
  GoalImpact,
  GoalProgressSummary,
  NextAction,
  StrategicInsight,
  WorldContext,
  WorldIntelligenceSummary,
  WorldOpportunity,
  WorldRelevance,
  WorldSignal,
  WorldTrend,
  WorkspaceContext,
  WorkspaceProgressSummary,
} from '@bellasos/contracts';

export type { DecisionPoint };

export type BriefingRhythm = 'morning' | 'midday' | 'evening' | 'night';

export type SignalTier = 'immediate' | 'briefing' | 'notification' | 'silent';

export type OpportunityKind =
  | 'opportunity'
  | 'risk'
  | 'decision'
  | 'follow_up'
  | 'blocker';

export interface SignalScores {
  importance: number;
  urgency: number;
  relevance: number;
  confidence: number;
}

export interface IntelligenceSignal {
  id: string;
  source: string;
  domain: DomainId;
  applicationId?: string;
  title: string;
  summary: string;
  relevanceLine?: string;
  createdAt?: string;
  scores: SignalScores;
  composite: number;
  tier: SignalTier;
  kind?: OpportunityKind;
  href?: string;
  raw?: unknown;
  goalImpact?: GoalImpact[];
  strategicScore?: number;
  decisionPoint?: DecisionPoint;
  decisionRecommendation?: DecisionRecommendation;
  worldSignal?: WorldSignal;
  worldRelevance?: WorldRelevance;
  worldOpportunity?: WorldOpportunity;
}

export interface JarvisBriefing {
  rhythm: BriefingRhythm;
  phase: DayPhase;
  greeting: string;
  narrative: string;
  offerDepth: string;
  highlights: IntelligenceSignal[];
  contextStack: ContextStack;
  generatedAt: string;
  strategicInsights: StrategicInsight[];
  goalProgress: GoalProgressSummary[];
  decisionRecommendations: DecisionRecommendation[];
  openDecisions: DecisionSummary[];
  nextActions: NextAction[];
  worldPulse: WorldIntelligenceSummary[];
  worldTrends: WorldTrend[];
  externalHighlights: IntelligenceSignal[];
  workspaceProgress?: WorkspaceProgressSummary;
}

export interface TodayItemKind {
  kind: 'approval' | 'alert' | 'intelligence' | 'wealth' | 'activity' | 'priority';
}

export interface TodayItem {
  id: string;
  kind: 'approval' | 'alert' | 'intelligence' | 'wealth' | 'activity' | 'priority' | 'goal' | 'decision' | 'world' | 'workspace';
  title: string;
  subtitle?: string;
  href?: string;
  actionLabel?: string;
  createdAt?: string;
  priority: number;
}

export interface TodayFeed {
  greeting: string;
  contextLine?: string;
  items: TodayItem[];
  connection: { status: 'connected' | 'degraded' | 'offline'; label: string };
  generatedAt: string;
}

export interface ContextResolveInput {
  sessionId?: string;
  applicationId?: string;
  operatingMode?: string;
  codingProjectId?: string;
  principalDisplayName?: string;
  pendingApprovals?: number;
  unreadNotifications?: number;
  openResearchReports?: number;
  goalContext?: GoalContext;
  decisionContext?: DecisionContext;
  worldContext?: WorldContext;
  workspaceId?: string;
  workspaceContext?: WorkspaceContext;
}

export interface CollectSignalsOptions {
  includeIngestion?: boolean;
  includeVentures?: boolean;
  maxIntel?: number;
  maxWorld?: number;
}

export interface IntelligencePlatform {
  approvals: {
    pending(): Promise<
      Array<{
        id: string;
        moduleId: string;
        action: string;
        createdAt: string;
      }>
    >;
  };
  notifications: {
    list(userId: string): Promise<
      Array<{
        id: string;
        title: string;
        body: string;
        read: boolean;
        createdAt: string;
        level?: string;
      }>
    >;
  };
  audit: {
    recent(): Array<{
      id: string;
      action: string;
      outcome: string;
      createdAt: string;
    }>;
  };
  health(): {
    status: string;
    db?: boolean;
    modules?: Array<{ id: string; status: string }>;
  };
  registry: {
    dispatch(
      moduleId: string,
      action: string,
      input: unknown,
      ctx: CallContext,
    ): Promise<unknown>;
  };
  ai: {
    complete(
      request: CompletionRequest,
    ): Promise<{ text: string }>;
  };
}

export interface ComposeBriefingInput {
  platform: IntelligencePlatform;
  ctx: CallContext;
  rhythm: BriefingRhythm;
  contextStack: ContextStack;
  signals: IntelligenceSignal[];
  userDisplayName?: string;
  deep?: boolean;
  goalContext?: GoalContext;
  strategicInsights?: StrategicInsight[];
  goalProgress?: GoalProgressSummary[];
  decisionContext?: DecisionContext;
  decisionRecommendations?: DecisionRecommendation[];
  openDecisions?: DecisionSummary[];
  nextActions?: NextAction[];
  worldContext?: WorldContext;
  worldPulse?: WorldIntelligenceSummary[];
  worldTrends?: WorldTrend[];
  externalHighlights?: IntelligenceSignal[];
  workspaceContext?: WorkspaceContext;
  workspaceProgress?: WorkspaceProgressSummary;
}

export interface BuildIntelligenceInput {
  platform: IntelligencePlatform;
  ctx: CallContext;
  rhythm?: BriefingRhythm;
  deep?: boolean;
  skipCache?: boolean;
  contextInput: ContextResolveInput;
}
