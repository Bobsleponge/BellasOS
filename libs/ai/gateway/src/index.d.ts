import { type AIGateway, type CompletionRequest, type CompletionResponse, type EmbeddingRequest, type EmbeddingResponse, type ModelDescriptor, type ProviderType, type RoutingStrategy } from '@bellasos/contracts';
import type { ConfigService } from '@bellasos/core-config';
import { ModelRegistry } from '@bellasos/ai-model-registry';
export * from './usage';
export interface AIGatewayConfig {
    defaultStrategy?: RoutingStrategy;
    config?: ConfigService;
}
/**
 * The unified, vendor-agnostic AI surface. Routes each request to a concrete
 * model, calls the appropriate provider adapter, records usage/cost, and
 * exposes benchmarking. Agents and modules depend only on this interface.
 */
export declare class AIGatewayImpl implements AIGateway {
    readonly registry: ModelRegistry;
    private readonly providers;
    private router;
    private strategy;
    private readonly config?;
    constructor(config?: AIGatewayConfig);
    init(): Promise<void>;
    refreshProviderCredentials(): Promise<void>;
    getRoutingStrategy(): RoutingStrategy;
    setRoutingStrategy(strategy: RoutingStrategy): Promise<void>;
    discoverLocalModels(): Promise<number>;
    refreshModels(): Promise<ModelDescriptor[]>;
    private rebuildRouter;
    listModels(): ModelDescriptor[];
    listAllModels(): ModelDescriptor[];
    providerStatus(): Array<{
        provider: ProviderType;
        configured: boolean;
    }>;
    enableModel(id: string): Promise<ModelDescriptor[]>;
    disableModel(id: string): Promise<ModelDescriptor[]>;
    private persistModelEnabled;
    registerModel(model: ModelDescriptor): Promise<ModelDescriptor[]>;
    /** When Ollama is configured with enabled chat models, do not silently mock. */
    private allowMockFallback;
    complete(request: CompletionRequest): Promise<CompletionResponse>;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    benchmark(modelId: string, taskType?: string): Promise<{
        score: number;
        latencyMs: number;
        costUsd: number;
    }>;
    private providerFor;
}
//# sourceMappingURL=index.d.ts.map