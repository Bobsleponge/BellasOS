"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const contracts_1 = require("@bellasos/contracts");
const ai_model_registry_1 = require("@bellasos/ai-model-registry");
const util_1 = require("./util");
const credentials_1 = require("./credentials");
/** Adapter for Anthropic's Messages API. */
class AnthropicProvider {
    type = 'anthropic';
    isConfigured() {
        return (0, credentials_1.isProviderConfiguredSync)('anthropic');
    }
    listModels() {
        return ai_model_registry_1.DEFAULT_MODELS.filter((m) => m.provider === 'anthropic');
    }
    async complete(request, model) {
        const start = Date.now();
        const system = request.messages
            .filter((m) => m.role === 'system')
            .map((m) => m.content)
            .join('\n');
        const messages = request.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content }));
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': (0, credentials_1.resolveCredentialSync)('anthropic') ?? '',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: model.id,
                system: system || undefined,
                messages,
                max_tokens: request.maxTokens ?? 1024,
                temperature: request.temperature ?? 0.7,
            }),
        });
        if (!res.ok) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `anthropic completion failed: ${res.status}`);
        }
        const json = (await res.json());
        const usage = {
            promptTokens: json.usage.input_tokens,
            completionTokens: json.usage.output_tokens,
            totalTokens: json.usage.input_tokens + json.usage.output_tokens,
        };
        return {
            text: json.content.map((c) => c.text).join(''),
            model: model.id,
            provider: 'anthropic',
            usage,
            costUsd: (0, util_1.computeCost)(model, usage),
            latencyMs: Date.now() - start,
            finishReason: json.stop_reason,
        };
    }
}
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=anthropic.js.map