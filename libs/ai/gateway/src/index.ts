import {
  type AIGateway,
  type CompletionRequest,
  type CompletionResponse,
  type EmbeddingRequest,
  type EmbeddingResponse,
  type ModelDescriptor,
  type ProviderAdapter,
  type ProviderType,
  type RoutingStrategy,
  BellasError,
  ErrorCode,
} from '@bellasos/contracts';
import type { ConfigService } from '@bellasos/core-config';
import { createLogger } from '@bellasos/observability';
import { ModelRegistry } from '@bellasos/ai-model-registry';
import { createProviders, refreshCredentials, credentialCache } from '@bellasos/ai-providers';
import { RoutingEngine } from '@bellasos/ai-routing';
import { getDb, isDbAvailable } from '@bellasos/db';
import { recordUsage } from './usage';

export * from './usage';

const log = createLogger({ lib: 'ai.gateway' });

export interface AIGatewayConfig {
  defaultStrategy?: RoutingStrategy;
  config?: ConfigService;
}

/**
 * The unified, vendor-agnostic AI surface. Routes each request to a concrete
 * model, calls the appropriate provider adapter, records usage/cost, and
 * exposes benchmarking. Agents and modules depend only on this interface.
 */
export class AIGatewayImpl implements AIGateway {
  readonly registry = new ModelRegistry();
  private readonly providers: Map<ProviderType, ProviderAdapter>;
  private router!: RoutingEngine;
  private strategy: RoutingStrategy;
  private readonly config?: ConfigService;

  constructor(config: AIGatewayConfig = {}) {
    this.providers = createProviders();
    this.config = config.config;
    this.strategy =
      config.defaultStrategy ??
      ((process.env.AI_ROUTING_STRATEGY as RoutingStrategy) || 'quality');
  }

