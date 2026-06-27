import type { CompletionRequest, CompletionResponse, ModelDescriptor, ProviderAdapter } from '@bellasos/contracts';
/** Adapter for Google Gemini (generativelanguage) API. */
export declare class GoogleProvider implements ProviderAdapter {
    readonly type: "google";
    isConfigured(): boolean;
    listModels(): ModelDescriptor[];
    complete(request: CompletionRequest, model: ModelDescriptor): Promise<CompletionResponse>;
}
//# sourceMappingURL=google.d.ts.map