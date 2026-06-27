import { type Agent, type AgentInfo, type AgentResult, type GenericAgentConfig, type EventBus } from '@bellasos/contracts';
import type { RunStore } from '@bellasos/agents-framework';
export interface OrchestratorDeps {
    events: EventBus;
    runStore: RunStore;
    /** Factory used to materialise dynamic, LLM-driven agents at runtime. */
    createGenericAgent?: (config: GenericAgentConfig) => Agent;
}
export interface CommandInput {
    /** Routing key: a built-in type ("research") or a dynamic agent name. */
    agentType: string;
    /** Natural-language instruction. Preferred over structured input. */
    prompt?: string;
    taskType?: string;
    input?: Record<string, unknown>;
    traceId?: string;
    actorId?: string;
}
/**
 * The Orchestrator coordinates agents. It owns the agent registry (built-in and
 * dynamic), turns commands into tasks, dispatches them, and listens for
 * `agent.task.assigned` events. No agent controls another; coordination flows
 * exclusively through the orchestrator and the event bus.
 */
export declare class Orchestrator {
    private readonly deps;
    private readonly agents;
    private readonly dynamic;
    constructor(deps: OrchestratorDeps);
    register(agent: Agent): void;
    /** Subscribe to task-assignment events for event-driven execution. */
    start(): Promise<void>;
    /**
     * Create a dynamic LLM-driven agent at runtime and (best-effort) persist it,
     * so "create an agent and talk to it" needs no code change or restart.
     */
    createAgent(config: GenericAgentConfig): Promise<AgentInfo>;
    /** Remove a dynamic agent. Built-in agents cannot be removed. */
    removeAgent(name: string): Promise<boolean>;
    /** Recreate dynamic agents persisted from a previous run. */
    loadPersisted(): Promise<void>;
    command(input: CommandInput): Promise<AgentResult>;
    /** Assign a task asynchronously by publishing an event the orchestrator consumes. */
    assign(input: CommandInput): Promise<void>;
    listAgents(): string[];
    agentInfos(): AgentInfo[];
    private infoFor;
    recentRuns(limit?: number): import("@bellasos/contracts").AgentRun[];
}
//# sourceMappingURL=index.d.ts.map