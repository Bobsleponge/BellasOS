import {
  type Agent,
  type AgentResult,
  type AgentRun,
  type AgentTask,
  type AgentType,
  type AIGateway,
  type EventBus,
  type Logger,
  type MemoryGateway,
} from '@bellasos/contracts';
import { RunStore } from './run-store';
import type { ModuleGateway } from './module-gateway';

export interface AgentDeps {
  ai: AIGateway;
  memory: MemoryGateway;
  events: EventBus;
  logger: Logger;
  runStore: RunStore;
  /** When set, agents can run module actions for persisted / executable outcomes. */
  modules?: ModuleGateway;
}

/**
 * Base class for all agents. Wraps execution with run tracking, tracing,
 * structured logging and event emission. Subclasses implement `execute`.
 * Agents never call each other directly; they emit events the orchestrator
 * routes.
 */
export abstract class BaseAgent implements Agent {
  abstract readonly type: AgentType;
  readonly id: string;

  constructor(protected readonly deps: AgentDeps) {
    this.id = `${this.constructor.name}`;
  }

  /** Routing key. Built-ins use their type; dynamic agents override this. */
  get name(): string {
    return this.type;
  }

  protected abstract execute(task: AgentTask): Promise<AgentResult>;

  async handle(task: AgentTask): Promise<AgentResult> {
    const run: AgentRun = {
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
    } catch (err) {
      run.status = 'failed';
      run.error = (err as Error).message;
      run.finishedAt = new Date().toISOString();
      await this.deps.runStore.save(run);
      log.error('agent run failed', { error: run.error });
      throw err;
    }
  }
}
