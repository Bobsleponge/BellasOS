import type { CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse, ModelDescriptor, ProviderAdapter } from '@bellasos/contracts';
/** Adapter for a local Ollama runtime (privacy-safe, zero-cost). */
export declare class OllamaProvider implements ProviderAdapter {
    readonly type: "ollama";
    private get baseUrl();
    isConfigured(): boolean;
    listModels(): ModelDescriptor[];
    /**
     * Query the live Ollama runtime for the models actually pulled, so they are
     * registered automatically (whatever the user `ollama pull`s shows up).
     */
    discoverModels(): Promise<ModelDescriptor[]>;
    /** Enrich a model with real context length + parameter size via /api/show. */
    private describe;
    complete(request: CompletionRequest, model: ModelDescriptor): Promise<CompletionResponse>;
    embed(request: EmbeddingRequest, model: ModelDescriptor): Promise<EmbeddingResponse>;
}
//# sourceMappingURL=ollama.d.ts.map