import type { AgentRun } from '@bellasos/contracts';
/** Persists and lists agent runs (traced executions). */
export declare class RunStore {
    private readonly recent;
    save(run: AgentRun): Promise<void>;
    list(limit?: number): AgentRun[];
}
//# sourceMappingURL=run-store.d.ts.map