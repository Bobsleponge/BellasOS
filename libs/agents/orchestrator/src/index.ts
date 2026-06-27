import {
  BellasError,
  CoreEvents,
  ErrorCode,
  type Agent,
  type AgentInfo,
  type AgentResult,
  type AgentTask,
  type GenericAgentConfig,
  type EventBus,
} from '@bellasos/contracts';
import { createLogger } from '@bellasos/observability';
import { getDb, isDbAvailable } from '@bellasos/db';
import type { RunStore } from '@bellasos/agents-framework';

const log = createLogger({ lib: 'orchestrator' });

export interface OrchestratorDeps {
  events: EventBus;
  runStore: RunStore;
  /** Factory used to materialise dynamic, LLM-driven agents at runtime. */
  createGenericAgent?: (config: GenericAgentConfig) => Agent;
}

export interface CommandInput {
  /** Routing key: a built-in type ("research") or a dynamic agent name. */
  agentType: string;
  /** Natural-language instruction. Preferred over structured input. */
  prompt?: string;
  taskType?: string;
  input?: Record<string, unknown>;
  traceId?: string;
  actorId?: string;
}

/**
 * The Orchestrator coordinates agents. It owns the agent registry (built-in and
 * dynamic), turns commands into tasks, dispatches them, and listens for
 * `agent.task.assigned` events. No agent controls another; coordination flows
 * exclusively through the orchestrator and the event bus.
 */
export class Orchestrator {
  private readonly agents = new Map<string, Agent>();
  private readonly dynamic = new Map<string, GenericAgentConfig>();

  constructor(private readonly deps: OrchestratorDeps) {}

  register(agent: Agent): void {
    this.agents.set(agent.name, agent);
    log.info('agent registered', { name: agent.name, type: agent.type });
  }

  /** Subscribe to task-assignment events for event-driven execution. */
  async start(): Promise<void> {
    await this.deps.events.subscribe<CommandInput>(
      CoreEvents.AgentTaskAssigned,
      async (event) => {
        try {
          await this.command(event.payload);
        } catch (err) {
          log.error('event-driven command failed', {
            error: (err as Error).message,
          });
        }
      },
      { queueGroup: 'orchestrator' },
    );
    log.info('orchestrator listening for task assignments');
  }

  /**
   * Create a dynamic LLM-driven agent at runtime and (best-effort) persist it,
   * so "create an agent and talk to it" needs no code change or restart.
   */
  async createAgent(config: GenericAgentConfig): Promise<AgentInfo> {
    if (!this.deps.createGenericAgent) {
      throw new BellasError(
        ErrorCode.Internal,
        'Dynamic agents are not enabled in this runtime',
      );
    }
    const name = config.name.trim();
    if (!name) {
      throw new BellasError(ErrorCode.ValidationFailed, 'Agent name is required');
    }
    if (this.agents.has(name)) {
      throw new BellasError(
        ErrorCode.Conflict,
        `An agent named "${name}" already exists`,
      );
    }
    const normalized: GenericAgentConfig = { ...config, name };
    const agent = this.deps.createGenericAgent(normalized);
    this.register(agent);
    this.dynamic.set(name, normalized);

    if (isDbAvailable()) {
      try {
        await getDb()
          .insertInto('agents.agents')
          .values({
            id: name,
            type: 'generic',
            status: 'enabled',
            config: normalized as unknown as Record<string, unknown>,
          })
          .onConflict((oc) =>
            oc.column('id').doUpdateSet({
              config: normalized as unknown as Record<string, unknown>,
            }),
          )
          .execute();
      } catch (err) {
        log.warn('agent persist failed (kept in memory)', {
          error: (err as Error).message,
        });
      }
    }
    return this.infoFor(agent);
  }

  /** Remove a dynamic agent. Built-in agents cannot be removed. */
  async removeAgent(name: string): Promise<boolean> {
    if (!this.dynamic.has(name)) return false;
    this.agents.delete(name);
    this.dynamic.delete(name);
    if (isDbAvailable()) {
      try {
        await getDb().deleteFrom('agents.agents').where('id', '=', name).execute();
      } catch (err) {
        log.warn('agent delete failed', { error: (err as Error).message });
      }
    }
    return true;
  }

  /** Recreate dynamic agents persisted from a previous run. */
  async loadPersisted(): Promise<void> {
    if (!isDbAvailable() || !this.deps.createGenericAgent) return;
    try {
      const rows = await getDb()
        .selectFrom('agents.agents')
        .selectAll()
        .where('type', '=', 'generic')
        .execute();
      for (const row of rows) {
        const config = row.config as unknown as GenericAgentConfig | null;
        if (!config?.name || this.agents.has(config.name)) continue;
        this.register(this.deps.createGenericAgent(config));
        this.dynamic.set(config.name, config);
      }
      if (rows.length) {
        log.info('loaded persisted dynamic agents', { count: rows.length });
      }
    } catch (err) {
      log.warn('loadPersisted failed', { error: (err as Error).message });
    }
  }

  async command(input: CommandInput): Promise<AgentResult> {
    const agent = this.agents.get(input.agentType);
    if (!agent) {
      throw new BellasError(
        ErrorCode.NotFound,
        `No agent registered for "${input.agentType}"`,
      );
    }
    const task: AgentTask = {
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
  async assign(input: CommandInput): Promise<void> {
    await this.deps.events.publish(CoreEvents.AgentTaskAssigned, input, {
      traceId: input.traceId,
      actorId: input.actorId,
    });
  }

  listAgents(): string[] {
    return [...this.agents.keys()];
  }

  agentInfos(): AgentInfo[] {
    return [...this.agents.values()].map((a) => this.infoFor(a));
  }

  private infoFor(agent: Agent): AgentInfo {
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
