import {
  BellasError,
  ErrorCode,
  type AICapability,
  type CompletionRequest,
  type EmbeddingRequest,
  type ModelDescriptor,
  type ProviderType,
  type RoutingStrategy,
} from '@bellasos/contracts';

export interface RoutingContext {
  /** Returns true if the provider has credentials / is reachable. */
  isProviderConfigured(type: ProviderType): boolean;
  models: ModelDescriptor[];
  defaultStrategy: RoutingStrategy;
}

/** Maps a task type to a capability the chosen model must support. */
const TASK_CAPABILITY: Record<string, AICapability> = {
  reasoning: 'reasoning',
  research: 'reasoning',
  coding: 'reasoning',
  vision: 'vision',
  embedding: 'embedding',
};

/**
 * The Routing Engine selects a concrete model for a request based on cost,
 * latency, privacy and task type. Restricted data and the `privacy` strategy
 * force local models. When nothing is configured it falls back to the mock
 * provider so the platform always has a working path.
 */
export class RoutingEngine {
  constructor(private readonly ctx: RoutingContext) {}

  routeCompletion(request: CompletionRequest): ModelDescriptor {
    if (request.model) {
      const pinned = this.ctx.models.find((m) => m.id === request.model);
      if (pinned) return pinned;
    }
    const cap = request.taskType
      ? (TASK_CAPABILITY[request.taskType] ?? 'chat')
      : 'chat';
    return this.select({
      capability: cap === 'embedding' ? 'chat' : cap,
      strategy: this.strategyFor(request),
      forceLocal: this.forceLocal(request),
    });
  }

  routeEmbedding(request: EmbeddingRequest): ModelDescriptor {
    if (request.model) {
      const pinned = this.ctx.models.find((m) => m.id === request.model);
      if (pinned) return pinned;
    }
    return this.select({
      capability: 'embedding',
      strategy: this.ctx.defaultStrategy,
      forceLocal:
        request.classification === 'restricted' ||
        this.ctx.defaultStrategy === 'privacy',
    });
  }

  private strategyFor(request: CompletionRequest): RoutingStrategy {
    if (
      request.classification === 'restricted' ||
      request.classification === 'confidential'
    ) {
      return 'privacy';
    }
    return this.ctx.defaultStrategy;
  }

  private forceLocal(request: CompletionRequest): boolean {
    return (
      request.classification === 'restricted' ||
      this.ctx.defaultStrategy === 'privacy'
    );
  }

  private select(opts: {
    capability: AICapability;
    strategy: RoutingStrategy;
    forceLocal: boolean;
  }): ModelDescriptor {
    let candidates = this.ctx.models.filter(
      (m) => m.enabled && m.capabilities.includes(opts.capability),
    );
    if (opts.forceLocal) candidates = candidates.filter((m) => m.local);

    // Only models whose provider is usable (configured or local).
    let usable = candidates.filter(
      (m) => m.local || this.ctx.isProviderConfigured(m.provider),
    );
    if (usable.length === 0) {
      // Guaranteed fallback to the mock provider.
      const mock = this.ctx.models.find(
        (m) => m.provider === 'mock' && m.capabilities.includes(opts.capability),
      );
      if (mock) return mock;
      throw new BellasError(
        ErrorCode.ProviderError,
        `No model available for capability ${opts.capability}`,
      );
    }

    usable.sort((a, b) => this.score(a, opts.strategy) - this.score(b, opts.strategy));
    return usable[0]!;
  }

  /** Lower score wins. */
  private score(model: ModelDescriptor, strategy: RoutingStrategy): number {
    switch (strategy) {
      case 'cost':
        return (
          model.cost.inputPerMTokensUsd + model.cost.outputPerMTokensUsd
        );
      case 'latency':
        return model.latencyHint ?? 99;
      case 'privacy':
        return model.local ? 0 : 100;
      case 'quality':
      default:
        // Heuristic: prefer more parameters + larger context + reasoning, and
        // strongly de-prefer the offline mock provider.
        return (
          -(model.paramsB ?? 0) -
          (model.contextWindow / 100000) -
          (model.capabilities.includes('reasoning') ? 5 : 0) -
          (model.provider === 'mock' ? -50 : 0)
        );
    }
  }
}
