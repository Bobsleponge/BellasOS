import { z } from 'zod';

/**
 * Canonical event subject format: `bellasos.<domain>.<entity>.<action>`.
 * The short `type` (e.g. `research.completed`) is the developer-facing name.
 */
export const SUBJECT_PREFIX = 'bellasos';

export function subjectFor(type: string): string {
  return `${SUBJECT_PREFIX}.${type.split('.').join('.')}`;
}

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

export const eventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  version: z.number().int().positive(),
  source: z.string().min(1),
  traceId: z.string().min(1),
  actorId: z.string().optional(),
  occurredAt: z.string().datetime(),
  payload: z.unknown(),
});

export type EventHandler<T = unknown> = (
  event: EventEnvelope<T>,
) => void | Promise<void>;

export interface Subscription {
  readonly type: string;
  unsubscribe(): Promise<void>;
}

/**
 * Transport-agnostic event bus. Implemented by a NATS JetStream adapter with an
 * in-process fallback so the platform boots without external infrastructure.
 */
export interface EventBus {
  publish<T>(
    type: string,
    payload: T,
    options?: { traceId?: string; actorId?: string; version?: number },
  ): Promise<void>;
  subscribe<T>(
    type: string,
    handler: EventHandler<T>,
    options?: { queueGroup?: string },
  ): Promise<Subscription>;
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
export const CoreEvents = {
  ModuleInstalled: 'module.installed',
  ModuleEnabled: 'module.enabled',
  ModuleDisabled: 'module.disabled',
  ModuleUninstalled: 'module.uninstalled',
  UserSpeaking: 'user.speaking',
  VoiceCommand: 'voice.command',
  ResearchCompleted: 'research.completed',
  PortfolioUpdated: 'portfolio.updated',
  CameraMotionDetected: 'camera.motion_detected',
  SocialPostCreated: 'social.post_created',
  AgentReportGenerated: 'agent.report_generated',
  AgentTaskAssigned: 'agent.task.assigned',
  ApprovalRequested: 'approval.requested',
  ApprovalResolved: 'approval.resolved',
  NotificationCreated: 'notification.created',
} as const;
