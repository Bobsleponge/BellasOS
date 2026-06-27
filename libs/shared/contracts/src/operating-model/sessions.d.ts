/**
 * Focus sessions - what the user is working on right now.
 * Distinct from Jarvis chat sessions (jarvis.sessions).
 */
import type { EntityRef } from './entities';
export declare const FOCUS_KINDS: readonly ["research", "project", "decision", "analysis", "planning", "general"];
export type FocusKind = (typeof FOCUS_KINDS)[number];
export declare const FOCUS_SESSION_STATUSES: readonly ["active", "paused", "ended"];
export type FocusSessionStatus = (typeof FOCUS_SESSION_STATUSES)[number];
export interface FocusSession {
    id: string;
    workspaceId?: string;
    focusKind: FocusKind;
    focusEntity?: EntityRef;
    jarvisSessionId?: string;
    applicationId?: string;
    status: FocusSessionStatus;
    summary?: string;
    ownerId: string;
    startedAt: string;
    endedAt?: string;
}
//# sourceMappingURL=sessions.d.ts.map