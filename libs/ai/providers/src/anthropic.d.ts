import type { CompletionRequest, CompletionResponse, ModelDescriptor, ProviderAdapter } from '@bellasos/contracts';
/** Adapter for Anthropic's Messages API. */
export declare class AnthropicProvider implements ProviderAdapter {
    readonly type: "anthropic";
    isConfigured(): boolean;
    listModels(): ModelDescriptor[];
    complete(request: CompletionRequest, model: ModelDescriptor): Promise<CompletionResponse>;
}
//# sourceMappingURL=anthropic.d.ts.map