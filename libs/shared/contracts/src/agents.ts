export type AgentType =
  | 'research'
  | 'intelligence'
  | 'portfolio'
  | 'automation'
  | 'social'
  | 'coding'
  | 'operations'
  | 'memory'
  | 'orchestrator';

export type RunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentTask {
  id: string;
  type: string;
  input: Record<string, unknown>;
  /** Correlates all agent activity for one user request. */
  traceId: string;
  actorId?: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentType: AgentType;
  taskId: string;
  status: RunStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  traceId: string;
  startedAt: string;
  finishedAt?: string;
}

export interface AgentResult {
  output: Record<string, unknown>;
  /** Events the agent wants the orchestrator to publish on its behalf. */
  emit?: Array<{ type: string; payload: unknown }>;
}

/**
 * An agent is an autonomous unit that consumes a task and produces a result.
 * Agents communicate only through the event bus + their result; none controls
 * another directly. The orchestrator coordinates them.
 */
export interface Agent {
  readonly type: AgentType;
  readonly id: string;
  /** Unique routing key. For built-ins this equals `type`; dynamic agents use their custom name. */
  readonly name: string;
  handle(task: AgentTask): Promise<AgentResult>;
}

/**
 * Configuration for a dynamic, LLM-driven agent created at runtime. The `role`
 * is used as the system prompt, so plain-language descriptions define behaviour
 * without any code changes.
 */
export interface GenericAgentConfig {
  name: string;
  role: string;
  taskType?: string;
}

/** Lightweight agent descriptor surfaced to management UIs. */
export interface AgentInfo {
  name: string;
  type: AgentType;
  dynamic: boolean;
  role?: string;
}
