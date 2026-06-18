import type { AgentRun } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';

const log = createLogger({ lib: 'agents.runs' });

/** Persists and lists agent runs (traced executions). */
export class RunStore {
  private readonly recent: AgentRun[] = [];

  async save(run: AgentRun): Promise<void> {
    const idx = this.recent.findIndex((r) => r.id === run.id);
    if (idx >= 0) this.recent[idx] = run;
    else this.recent.push(run);
    if (this.recent.length > 200) this.recent.shift();

    if (!isDbAvailable()) return;
    try {
      await getDb()
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
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            status: run.status,
            output: run.output ?? null,
            error: run.error ?? null,
            finished_at: run.finishedAt ?? null,
          }),
        )
        .execute();
    } catch (err) {
      log.error('run persist failed', { error: (err as Error).message });
    }
  }

  list(limit = 50): AgentRun[] {
    return this.recent.slice(-limit).reverse();
  }
}
