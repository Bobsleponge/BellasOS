import { type CompletionRequest, type EmbeddingRequest, type ModelDescriptor, type ProviderType, type RoutingStrategy } from '@bellasos/contracts';
export * from './jarvis-hub';
export interface RoutingContext {
    /** Returns true if the provider has credentials / is reachable. */
    isProviderConfigured(type: ProviderType): boolean;
    models: ModelDescriptor[];
    defaultStrategy: RoutingStrategy;
}
/**
 * The Routing Engine selects a concrete model for a request based on cost,
 * latency, privacy and task type. Restricted data and the `privacy` strategy
 * force local models. When nothing is configured it falls back to the mock
 * provider so the platform always has a working path.
 */
export declare class RoutingEngine {
    private readonly ctx;
    constructor(ctx: RoutingContext);
    routeCompletion(request: CompletionRequest): ModelDescriptor;
    routeEmbedding(request: EmbeddingRequest): ModelDescriptor;
    private strategyFor;
    private forceLocal;
    private select;
    /** Lower score wins. */
    private score;
}
//# sourceMappingURL=index.d.ts.map