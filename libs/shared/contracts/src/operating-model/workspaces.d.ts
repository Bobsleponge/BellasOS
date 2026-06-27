/**
 * Mission workspaces - objective-centered execution environments.
 * Distinct from product spatial workspace layers (slide/peek/split UI).
 */
import type { DomainId } from './domains';
import type { DecisionSummary } from './decisions';
import type { Goal, Initiative } from './goals';
import type { WorldIntelligenceSummary } from './world-intelligence';
import type { Artifact } from './artifacts';
import type { FocusSession } from './sessions';
export declare const WORKSPACE_TYPES: readonly ["research", "business", "investment", "project", "strategy", "custom"];
export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];
export declare const WORKSPACE_STATUSES: readonly ["draft", "active", "paused", "archived"];
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];
export interface Workspace {
    id: string;
    title: string;
    objective: string;
    type: WorkspaceType;
    status: WorkspaceStatus;
    domainId: DomainId;
    organizationId?: string;
    applicationIds: string[];
    goalIds: string[];
    initiativeIds: string[];
    decisionIds: string[];
    artifactIds: string[];
    researchIds: string[];
    memoryIds: string[];
    worldSectorTags: string[];
    keywords: string[];
    progressSummary?: string;
    ownerId: string;
    activatedAt?: string;
    archivedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface WorkspaceGatherCounts {
    goals: number;
    initiatives: number;
    decisions: number;
    research: number;
    artifacts: number;
    applications: number;
}
export interface WorkspaceGatherResult {
    workspace: Workspace;
    added: WorkspaceGatherCounts;
}
export interface WorkspaceContext {
    workspace: Workspace;
    activeSession?: FocusSession;
    goals: Goal[];
    initiatives: Initiative[];
    openDecisions: DecisionSummary[];
    artifacts: Artifact[];
    recentMemories: Array<{
        id: string;
        content: string;
        tags: string[];
    }>;
    worldPulse: WorldIntelligenceSummary[];
    applicationCapabilities: string[];
}
export interface WorkspaceProgressSummary {
    workspaceId: string;
    title: string;
    objective: string;
    status: WorkspaceStatus;
    headline: string;
    onTrack: boolean;
    linkedGoalCount: number;
    openDecisionCount: number;
    artifactCount: number;
}
export interface WorkspaceContextRef {
    workspaceId: string;
    title: string;
    type: WorkspaceType;
    objective?: string;
}
//# sourceMappingURL=workspaces.d.ts.map