  async init(): Promise<void> {
    if (this.config) {
      await refreshCredentials((p) => this.config!.getProviderCredential(p));
      const saved = await this.config.getRoutingStrategy();
      if (saved && ['cost', 'latency', 'privacy', 'quality'].includes(saved)) {
        this.strategy = saved as RoutingStrategy;
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

  async refreshProviderCredentials(): Promise<void> {
    if (!this.config) return;
    await refreshCredentials((p) => this.config!.getProviderCredential(p));
    this.rebuildRouter();
  }

  getRoutingStrategy(): RoutingStrategy {
    return this.strategy;
  }

  async setRoutingStrategy(strategy: RoutingStrategy): Promise<void> {
    this.strategy = strategy;
    if (this.config) await this.config.setRoutingStrategy(strategy);
    this.rebuildRouter();
  }

  async discoverLocalModels(): Promise<number> {
    // Ensure Ollama URL from env is visible before discovery.
    if (process.env.OLLAMA_BASE_URL) {
      credentialCache.set('ollama', process.env.OLLAMA_BASE_URL);
    }
    const ollama = this.providers.get('ollama') as
      | { isConfigured(): boolean; discoverModels?: () => Promise<ModelDescriptor[]> }
      | undefined;
    if (!ollama?.isConfigured() || !ollama.discoverModels) return 0;
    try {
      const models = await ollama.discoverModels();
      const present = new Set(models.map((m) => m.id));
      for (const m of models) this.registry.register(m);
      for (const m of this.registry.list()) {
        if (m.provider !== 'ollama') continue;
        if (present.has(m.id)) this.registry.enable(m.id);
        else this.registry.disable(m.id);
      }
      if (models.length) {
        log.info('discovered local ollama models', {
          count: models.length,
          models: [...present],
        });
      }
      return models.length;
    } catch (err) {
      log.warn('ollama discovery failed', { error: (err as Error).message });
      return 0;
    }
  }

  async refreshModels(): Promise<ModelDescriptor[]> {
    await this.discoverLocalModels();
    this.rebuildRouter();
    return this.listAllModels();
  }

  private rebuildRouter(): void {
    this.router = new RoutingEngine({
      models: this.registry.list(),
      defaultStrategy: this.strategy,
      isProviderConfigured: (type) =>
        this.providers.get(type)?.isConfigured() ?? false,
    });
  }

  listModels(): ModelDescriptor[] {
    return this.registry.enabled();
  }

  listAllModels(): ModelDescriptor[] {
    return this.registry.list();
  }

  providerStatus(): Array<{ provider: ProviderType; configured: boolean }> {
    return [...this.providers.entries()].map(([provider, adapter]) => ({
      provider,
      configured: adapter.isConfigured(),
    }));
  }

  async enableModel(id: string): Promise<ModelDescriptor[]> {
    this.registry.enable(id);
    await this.persistModelEnabled(id, true);
    this.rebuildRouter();
    return this.listAllModels();
  }

  async disableModel(id: string): Promise<ModelDescriptor[]> {
    this.registry.disable(id);
    await this.persistModelEnabled(id, false);
    this.rebuildRouter();
    return this.listAllModels();
  }

  private async persistModelEnabled(id: string, enabled: boolean): Promise<void> {
    if (!isDbAvailable()) return;
    try {
      await getDb()
        .updateTable('ai.models')
        .set({ enabled })
        .where('id', '=', id)
        .execute();
    } catch (err) {
      log.warn('model enable persist failed', { error: (err as Error).message });
    }
  }

  async registerModel(model: ModelDescriptor): Promise<ModelDescriptor[]> {
    this.registry.register(model);
    this.rebuildRouter();
    if (isDbAvailable()) {
      try {
        await getDb()
          .insertInto('ai.models')
          .values({
            id: model.id,
            provider_id: model.provider,
            display_name: model.displayName,
            capabilities: model.capabilities as string[],
            context_window: model.contextWindow,
            cost: model.cost as unknown as Record<string, unknown>,
            local: model.local,
            enabled: model.enabled,
          })
          .onConflict((oc) =>
            oc.column('id').doUpdateSet({
              display_name: model.displayName,
              enabled: model.enabled,
            }),
          )
          .execute();
      } catch (err) {
        log.warn('model persist failed (kept in memory)', {
          error: (err as Error).message,
        });
      }
    }
    return this.listAllModels();
  }

  /** When Ollama is configured with enabled chat models, do not silently mock. */
  private allowMockFallback(): boolean {
    const ollamaOk = this.providers.get('ollama')?.isConfigured();
    const hasLocalChat = this.registry.enabled().some(
      (m) => m.provider === 'ollama' && m.capabilities.includes('chat'),
    );
    if (ollamaOk && hasLocalChat) return false;
    const mockEnabled = this.registry.get('mock-model')?.enabled ?? false;
    return mockEnabled;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = this.router.routeCompletion(request);
    const provider = this.providerFor(model);
    const traceId = request.traceId ?? crypto.randomUUID();
    log.debug('routing completion', { model: model.id, provider: model.provider });
    try {
      const response = await provider.complete(request, model);
      await recordUsage(response, { taskType: request.taskType, traceId });
      return response;
    } catch (err) {
      if (model.provider !== 'mock' && this.allowMockFallback()) {
        log.warn('provider failed; falling back to mock', {
          provider: model.provider,
          error: (err as Error).message,
        });
        const mock = this.providers.get('mock')!;
        const mockModel = this.registry.get('mock-model')!;
        const response = await mock.complete(request, mockModel);
        await recordUsage(response, { taskType: request.taskType, traceId });
        return response;
      }
      throw new BellasError(
        ErrorCode.ProviderError,
        `${model.provider} failed: ${(err as Error).message}`,
      );
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = this.router.routeEmbedding(request);
    let provider = this.providerFor(model);
    const traceId = request.traceId ?? crypto.randomUUID();
    if (!provider.embed) {
      if (!this.allowMockFallback()) {
        throw new BellasError(
          ErrorCode.ProviderError,
          `Provider ${model.provider} does not support embeddings`,
        );
      }
      provider = this.providers.get('mock')!;
    }
    try {
      const response = await provider.embed!(request, model);
      await recordUsage(response, { taskType: 'embedding', traceId });
      return response;
    } catch (err) {
      if (this.allowMockFallback()) {
        log.warn('embedding provider failed; falling back to mock', {
          provider: model.provider,
          error: (err as Error).message,
        });
        const mock = this.providers.get('mock')!;
        const response = await mock.embed!(request, this.registry.get('mock-model')!);
        await recordUsage(response, { taskType: 'embedding', traceId });
        return response;
      }
      throw new BellasError(
        ErrorCode.ProviderError,
        `Embedding failed: ${(err as Error).message}`,
      );
    }
  }

  async benchmark(
    modelId: string,
    taskType = 'general',
  ): Promise<{ score: number; latencyMs: number; costUsd: number }> {
    const model = this.registry.get(modelId);
    if (!model) {
      throw new BellasError(ErrorCode.NotFound, `Unknown model ${modelId}`);
    }
    const provider = this.providerFor(model);
    const res = await provider.complete(
      {
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
        taskType: taskType as CompletionRequest['taskType'],
      },
      model,
    );
    const score = res.text.toLowerCase().includes('ok') ? 1 : 0.5;
    if (isDbAvailable()) {
      try {
        await getDb()
          .insertInto('ai.benchmarks')
          .values({
            model: modelId,
            task_type: taskType,
            score,
            latency_ms: res.latencyMs,
            cost_usd: res.costUsd,
          })
          .execute();
      } catch {
        /* best-effort */
      }
    }
    return { score, latencyMs: res.latencyMs, costUsd: res.costUsd };
  }

  private providerFor(model: ModelDescriptor): ProviderAdapter {
    const provider = this.providers.get(model.provider);
    if (!provider) {
      throw new BellasError(
        ErrorCode.ProviderError,
        `No adapter for provider ${model.provider}`,
      );
    }
    return provider;
  }
}
