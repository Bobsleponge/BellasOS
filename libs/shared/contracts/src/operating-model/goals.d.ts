/**
 * Goal and initiative types for BellasOS execution layer.
 */
import type { DomainId } from './domains';
export declare const GOAL_CATEGORIES: readonly ["personal", "business", "financial", "project", "research", "learning", "operational"];
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];
export declare const GOAL_STATUSES: readonly ["active", "paused", "completed", "abandoned"];
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export declare const GOAL_HORIZONS: readonly ["weekly", "monthly", "quarterly", "yearly", "ongoing"];
export type GoalHorizon = (typeof GOAL_HORIZONS)[number];
export declare const GOAL_PRIORITIES: readonly [1, 2, 3, 4, 5];
export type GoalPriority = (typeof GOAL_PRIORITIES)[number];
export declare const GOAL_PROGRESS_TRENDS: readonly ["up", "down", "flat", "unknown"];
export type GoalProgressTrend = (typeof GOAL_PROGRESS_TRENDS)[number];
export interface GoalTarget {
    metric: string;
    targetValue: number;
    unit?: string;
    direction: 'increase' | 'decrease' | 'maintain';
}
export interface GoalProgress {
    current?: number;
    baseline?: number;
    pct?: number;
    trend: GoalProgressTrend;
    updatedAt?: string;
}
export interface Goal {
    id: string;
    objective: string;
    target?: GoalTarget;
    category: GoalCategory;
    domainId: DomainId;
    horizon: GoalHorizon;
    deadlineAt?: string;
    progress: GoalProgress;
    priority: GoalPriority;
    status: GoalStatus;
    initiativeId?: string;
    organizationId?: string;
    applicationIds?: string[];
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}
export declare const INITIATIVE_STATUSES: readonly ["active", "paused", "completed"];
export type InitiativeStatus = (typeof INITIATIVE_STATUSES)[number];
export declare const INITIATIVE_MOMENTUM: readonly ["accelerating", "steady", "slowing", "blocked"];
export type InitiativeMomentum = (typeof INITIATIVE_MOMENTUM)[number];
export interface Initiative {
    id: string;
    name: string;
    description?: string;
    status: InitiativeStatus;
    momentum: InitiativeMomentum;
    organizationId?: string;
    applicationIds: string[];
    goalIds: string[];
    projectIds?: string[];
    priority: GoalPriority;
    ownerId: string;
    startedAt?: string;
    targetAt?: string;
    createdAt: string;
    updatedAt: string;
}
export declare const EXECUTION_LINK_TYPES: readonly ["initiative_contains_goal", "goal_drives_project", "signal_affects_goal", "organization_owns_initiative", "organization_owns_goal", "decision_affects_goal", "decision_informs_initiative", "research_informs_decision", "signal_prompts_decision", "project_produces_decision", "decision_has_outcome", "insight_informs_decision", "workspace_contains_goal", "workspace_produces_artifact", "artifact_informs_decision", "session_focuses_workspace"];
export type ExecutionLinkType = (typeof EXECUTION_LINK_TYPES)[number];
export interface ExecutionLink {
    id: string;
    type: ExecutionLinkType;
    fromId: string;
    toId: string;
    confidence: 'explicit' | 'inferred' | 'stale';
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export type GoalImpactDirection = 'positive' | 'negative' | 'neutral' | 'at_risk';
export interface GoalImpact {
    goalId: string;
    goalObjective: string;
    initiativeId?: string;
    initiativeName?: string;
    impact: GoalImpactDirection;
    progressDelta?: number;
    relevanceLine: string;
    recommendedAction?: string;
}
export type StrategicInsightKind = 'goal_progress' | 'goal_risk' | 'initiative_momentum' | 'initiative_blocker' | 'missed_opportunity' | 'emerging_opportunity';
export interface StrategicInsight {
    id: string;
    kind: StrategicInsightKind;
    title: string;
    summary: string;
    goalId?: string;
    initiativeId?: string;
    severity: 'low' | 'medium' | 'high';
    recommendedAction?: string;
}
export interface GoalProgressSummary {
    goalId: string;
    objective: string;
    initiativeName?: string;
    status: GoalStatus;
    pct?: number;
    trend: GoalProgressTrend;
    onTrack: boolean;
    headline: string;
}
export interface GoalContext {
    goals: Goal[];
    initiatives: Initiative[];
    activeGoalIds: string[];
    activeInitiativeIds: string[];
    focusGoalId?: string;
    focusInitiativeId?: string;
}
//# sourceMappingURL=goals.d.ts.map