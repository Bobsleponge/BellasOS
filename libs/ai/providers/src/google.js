"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleProvider = void 0;
const contracts_1 = require("@bellasos/contracts");
const ai_model_registry_1 = require("@bellasos/ai-model-registry");
const util_1 = require("./util");
const credentials_1 = require("./credentials");
/** Adapter for Google Gemini (generativelanguage) API. */
class GoogleProvider {
    type = 'google';
    isConfigured() {
        return (0, credentials_1.isProviderConfiguredSync)('google');
    }
    listModels() {
        return ai_model_registry_1.DEFAULT_MODELS.filter((m) => m.provider === 'google');
    }
    async complete(request, model) {
        const start = Date.now();
        const key = (0, credentials_1.resolveCredentialSync)('google') ?? '';
        const contents = request.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));
        const system = request.messages.find((m) => m.role === 'system')?.content;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                contents,
                systemInstruction: system
                    ? { parts: [{ text: system }] }
                    : undefined,
                generationConfig: {
                    temperature: request.temperature ?? 0.7,
                    maxOutputTokens: request.maxTokens,
                },
            }),
        });
        if (!res.ok) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `google completion failed: ${res.status}`);
        }
        const json = (await res.json());
        const usage = json.usageMetadata
            ? {
                promptTokens: json.usageMetadata.promptTokenCount,
                completionTokens: json.usageMetadata.candidatesTokenCount,
                totalTokens: json.usageMetadata.totalTokenCount,
            }
            : (0, util_1.emptyUsage)();
        return {
            text: json.candidates[0]?.content.parts.map((p) => p.text).join('') ?? '',
            model: model.id,
            provider: 'google',
            usage,
            costUsd: (0, util_1.computeCost)(model, usage),
            latencyMs: Date.now() - start,
            finishReason: json.candidates[0]?.finishReason,
        };
    }
}
exports.GoogleProvider = GoogleProvider;
//# sourceMappingURL=google.js.map