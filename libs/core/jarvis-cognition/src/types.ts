import type { AIGateway, CallContext, ChatMessage } from '@bellasos/contracts';

export type JarvisQueryKind = 'lookup' | 'advisory' | 'write' | 'navigate' | 'chat';

export type JarvisHandlerType =
  | 'gather_and_synthesize'
  | 'capability_read'
  | 'capability_write'
  | 'open_app'
  | 'clarify'
  | 'agent_write';

export interface JarvisContextFetch {
  capabilityId: string;
  label: string;
  required: boolean;
}

export interface JarvisExecutionPlan {
  objective: string;
  queryKind: JarvisQueryKind;
  handler: {
    type: JarvisHandlerType;
    capabilityId?: string;
    agentType?: string;
    openApp?: string;
  };
  contextFetches: JarvisContextFetch[];
  parsedUserInputs: Record<string, unknown>;
  missingUserInputs: string[];
  clarifyingQuestions: string[];
  synthesisGuide: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  localModelHint: 'coding' | 'general' | 'vision';
}

export interface ContextBundleEntry {
  capabilityId: string;
  label: string;
  data: unknown;
  error?: string;
}

export interface ContextBundle {
  entries: ContextBundleEntry[];
  fetchedAt: string;
}

export interface PendingExecution {
  plan: JarvisExecutionPlan;
  gatheredContext: ContextBundle;
  parsedInputs: Record<string, unknown>;
  missingInputs: string[];
  startedAt: string;
}

export interface CognitionPlatform {
  ai: AIGateway;
  registry: {
    dispatch: (
      moduleId: string,
      action: string,
      input: unknown,
      ctx: CallContext,
    ) => Promise<unknown>;
  };
  orchestrator?: {
    command: (input: {
      agentType: string;
      prompt: string;
      input: Record<string, unknown>;
      traceId: string;
      actorId: string;
    }) => Promise<unknown>;
  };
  config?: {
    getProviderCredential: (provider: string) => Promise<string | undefined>;
  };
}

export interface CognitionTurnInput {
  message: string;
  traceId: string;
  actorId: string;
  ctx: CallContext;
  historyBlock?: string;
  contextBlock?: string;
  systemPrompt: string;
  historyMessages: ChatMessage[];
  userContent: string;
  pending?: PendingExecution | null;
}

export interface CognitionTurnResult {
  handled: true;
  reply: string;
  pending?: PendingExecution | null;
  extra: Record<string, unknown>;
}

export interface CognitionTurnSkipped {
  handled: false;
  reason: 'openai_unavailable' | 'lead_parse_failed' | 'degraded';
}

export type CognitionOutcome = CognitionTurnResult | CognitionTurnSkipped;
