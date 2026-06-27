import { type AgentResult, type AgentTask, type AgentType, type GenericAgentConfig } from '@bellasos/contracts';
import { BaseAgent, type AgentDeps } from '@bellasos/agents-framework';
/**
 * A dynamic, LLM-driven agent. Created at runtime from a plain-language role
 * description (no code changes, no restart). It interprets a natural-language
 * instruction with the AI gateway, grounded in long-term memory, and persists
 * what it learns. This is what powers "create an agent and just talk to it".
 */
export declare class GenericAgent extends BaseAgent {
    readonly type: AgentType;
    private readonly _name;
    private readonly role;
    private readonly taskType;
    constructor(deps: AgentDeps, config: GenericAgentConfig);
    get name(): string;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
//# sourceMappingURL=generic-agent.d.ts.map