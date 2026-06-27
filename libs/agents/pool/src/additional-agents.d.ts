import type { AgentResult, AgentTask, AgentType } from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';
export declare class CodingAgent extends BaseAgent {
    readonly type: AgentType;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
export declare class PortfolioAgent extends BaseAgent {
    readonly type: AgentType;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
export declare class FinanceAgent extends BaseAgent {
    readonly type: AgentType;
    private finance;
    private planFinanceAction;
    private writeFromPrompt;
    private resolveSymbolLive;
    private writeInvestmentFromPrompt;
    private formatClarification;
    private isWriteAction;
    private hasInvestmentCoreInput;
    private shouldClarifyInvestment;
    private answerWithLiveMath;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
export declare class AutomationAgent extends BaseAgent {
    readonly type: AgentType;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
export declare class SocialAgent extends BaseAgent {
    readonly type: AgentType;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
export declare class OperationsAgent extends BaseAgent {
    readonly type: AgentType;
    protected execute(task: AgentTask): Promise<AgentResult>;
}
//# sourceMappingURL=additional-agents.d.ts.map