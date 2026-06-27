import { type AgentResult, type AgentTask, type AgentType } from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';
/**
 * Research Agent: investigates companies/industries, produces a structured
 * report and persists findings. Uses bellasos.research module when available.
 */
export declare class ResearchAgent extends BaseAgent {
    readonly type: AgentType;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
//# sourceMappingURL=research-agent.d.ts.map