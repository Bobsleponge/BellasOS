import type { AgentResult, AgentTask, AgentType } from '@bellasos/contracts';
import { BaseAgent } from '@bellasos/agents-framework';

/**
 * Memory Agent: the platform's librarian. Handles remember / recall / summarize
 * tasks on behalf of other agents and the user.
 */
export class MemoryAgent extends BaseAgent {
  readonly type: AgentType = 'memory';

  protected async execute(task: AgentTask): Promise<AgentResult> {
    const ownerId = String(task.input.ownerId ?? task.actorId ?? 'system');
    switch (task.type) {
      case 'remember': {
        const item = await this.deps.memory.remember({
          tier: (task.input.tier as 'long') ?? 'long',
          ownerId,
          content: String(task.input.content ?? ''),
          tags: (task.input.tags as string[]) ?? [],
        });
        return { output: { id: item.id } };
      }
      case 'recall': {
        const hits = await this.deps.memory.recall({
          ownerId,
          query: String(task.input.query ?? ''),
          tier: (task.input.tier as 'long') ?? 'long',
          limit: Number(task.input.limit ?? 8),
        });
        return { output: { hits } };
      }
      case 'summarize': {
        const summary = await this.deps.memory.summarize(
          ownerId,
          (task.input.tier as 'long') ?? 'long',
        );
        return { output: { summary } };
      }
      default: {
        // Natural-language fallback: treat the prompt as a recall query.
        const query = String(task.input.prompt ?? task.input.query ?? '').trim();
        if (!query) {
          return { output: { error: `unknown memory task: ${task.type}` } };
        }
        const hits = await this.deps.memory.recall({
          ownerId,
          query,
          tier: 'long',
          limit: Number(task.input.limit ?? 8),
        });
        return { output: { query, hits } };
      }
    }
  }
}
