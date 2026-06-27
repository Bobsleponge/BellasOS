/**
 * Decision types for BellasOS execution layer and decision intelligence.
 */
import type { DomainId } from './domains';
import type { GoalPriority } from './goals';
export declare const DECISION_CATEGORIES: readonly ["business", "financial", "product", "research", "operational", "personal"];
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];
export declare const DECISION_STATUSES: readonly ["open", "decided", "deferred", "superseded", "cancelled"];
export type DecisionStatus = (typeof DECISION_STATUSES)[number];
export declare const DECISION_RISK_LEVELS: readonly ["low", "medium", "high"];
export type DecisionRiskLevel = (typeof DECISION_RISK_LEVELS)[number];
export interface DecisionConfidence {
    score: number;
    factors: string[];
}
export interface DecisionOption {
    id: string;
    label: string;
    description?: string;
    pros: string[];
    cons: string[];
    riskLevel: DecisionRiskLevel;
    estimatedImpact?: string;
    recommended?: boolean;
}
export interface Decision {
    id: string;
    title: string;
    question: string;
    rationale?: string;
    category: DecisionCategory;
    domainId: DomainId;
    status: DecisionStatus;
    priority: GoalPriority;
    confidence?: DecisionConfidence;
    options: DecisionOption[];
    chosenOptionId?: string;
    deadlineAt?: string;
    goalIds: string[];
    initiativeIds: string[];
    projectIds: string[];
    researchIds: string[];
    signalIds: string[];
    applicationIds?: string[];
    ownerId: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    decidedAt?: string;
}
export interface DecisionOutcome {
    id: string;
    decisionId: string;
    chosenOptionId: string;
    summary: string;
    actualImpact?: string;
    successRating?: 1 | 2 | 3 | 4 | 5;
    recordedAt: string;
    ownerId: string;
}
export declare const DECISION_REVIEW_STATUSES: readonly ["scheduled", "completed", "skipped"];
export type DecisionReviewStatus = (typeof DECISION_REVIEW_STATUSES)[number];
export interface DecisionReview {
    id: string;
    decisionId: string;
    dueAt: string;
    status: DecisionReviewStatus;
    notes?: string;
    outcomeAssessment?: string;
    ownerId: string;
    createdAt: string;
    completedAt?: string;
}
export interface DecisionRecommendation {
    id: string;
    decisionId?: string;
    signalId?: string;
    title: string;
    question: string;
    recommendedOption: string;
    tradeoffLine: string;
    risks: string[];
    opportunities: string[];
    confidence: DecisionConfidence;
    rationale: string;
    goalIds?: string[];
    initiativeIds?: string[];
    nextAction?: string;
}
export interface DecisionPoint {
    signalId: string;
    title: string;
    question: string;
    category: DecisionCategory;
    linkedDecisionId?: string;
    goalIds: string[];
    initiativeIds: string[];
}
export interface DecisionSummary {
    id: string;
    title: string;
    question: string;
    status: DecisionStatus;
    category: DecisionCategory;
    priority: GoalPriority;
    optionCount: number;
    deadlineAt?: string;
    goalIds: string[];
    initiativeIds: string[];
}
export interface NextAction {
    id: string;
    label: string;
    rationale: string;
    confidence: number;
    decisionId?: string;
    signalId?: string;
    href?: string;
}
export interface DecisionContext {
    decisions: Decision[];
    openDecisions: Decision[];
    recentOutcomes: DecisionOutcome[];
    pendingReviews: DecisionReview[];
    focusDecisionId?: string;
}
//# sourceMappingURL=decisions.d.ts.map