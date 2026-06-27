import type { CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse, ModelDescriptor, ProviderAdapter } from '@bellasos/contracts';
/**
 * Offline provider used as a guaranteed fallback so the platform always has a
 * working AI path without any API keys. Produces deterministic pseudo-output.
 */
export declare class MockProvider implements ProviderAdapter {
    readonly type: "mock";
    isConfigured(): boolean;
    listModels(): ModelDescriptor[];
    complete(request: CompletionRequest, model: ModelDescriptor): Promise<CompletionResponse>;
    embed(request: EmbeddingRequest, model: ModelDescriptor): Promise<EmbeddingResponse>;
    /** Deterministic, normalized pseudo-embedding from a string hash. */
    private hashVector;
}
//# sourceMappingURL=mock.d.ts.map