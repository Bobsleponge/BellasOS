import type { CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse, ModelDescriptor, ProviderAdapter, ProviderType } from '@bellasos/contracts';
/**
 * Adapter for OpenAI-compatible Chat Completions APIs. DeepSeek reuses this with
 * a different base URL + provider tag, since its API is OpenAI-compatible.
 */
export declare class OpenAICompatibleProvider implements ProviderAdapter {
    readonly type: ProviderType;
    private readonly opts;
    constructor(type: ProviderType, opts: {
        apiKeyEnv: string;
        baseUrl: string;
    });
    isConfigured(): boolean;
    listModels(): ModelDescriptor[];
    private headers;
    complete(request: CompletionRequest, model: ModelDescriptor): Promise<CompletionResponse>;
    embed(request: EmbeddingRequest, model: ModelDescriptor): Promise<EmbeddingResponse>;
}
export declare function createOpenAIProvider(): OpenAICompatibleProvider;
export declare function createDeepSeekProvider(): OpenAICompatibleProvider;
//# sourceMappingURL=openai.d.ts.map