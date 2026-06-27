import { z } from 'zod';
import { DataClassification } from './common';
export type AICapability = 'chat' | 'completion' | 'embedding' | 'vision' | 'tool_use' | 'reasoning' | 'audio';
export type AITaskType = 'general' | 'research' | 'reasoning' | 'coding' | 'summarization' | 'embedding' | 'classification' | 'vision';
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'ollama' | 'mock';
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    /** Base64-encoded images for local/cloud vision models. */
    images?: string[];
}
export interface CompletionRequest {
    messages: ChatMessage[];
    /** Caller hint; the routing engine maps this to a concrete model. */
    taskType?: AITaskType;
    /** Pin a specific model id, bypassing routing. */
    model?: string;
    temperature?: number;
    maxTokens?: number;
    /** Privacy class of the input; `restricted` forces local/on-prem models. */
    classification?: DataClassification;
    traceId?: string;
}
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}
export interface CompletionResponse {
    text: string;
    model: string;
    provider: ProviderType;
    usage: TokenUsage;
    costUsd: number;
    latencyMs: number;
    finishReason?: string;
}
export interface EmbeddingRequest {
    input: string | string[];
    model?: string;
    classification?: DataClassification;
    traceId?: string;
}
export interface EmbeddingResponse {
    vectors: number[][];
    model: string;
    provider: ProviderType;
    usage: TokenUsage;
    costUsd: number;
    latencyMs: number;
}
/** Cost profile used by the routing engine to estimate $ per request. */
export interface ModelCostProfile {
    inputPerMTokensUsd: number;
    outputPerMTokensUsd: number;
}
export interface ModelDescriptor {
    id: string;
    provider: ProviderType;
    displayName: string;
    capabilities: AICapability[];
    contextWindow: number;
    cost: ModelCostProfile;
    /** Lower is faster; relative latency hint for routing. */
    latencyHint?: number;
    /** Parameter count in billions, when known. Bigger = preferred for quality. */
    paramsB?: number;
    /** True when the model runs locally (privacy-safe). */
    local: boolean;
    enabled: boolean;
}
/**
 * A provider adapter wraps a single vendor (or local runtime) behind the same
 * interface, so the gateway and routing engine are vendor-agnostic.
 */
export interface ProviderAdapter {
    readonly type: ProviderType;
    isConfigured(): boolean;
    listModels(): ModelDescriptor[];
    complete(request: CompletionRequest, model: ModelDescriptor): Promise<CompletionResponse>;
    embed?(request: EmbeddingRequest, model: ModelDescriptor): Promise<EmbeddingResponse>;
}
/** Unified, vendor-agnostic AI surface handed to agents and modules. */
export interface AIGateway {
    complete(request: CompletionRequest): Promise<CompletionResponse>;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    listModels(): ModelDescriptor[];
}
export declare const routingStrategySchema: z.ZodEnum<["cost", "latency", "privacy", "quality"]>;
export type RoutingStrategy = z.infer<typeof routingStrategySchema>;
//# sourceMappingURL=ai.d.ts.map