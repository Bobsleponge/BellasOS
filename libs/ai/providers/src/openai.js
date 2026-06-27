"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleProvider = void 0;
exports.createOpenAIProvider = createOpenAIProvider;
exports.createDeepSeekProvider = createDeepSeekProvider;
const contracts_1 = require("@bellasos/contracts");
const ai_model_registry_1 = require("@bellasos/ai-model-registry");
const util_1 = require("./util");
const credentials_1 = require("./credentials");
/**
 * Adapter for OpenAI-compatible Chat Completions APIs. DeepSeek reuses this with
 * a different base URL + provider tag, since its API is OpenAI-compatible.
 */
class OpenAICompatibleProvider {
    type;
    opts;
    constructor(type, opts) {
        this.type = type;
        this.opts = opts;
    }
    isConfigured() {
        return (0, credentials_1.isProviderConfiguredSync)(this.type);
    }
    listModels() {
        return ai_model_registry_1.DEFAULT_MODELS.filter((m) => m.provider === this.type);
    }
    headers() {
        return {
            'content-type': 'application/json',
            authorization: `Bearer ${(0, credentials_1.resolveCredentialSync)(this.type) ?? ''}`,
        };
    }
    async complete(request, model) {
        const start = Date.now();
        const res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                model: model.id,
                messages: request.messages,
                temperature: request.temperature ?? 0.7,
                max_tokens: request.maxTokens,
            }),
        });
        if (!res.ok) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `${this.type} completion failed: ${res.status}`);
        }
        const json = (await res.json());
        const usage = json.usage
            ? {
                promptTokens: json.usage.prompt_tokens,
                completionTokens: json.usage.completion_tokens,
                totalTokens: json.usage.total_tokens,
            }
            : (0, util_1.emptyUsage)();
        return {
            text: json.choices[0]?.message.content ?? '',
            model: model.id,
            provider: this.type,
            usage,
            costUsd: (0, util_1.computeCost)(model, usage),
            latencyMs: Date.now() - start,
            finishReason: json.choices[0]?.finish_reason,
        };
    }
    async embed(request, model) {
        const start = Date.now();
        const res = await fetch(`${this.opts.baseUrl}/embeddings`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({ model: model.id, input: request.input }),
        });
        if (!res.ok) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `${this.type} embedding failed: ${res.status}`);
        }
        const json = (await res.json());
        const usage = {
            promptTokens: json.usage?.prompt_tokens ?? 0,
            completionTokens: 0,
            totalTokens: json.usage?.total_tokens ?? 0,
        };
        return {
            vectors: json.data.map((d) => d.embedding),
            model: model.id,
            provider: this.type,
            usage,
            costUsd: (0, util_1.computeCost)(model, usage),
            latencyMs: Date.now() - start,
        };
    }
}
exports.OpenAICompatibleProvider = OpenAICompatibleProvider;
function createOpenAIProvider() {
    return new OpenAICompatibleProvider('openai', {
        apiKeyEnv: 'OPENAI_API_KEY',
        baseUrl: 'https://api.openai.com/v1',
    });
}
function createDeepSeekProvider() {
    return new OpenAICompatibleProvider('deepseek', {
        apiKeyEnv: 'DEEPSEEK_API_KEY',
        baseUrl: 'https://api.deepseek.com/v1',
    });
}
//# sourceMappingURL=openai.js.map