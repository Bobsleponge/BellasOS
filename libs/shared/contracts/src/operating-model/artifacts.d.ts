/**
 * First-class artifacts produced during workspace execution.
 */
import type { ResourceRef } from './entities';
export declare const ARTIFACT_KINDS: readonly ["research_report", "investment_thesis", "decision_record", "meeting_notes", "plan", "strategy", "coding_project", "document"];
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];
export interface Artifact {
    id: string;
    kind: ArtifactKind;
    title: string;
    summary?: string;
    contentRef?: ResourceRef;
    workspaceIds: string[];
    goalIds: string[];
    initiativeIds: string[];
    decisionIds: string[];
    applicationIds: string[];
    memoryId?: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=artifacts.d.ts.map