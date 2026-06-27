"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
/**
 * Base class for all agents. Wraps execution with run tracking, tracing,
 * structured logging and event emission. Subclasses implement `execute`.
 * Agents never call each other directly; they emit events the orchestrator
 * routes.
 */
class BaseAgent {
    deps;
    id;
    constructor(deps) {
        this.deps = deps;
        this.id = `${this.constructor.name}`;
    }
    /** Routing key. Built-ins use their type; dynamic agents override this. */
    get name() {
        return this.type;
    }
    async handle(task) {
        const run = {
            id: crypto.randomUUID(),
            agentId: this.id,
            agentType: this.type,
            taskId: task.id,
            status: 'running',
            input: task.input,
            traceId: task.traceId,
            startedAt: new Date().toISOString(),
        };
        await this.deps.runStore.save(run);
        const log = this.deps.logger.child({
            agent: this.type,
            traceId: task.traceId,
        });
        log.info('agent run started', { task: task.type });
        try {
            const result = await this.execute(task);
            run.status = 'completed';
            run.output = result.output;
            run.finishedAt = new Date().toISOString();
            await this.deps.runStore.save(run);
            for (const e of result.emit ?? []) {
                await this.deps.events.publish(e.type, e.payload, {
                    traceId: task.traceId,
                    actorId: task.actorId,
                });
            }
            log.info('agent run completed');
            return result;
        }
        catch (err) {
            run.status = 'failed';
            run.error = err.message;
            run.finishedAt = new Date().toISOString();
            await this.deps.runStore.save(run);
            log.error('agent run failed', { error: run.error });
            throw err;
        }
    }
}
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=base-agent.js.map