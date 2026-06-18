import type {
  CompletionResponse,
  EmbeddingResponse,
} from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import {
  aiCostUsd,
  aiLatency,
  aiRequests,
  createLogger,
} from '@bellasos/observability';

const log = createLogger({ lib: 'ai.usage' });

export interface UsageContext {
  taskType?: string;
  actorId?: string;
  traceId: string;
}

/** Records AI usage to metrics and `ai.usage` (cost + token tracking). */
export async function recordUsage(
  response: CompletionResponse | EmbeddingResponse,
  ctx: UsageContext,
): Promise<void> {
  aiRequests.inc({
    provider: response.provider,
    model: response.model,
    task: ctx.taskType ?? 'general',
  });
  aiCostUsd.inc({ provider: response.provider, model: response.model }, response.costUsd);
  aiLatency.observe(
    { provider: response.provider, model: response.model },
    response.latencyMs,
  );

  if (!isDbAvailable()) return;
  try {
    await getDb()
      .insertInto('ai.usage')
      .values({
        provider: response.provider,
        model: response.model,
        task_type: ctx.taskType ?? 'general',
        prompt_tokens: response.usage.promptTokens,
        completion_tokens: response.usage.completionTokens,
        total_tokens: response.usage.totalTokens,
        cost_usd: response.costUsd,
        latency_ms: response.latencyMs,
        actor_id: ctx.actorId ?? null,
        trace_id: ctx.traceId,
      })
      .execute();
  } catch (err) {
    log.error('usage persist failed', { error: (err as Error).message });
  }
}
