import { type Agent, type AgentResult, type AgentTask, type AgentType, type AIGateway, type EventBus, type Logger, type MemoryGateway } from '@bellasos/contracts';
import { RunStore } from './run-store';
import type { ModuleGateway } from './module-gateway';
export interface AgentDeps {
    ai: AIGateway;
    memory: MemoryGateway;
    events: EventBus;
    logger: Logger;
    runStore: RunStore;
    /** When set, agents can run module actions for persisted / executable outcomes. */
    modules?: ModuleGateway;
}
/**
 * Base class for all agents. Wraps execution with run tracking, tracing,
 * structured logging and event emission. Subclasses implement `execute`.
 * Agents never call each other directly; they emit events the orchestrator
 * routes.
 */
export declare abstract class BaseAgent implements Agent {
    protected readonly deps: AgentDeps;
    abstract readonly type: AgentType;
    readonly id: string;
    constructor(deps: AgentDeps);
    /** Routing key. Built-ins use their type; dynamic agents override this. */
    get name(): string;
    protected abstract execute(task: AgentTask): Promise<AgentResult>;
    handle(task: AgentTask): Promise<AgentResult>;
}
//# sourceMappingURL=base-agent.d.ts.map