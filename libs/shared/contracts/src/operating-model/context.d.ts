/**
 * BellasOS context stack - active frame for Jarvis intent resolution.
 */
import type { DomainId } from './domains';
import type { EntityRef } from './entities';
import type { WorkspaceContextRef } from './workspaces';
export declare const CONTEXT_LAYERS: readonly ["session", "focus", "domain", "venture", "temporal", "modality", "location", "attention"];
export type ContextLayer = (typeof CONTEXT_LAYERS)[number];
export type OperatingMode = 'general' | 'personal' | 'business' | 'wealth' | 'research' | 'focus' | 'operator';
export type Modality = 'voice' | 'text' | 'gesture' | 'automation' | 'application';
export interface SessionContext {
    sessionId: string;
    threadSummary?: string;
}
export interface FocusContext {
    entity?: EntityRef;
    pinned: boolean;
    lastActiveAt: string;
}
export interface DomainContext {
    primary: DomainId;
    secondary: DomainId[];
}
export interface VentureContext {
    organizationIds: string[];
}
export interface TemporalContext {
    phase: 'morning' | 'day' | 'evening' | 'night';
    urgency?: 'low' | 'normal' | 'high';
    deadlineAt?: string;
}
export interface AttentionContext {
    pendingApprovals: number;
    activeAlerts: number;
    openThreads: number;
    prioritySummary?: string;
}
export interface ContextStack {
    session: SessionContext;
    focus?: FocusContext;
    domain: DomainContext;
    venture?: VentureContext;
    temporal: TemporalContext;
    modality: Modality;
    location?: string;
    attention: AttentionContext;
    operatingMode: OperatingMode;
    workspace?: WorkspaceContextRef;
}
export declare const CONTEXT_SWITCHING_RULES: readonly ["Explicit signals override implicit signals.", "Entity mention promotes focus context.", "Context focus decays after inactivity unless pinned.", "Jarvis must be able to explain active context on request.", "Multi-venture context is allowed for comparison queries."];
export declare const CONTEXT_SIGNALS: {
    readonly explicit: readonly ["user domain switch statements", "application focus", "entity reference in conversation"];
    readonly implicit: readonly ["time of day", "recent agent runs", "pending approvals and alerts", "last accessed venture or project", "active automation state"];
    readonly persistent: readonly ["identity preferences", "relationship context", "active goal hierarchy"];
};
//# sourceMappingURL=context.d.ts.map