"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockProvider = void 0;
const ai_model_registry_1 = require("@bellasos/ai-model-registry");
const util_1 = require("./util");
const DIMS = 1536;
/**
 * Offline provider used as a guaranteed fallback so the platform always has a
 * working AI path without any API keys. Produces deterministic pseudo-output.
 */
class MockProvider {
    type = 'mock';
    isConfigured() {
        return true;
    }
    listModels() {
        return ai_model_registry_1.DEFAULT_MODELS.filter((m) => m.provider === 'mock');
    }
    async complete(request, model) {
        const start = Date.now();
        const prompt = request.messages.map((m) => m.content).join('\n');
        const text = `[mock:${model.id}] Acknowledged ${request.messages.length} message(s). ` +
            `Task=${request.taskType ?? 'general'}. ` +
            `This is offline placeholder output for: "${prompt.slice(0, 120)}".`;
        const usage = {
            promptTokens: (0, util_1.estimateTokens)(prompt),
            completionTokens: (0, util_1.estimateTokens)(text),
            totalTokens: (0, util_1.estimateTokens)(prompt) + (0, util_1.estimateTokens)(text),
        };
        return {
            text,
            model: model.id,
            provider: 'mock',
            usage,
            costUsd: (0, util_1.computeCost)(model, usage),
            latencyMs: Date.now() - start,
            finishReason: 'stop',
        };
    }
    async embed(request, model) {
        const start = Date.now();
        const inputs = Array.isArray(request.input)
            ? request.input
            : [request.input];
        const vectors = inputs.map((text) => this.hashVector(text));
        const tokens = inputs.reduce((n, t) => n + (0, util_1.estimateTokens)(t), 0);
        return {
            vectors,
            model: model.id,
            provider: 'mock',
            usage: { promptTokens: tokens, completionTokens: 0, totalTokens: tokens },
            costUsd: 0,
            latencyMs: Date.now() - start,
        };
    }
    /** Deterministic, normalized pseudo-embedding from a string hash. */
    hashVector(text) {
        const vec = new Array(DIMS).fill(0);
        for (let i = 0; i < text.length; i++) {
            const idx = i % DIMS;
            vec[idx] = (vec[idx] ?? 0) + text.charCodeAt(i);
        }
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
        return vec.map((v) => v / norm);
    }
}
exports.MockProvider = MockProvider;
//# sourceMappingURL=mock.js.map