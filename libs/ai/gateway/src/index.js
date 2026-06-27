"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIGatewayImpl = void 0;
const contracts_1 = require("@bellasos/contracts");
const observability_1 = require("@bellasos/observability");
const ai_model_registry_1 = require("@bellasos/ai-model-registry");
const ai_providers_1 = require("@bellasos/ai-providers");
const ai_routing_1 = require("@bellasos/ai-routing");
const db_1 = require("@bellasos/db");
const usage_1 = require("./usage");
__exportStar(require("./usage"), exports);
const log = (0, observability_1.createLogger)({ lib: 'ai.gateway' });
/**
 * The unified, vendor-agnostic AI surface. Routes each request to a concrete
 * model, calls the appropriate provider adapter, records usage/cost, and
 * exposes benchmarking. Agents and modules depend only on this interface.
 */
class AIGatewayImpl {
    registry = new ai_model_registry_1.ModelRegistry();
    providers;
    router;
    strategy;
    config;
    constructor(config = {}) {
        this.providers = (0, ai_providers_1.createProviders)();
        this.config = config.config;
        this.strategy =
            config.defaultStrategy ??
                (process.env.AI_ROUTING_STRATEGY || 'quality');
    }
    async init() {
        if (this.config) {
            await (0, ai_providers_1.refreshCredentials)((p) => this.config.getProviderCredential(p));
            const saved = await this.config.getRoutingStrategy();
            if (saved && ['cost', 'latency', 'privacy', 'quality'].includes(saved)) {
                this.strategy = saved;
            }
        }
        await this.registry.load();
        await this.discoverLocalModels();
        this.rebuildRouter();
        log.info('AI gateway ready', {
            strategy: this.strategy,
            providers: [...this.providers.keys()],
        });
    }
    async refreshProviderCredentials() {
        if (!this.config)
            return;
        await (0, ai_providers_1.refreshCredentials)((p) => this.config.getProviderCredential(p));
        this.rebuildRouter();
    }
    getRoutingStrategy() {
        return this.strategy;
    }
    async setRoutingStrategy(strategy) {
        this.strategy = strategy;
        if (this.config)
            await this.config.setRoutingStrategy(strategy);
        this.rebuildRouter();
    }
    async discoverLocalModels() {
        // Ensure Ollama URL from env is visible before discovery.
        if (process.env.OLLAMA_BASE_URL) {
            ai_providers_1.credentialCache.set('ollama', process.env.OLLAMA_BASE_URL);
        }
        const ollama = this.providers.get('ollama');
        if (!ollama?.isConfigured() || !ollama.discoverModels)
            return 0;
        try {
            const models = await ollama.discoverModels();
            const present = new Set(models.map((m) => m.id));
            for (const m of models)
                this.registry.register(m);
            for (const m of this.registry.list()) {
                if (m.provider !== 'ollama')
                    continue;
                if (present.has(m.id))
                    this.registry.enable(m.id);
                else
                    this.registry.disable(m.id);
            }
            if (models.length) {
                log.info('discovered local ollama models', {
                    count: models.length,
                    models: [...present],
                });
            }
            return models.length;
        }
        catch (err) {
            log.warn('ollama discovery failed', { error: err.message });
            return 0;
        }
    }
    async refreshModels() {
        await this.discoverLocalModels();
        this.rebuildRouter();
        return this.listAllModels();
    }
    rebuildRouter() {
        this.router = new ai_routing_1.RoutingEngine({
            models: this.registry.list(),
            defaultStrategy: this.strategy,
            isProviderConfigured: (type) => this.providers.get(type)?.isConfigured() ?? false,
        });
    }
    listModels() {
        return this.registry.enabled();
    }
    listAllModels() {
        return this.registry.list();
    }
    providerStatus() {
        return [...this.providers.entries()].map(([provider, adapter]) => ({
            provider,
            configured: adapter.isConfigured(),
        }));
    }
    async enableModel(id) {
        this.registry.enable(id);
        await this.persistModelEnabled(id, true);
        this.rebuildRouter();
        return this.listAllModels();
    }
    async disableModel(id) {
        this.registry.disable(id);
        await this.persistModelEnabled(id, false);
        this.rebuildRouter();
        return this.listAllModels();
    }
    async persistModelEnabled(id, enabled) {
        if (!(0, db_1.isDbAvailable)())
            return;
        try {
            await (0, db_1.getDb)()
                .updateTable('ai.models')
                .set({ enabled })
                .where('id', '=', id)
                .execute();
        }
        catch (err) {
            log.warn('model enable persist failed', { error: err.message });
        }
    }
    async registerModel(model) {
        this.registry.register(model);
        this.rebuildRouter();
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)()
                    .insertInto('ai.models')
                    .values({
                    id: model.id,
                    provider_id: model.provider,
                    display_name: model.displayName,
                    capabilities: model.capabilities,
                    context_window: model.contextWindow,
                    cost: model.cost,
                    local: model.local,
                    enabled: model.enabled,
                })
                    .onConflict((oc) => oc.column('id').doUpdateSet({
                    display_name: model.displayName,
                    enabled: model.enabled,
                }))
                    .execute();
            }
            catch (err) {
                log.warn('model persist failed (kept in memory)', {
                    error: err.message,
                });
            }
        }
        return this.listAllModels();
    }
    /** When Ollama is configured with enabled chat models, do not silently mock. */
    allowMockFallback() {
        const ollamaOk = this.providers.get('ollama')?.isConfigured();
        const hasLocalChat = this.registry.enabled().some((m) => m.provider === 'ollama' && m.capabilities.includes('chat'));
        if (ollamaOk && hasLocalChat)
            return false;
        const mockEnabled = this.registry.get('mock-model')?.enabled ?? false;
        return mockEnabled;
    }
    async complete(request) {
        const model = this.router.routeCompletion(request);
        const provider = this.providerFor(model);
        const traceId = request.traceId ?? crypto.randomUUID();
        log.debug('routing completion', { model: model.id, provider: model.provider });
        try {
            const response = await provider.complete(request, model);
            await (0, usage_1.recordUsage)(response, { taskType: request.taskType, traceId });
            return response;
        }
        catch (err) {
            if (model.provider !== 'mock' && this.allowMockFallback()) {
                log.warn('provider failed; falling back to mock', {
                    provider: model.provider,
                    error: err.message,
                });
                const mock = this.providers.get('mock');
                const mockModel = this.registry.get('mock-model');
                const response = await mock.complete(request, mockModel);
                await (0, usage_1.recordUsage)(response, { taskType: request.taskType, traceId });
                return response;
            }
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `${model.provider} failed: ${err.message}`);
        }
    }
    async embed(request) {
        const model = this.router.routeEmbedding(request);
        let provider = this.providerFor(model);
        const traceId = request.traceId ?? crypto.randomUUID();
        if (!provider.embed) {
            if (!this.allowMockFallback()) {
                throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `Provider ${model.provider} does not support embeddings`);
            }
            provider = this.providers.get('mock');
        }
        try {
            const response = await provider.embed(request, model);
            await (0, usage_1.recordUsage)(response, { taskType: 'embedding', traceId });
            return response;
        }
        catch (err) {
            if (this.allowMockFallback()) {
                log.warn('embedding provider failed; falling back to mock', {
                    provider: model.provider,
                    error: err.message,
                });
                const mock = this.providers.get('mock');
                const response = await mock.embed(request, this.registry.get('mock-model'));
                await (0, usage_1.recordUsage)(response, { taskType: 'embedding', traceId });
                return response;
            }
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `Embedding failed: ${err.message}`);
        }
    }
    async benchmark(modelId, taskType = 'general') {
        const model = this.registry.get(modelId);
        if (!model) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.NotFound, `Unknown model ${modelId}`);
        }
        const provider = this.providerFor(model);
        const res = await provider.complete({
            messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
            taskType: taskType,
        }, model);
        const score = res.text.toLowerCase().includes('ok') ? 1 : 0.5;
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)()
                    .insertInto('ai.benchmarks')
                    .values({
                    model: modelId,
                    task_type: taskType,
                    score,
                    latency_ms: res.latencyMs,
                    cost_usd: res.costUsd,
                })
                    .execute();
            }
            catch {
                /* best-effort */
            }
        }
        return { score, latencyMs: res.latencyMs, costUsd: res.costUsd };
    }
    providerFor(model) {
        const provider = this.providers.get(model.provider);
        if (!provider) {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.ProviderError, `No adapter for provider ${model.provider}`);
        }
        return provider;
    }
}
exports.AIGatewayImpl = AIGatewayImpl;
//# sourceMappingURL=index.js.map