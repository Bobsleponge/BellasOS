"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunStore = void 0;
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'agents.runs' });
/** Persists and lists agent runs (traced executions). */
class RunStore {
    recent = [];
    async save(run) {
        const idx = this.recent.findIndex((r) => r.id === run.id);
        if (idx >= 0)
            this.recent[idx] = run;
        else
            this.recent.push(run);
        if (this.recent.length > 200)
            this.recent.shift();
        if (!(0, db_1.isDbAvailable)())
            return;
        try {
            await (0, db_1.getDb)()
                .insertInto('agents.runs')
                .values({
                id: run.id,
                agent_id: run.agentId,
                agent_type: run.agentType,
                task_id: run.taskId,
                status: run.status,
                input: run.input,
                output: run.output ?? null,
                error: run.error ?? null,
                trace_id: run.traceId,
                finished_at: run.finishedAt ?? null,
            })
                .onConflict((oc) => oc.column('id').doUpdateSet({
                status: run.status,
                output: run.output ?? null,
                error: run.error ?? null,
                finished_at: run.finishedAt ?? null,
            }))
                .execute();
        }
        catch (err) {
            log.error('run persist failed', { error: err.message });
        }
    }
    list(limit = 50) {
        return this.recent.slice(-limit).reverse();
    }
}
exports.RunStore = RunStore;
//# sourceMappingURL=run-store.js.map