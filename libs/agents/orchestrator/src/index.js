"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const contracts_1 = require("@bellasos/contracts");
const observability_1 = require("@bellasos/observability");
const db_1 = require("@bellasos/db");
const log = (0, observability_1.createLogger)({ lib: 'orchestrator' });
/**
 * The Orchestrator coordinates agents. It owns the agent registry (built-in and
 * dynamic), turns commands into tasks, dispatches them, and listens for
 * `agent.task.assigned` events. No agent controls another; coordination flows
 * exclusively through the orchestrator and the event bus.
 */
class Orchestrator {
    deps;
    agents = new Map();
    dynamic = new Map();
    constructor(deps) {
        this.deps = deps;
    }
    register(agent) {
        this.agents.set(agent.name, agent);
        log.info('agent registered', { name: agent.name, type: agent.type });
    }
    /** Subscribe to task-assignment events for event-driven execution. */
    async start() {
        await this.deps.events.subscribe(contracts_1.CoreEvents.AgentTaskAssigned, async (event) => {
            try {
                await this.command(event.payload);
            }
            catch (err) {
                log.error('event-driven command failed', {
                    error: err.message,
                });
            }
        }, { queueGroup: 'orchestrator' });
        log.info('orchestrator listening for task assignments');
    }
    /**
     * Create a dynamic LLM-driven agent at runtime and (best-effort) persist it,
     * so "create an agent and talk to it" needs no code change or restart.
     */
    async createAgent(config) {
        if (!this.deps.createGenericAgent) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.Internal, 'Dynamic agents are not enabled in this runtime');
        }
        const name = config.name.trim();
        if (!name) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ValidationFailed, 'Agent name is required');
        }
        if (this.agents.has(name)) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.Conflict, `An agent named "${name}" already exists`);
        }
        const normalized = { ...config, name };
        const agent = this.deps.createGenericAgent(normalized);
        this.register(agent);
        this.dynamic.set(name, normalized);
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)()
                    .insertInto('agents.agents')
                    .values({
                    id: name,
                    type: 'generic',
                    status: 'enabled',
                    config: normalized,
                })
                    .onConflict((oc) => oc.column('id').doUpdateSet({
                    config: normalized,
                }))
                    .execute();
            }
            catch (err) {
                log.warn('agent persist failed (kept in memory)', {
                    error: err.message,
                });
            }
        }
        return this.infoFor(agent);
    }
    /** Remove a dynamic agent. Built-in agents cannot be removed. */
    async removeAgent(name) {
        if (!this.dynamic.has(name))
            return false;
        this.agents.delete(name);
        this.dynamic.delete(name);
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)().deleteFrom('agents.agents').where('id', '=', name).execute();
            }
            catch (err) {
                log.warn('agent delete failed', { error: err.message });
            }
        }
        return true;
    }
    /** Recreate dynamic agents persisted from a previous run. */
    async loadPersisted() {
        if (!(0, db_1.isDbAvailable)() || !this.deps.createGenericAgent)
            return;
        try {
            const rows = await (0, db_1.getDb)()
                .selectFrom('agents.agents')
                .selectAll()
                .where('type', '=', 'generic')
                .execute();
            for (const row of rows) {
                const config = row.config;
                if (!config?.name || this.agents.has(config.name))
                    continue;
                this.register(this.deps.createGenericAgent(config));
                this.dynamic.set(config.name, config);
            }
            if (rows.length) {
                log.info('loaded persisted dynamic agents', { count: rows.length });
            }
        }
        catch (err) {
            log.warn('loadPersisted failed', { error: err.message });
        }
    }
    async command(input) {
        const agent = this.agents.get(input.agentType);
        if (!agent) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.NotFound, `No agent registered for "${input.agentType}"`);
        }
        const task = {
            id: crypto.randomUUID(),
            type: input.taskType ?? 'task',
            input: {
                ...(input.input ?? {}),
                ...(input.prompt ? { prompt: input.prompt } : {}),
            },
            traceId: input.traceId ?? crypto.randomUUID(),
            actorId: input.actorId,
        };
        return agent.handle(task);
    }
    /** Assign a task asynchronously by publishing an event the orchestrator consumes. */
    async assign(input) {
        await this.deps.events.publish(contracts_1.CoreEvents.AgentTaskAssigned, input, {
            traceId: input.traceId,
            actorId: input.actorId,
        });
    }
    listAgents() {
        return [...this.agents.keys()];
    }
    agentInfos() {
        return [...this.agents.values()].map((a) => this.infoFor(a));
    }
    infoFor(agent) {
        return {
            name: agent.name,
            type: agent.type,
            dynamic: this.dynamic.has(agent.name),
            role: this.dynamic.get(agent.name)?.role,
        };
    }
    recentRuns(limit = 50) {
        return this.deps.runStore.list(limit);
    }
}
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=index.js.map