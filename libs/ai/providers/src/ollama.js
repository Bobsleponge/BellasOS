"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const contracts_1 = require("@bellasos/contracts");
const ai_model_registry_1 = require("@bellasos/ai-model-registry");
const util_1 = require("./util");
const credentials_1 = require("./credentials");
const VISION_NAME = /vision|llava|moondream|\bvl\b|vl2|bakllava|minicpm-v/i;
function capabilitiesForModel(name) {
    if (/embed/i.test(name))
        return ['embedding'];
    if (VISION_NAME.test(name))
        return ['chat', 'vision', 'reasoning'];
    return ['chat', 'reasoning', 'tool_use'];
}
/** Adapter for a local Ollama runtime (privacy-safe, zero-cost). */
class OllamaProvider {
    type = 'ollama';
    get baseUrl() {
        return (0, credentials_1.resolveCredentialSync)('ollama') ?? 'http://localhost:11434';
    }
    isConfigured() {
        return (0, credentials_1.isProviderConfiguredSync)('ollama');
    }
    listModels() {
        return ai_model_registry_1.DEFAULT_MODELS.filter((m) => m.provider === 'ollama');
    }
    /**
     * Query the live Ollama runtime for the models actually pulled, so they are
     * registered automatically (whatever the user `ollama pull`s shows up).
     */
    async discoverModels() {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`);
            if (!res.ok)
                return [];
            const json = (await res.json());
            const names = (json.models ?? []).map((m) => m.name);
            return Promise.all(names.map((name) => this.describe(name)));
        }
        catch {
            return [];
        }
    }
    /** Enrich a model with real context length + parameter size via /api/show. */
    async describe(name) {
        const capabilities = capabilitiesForModel(name);
        const isEmbed = capabilities.includes('embedding');
        let contextWindow = isEmbed ? 8192 : 8192;
        let paramsB;
        try {
            const res = await fetch(`${this.baseUrl}/api/show`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                const info = (await res.json());
                const ctx = Object.entries(info.model_info ?? {}).find(([k]) => k.endsWith('.context_length'))?.[1];
                if (typeof ctx === 'number')
                    contextWindow = ctx;
                const size = info.details?.parameter_size; // e.g. "8.0B", "1.2B"
                if (size) {
                    const n = parseFloat(size);
                    if (!Number.isNaN(n))
                        paramsB = /m/i.test(size) ? n / 1000 : n;
                }
            }
        }
        catch {
            /* best-effort enrichment */
        }
        return {
            id: name,
            provider: 'ollama',
            displayName: `${name} (local)`,
            capabilities,
            contextWindow,
            cost: { inputPerMTokensUsd: 0, outputPerMTokensUsd: 0 },
            latencyHint: 4,
            paramsB,
            local: true,
            enabled: true,
        };
    }
    async complete(request, model) {
        const start = Date.now();
        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                model: model.id,
                messages: request.messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                    ...(m.images?.length ? { images: m.images } : {}),
                })),
                stream: false,
                options: {
                    temperature: request.temperature ?? 0.7,
                    num_predict: request.maxTokens ?? 256,
                },
            }),
        });
        if (!res.ok) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `ollama completion failed: ${res.status}`);
        }
        const json = (await res.json());
        const usage = {
            promptTokens: json.prompt_eval_count ?? 0,
            completionTokens: json.eval_count ?? 0,
            totalTokens: (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0),
        };
        return {
            text: json.message.content,
            model: model.id,
            provider: 'ollama',
            usage,
            costUsd: 0,
            latencyMs: Date.now() - start,
            finishReason: 'stop',
        };
    }
    async embed(request, model) {
        const start = Date.now();
        const inputs = Array.isArray(request.input)
            ? request.input
            : [request.input];
        const vectors = [];
        for (const input of inputs) {
            const res = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ model: model.id, prompt: input }),
            });
            if (!res.ok) {
                throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `ollama embedding failed: ${res.status}`);
            }
            const json = (await res.json());
            vectors.push(json.embedding);
        }
        const tokens = inputs.reduce((n, t) => n + (0, util_1.estimateTokens)(t), 0);
        return {
            vectors,
            model: model.id,
            provider: 'ollama',
            usage: { promptTokens: tokens, completionTokens: 0, totalTokens: tokens },
            costUsd: 0,
            latencyMs: Date.now() - start,
        };
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=ollama.js.map