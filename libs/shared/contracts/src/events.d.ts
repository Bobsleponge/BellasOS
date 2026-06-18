import { z } from 'zod';
/**
 * Canonical event subject format: `bellasos.<domain>.<entity>.<action>`.
 * The short `type` (e.g. `research.completed`) is the developer-facing name.
 */
export declare const SUBJECT_PREFIX = "bellasos";
export declare function subjectFor(type: string): string;
/** Versioned, validated envelope wrapping every event on the bus. */
export interface EventEnvelope<T = unknown> {
    id: string;
    type: string;
    version: number;
    source: string;
    traceId: string;
    actorId?: string;
    occurredAt: string;
    payload: T;
}
export declare const eventEnvelopeSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    version: z.ZodNumber;
    source: z.ZodString;
    traceId: z.ZodString;
    actorId: z.ZodOptional<z.ZodString>;
    occurredAt: z.ZodString;
    payload: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    version: number;
    source: string;
    traceId: string;
    occurredAt: string;
    actorId?: string | undefined;
    payload?: unknown;
}, {
    type: string;
    id: string;
    version: number;
    source: string;
    traceId: string;
    occurredAt: string;
    actorId?: string | undefined;
    payload?: unknown;
}>;
export type EventHandler<T = unknown> = (event: EventEnvelope<T>) => void | Promise<void>;
export interface Subscription {
    readonly type: string;
    unsubscribe(): Promise<void>;
}
/**
 * Transport-agnostic event bus. Implemented by a NATS JetStream adapter with an
 * in-process fallback so the platform boots without external infrastructure.
 */
export interface EventBus {
    publish<T>(type: string, payload: T, options?: {
        traceId?: string;
        actorId?: string;
        version?: number;
    }): Promise<void>;
    subscribe<T>(type: string, handler: EventHandler<T>, options?: {
        queueGroup?: string;
    }): Promise<Subscription>;
}
/**
 * Declarative description of an event a module/agent publishes or consumes.
 * Used to build the platform's event catalog and to run contract tests.
 */
export interface EventSpec {
    type: string;
    direction: 'publish' | 'subscribe';
    version: number;
    description: string;
    /** Optional zod schema for the payload, enabling validation + catalog docs. */
    schema?: z.ZodTypeAny;
}
/** Well-known platform events (extended by modules/agents). */
export declare const CoreEvents: {
    readonly ModuleInstalled: "module.installed";
    readonly ModuleEnabled: "module.enabled";
    readonly ModuleDisabled: "module.disabled";
    readonly ModuleUninstalled: "module.uninstalled";
    readonly UserSpeaking: "user.speaking";
    readonly VoiceCommand: "voice.command";
    readonly ResearchCompleted: "research.completed";
    readonly PortfolioUpdated: "portfolio.updated";
    readonly CameraMotionDetected: "camera.motion_detected";
    readonly SocialPostCreated: "social.post_created";
    readonly AgentReportGenerated: "agent.report_generated";
    readonly AgentTaskAssigned: "agent.task.assigned";
    readonly ApprovalRequested: "approval.requested";
    readonly ApprovalResolved: "approval.resolved";
    readonly NotificationCreated: "notification.created";
};
//# sourceMappingURL=events.d.ts.map