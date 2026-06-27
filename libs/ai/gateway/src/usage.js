"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordUsage = recordUsage;
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'ai.usage' });
/** Records AI usage to metrics and `ai.usage` (cost + token tracking). */
async function recordUsage(response, ctx) {
    observability_1.aiRequests.inc({
        provider: response.provider,
        model: response.model,
        task: ctx.taskType ?? 'general',
    });
    observability_1.aiCostUsd.inc({ provider: response.provider, model: response.model }, response.costUsd);
    observability_1.aiLatency.observe({ provider: response.provider, model: response.model }, response.latencyMs);
    if (!(0, db_1.isDbAvailable)())
        return;
    try {
        await (0, db_1.getDb)()
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
    }
    catch (err) {
        log.error('usage persist failed', { error: err.message });
    }
}
//# sourceMappingURL=usage.js.map