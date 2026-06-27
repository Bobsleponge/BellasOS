import type { AgentTask, CallContext } from '@bellasos/contracts';
/** Lets agents invoke module actions for end-to-end execution (save, preview, devices, etc.). */
export interface ModuleGateway {
    invoke(moduleId: string, action: string, input: unknown, task: AgentTask): Promise<unknown>;
}
export type ModuleGatewayFactory = (task: AgentTask) => CallContext;
//# sourceMappingURL=module-gateway.d.ts.map