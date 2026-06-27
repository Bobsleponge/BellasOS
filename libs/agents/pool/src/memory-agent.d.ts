import type { AgentResult, AgentTask, AgentType } from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';
/**
 * Memory Agent: the platform's librarian. Handles remember / recall / summarize
 * tasks on behalf of other agents and the user.
 */
export declare class MemoryAgent extends BaseAgent {
    readonly type: AgentType;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
//# sourceMappingURL=memory-agent.d.ts.map