import { type AgentResult, type AgentTask, type AgentType } from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';
/**
 * Intelligence Agent: sector briefings and trend analysis.
 * Uses bellasos.intelligence module when available.
 */
export declare class IntelligenceAgent extends BaseAgent {
    readonly type: AgentType;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
//# sourceMappingURL=intelligence-agent.d.ts.map