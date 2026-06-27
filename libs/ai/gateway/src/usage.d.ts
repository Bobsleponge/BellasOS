import type { CompletionResponse, EmbeddingResponse } from '@bellasos/contracts';
export interface UsageContext {
    taskType?: string;
    actorId?: string;
    traceId: string;
}
/** Records AI usage to metrics and `ai.usage` (cost + token tracking). */
export declare function recordUsage(response: CompletionResponse | EmbeddingResponse, ctx: UsageContext): Promise<void>;
//# sourceMappingURL=usage.d.ts.map