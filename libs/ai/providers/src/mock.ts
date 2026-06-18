import type {
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelDescriptor,
  ProviderAdapter,
} from '@bellasos/contracts';
import { DEFAULT_MODELS } from '@bellasos/ai-model-registry';
import { computeCost, estimateTokens } from './util';

const DIMS = 1536;

/**
 * Offline provider used as a guaranteed fallback so the platform always has a
 * working AI path without any API keys. Produces deterministic pseudo-output.
 */
export class MockProvider implements ProviderAdapter {
  readonly type = 'mock' as const;

  isConfigured(): boolean {
    return true;
  }

  listModels(): ModelDescriptor[] {
    return DEFAULT_MODELS.filter((m) => m.provider === 'mock');
  }

  async complete(
    request: CompletionRequest,
    model: ModelDescriptor,
  ): Promise<CompletionResponse> {
    const start = Date.now();
    const prompt = request.messages.map((m) => m.content).join('\n');
    const text =
      `[mock:${model.id}] Acknowledged ${request.messages.length} message(s). ` +
      `Task=${request.taskType ?? 'general'}. ` +
      `This is offline placeholder output for: "${prompt.slice(0, 120)}".`;
    const usage = {
      promptTokens: estimateTokens(prompt),
      completionTokens: estimateTokens(text),
      totalTokens: estimateTokens(prompt) + estimateTokens(text),
    };
    return {
      text,
      model: model.id,
      provider: 'mock',
      usage,
      costUsd: computeCost(model, usage),
      latencyMs: Date.now() - start,
      finishReason: 'stop',
    };
  }

  async embed(
    request: EmbeddingRequest,
    model: ModelDescriptor,
  ): Promise<EmbeddingResponse> {
    const start = Date.now();
    const inputs = Array.isArray(request.input)
      ? request.input
      : [request.input];
    const vectors = inputs.map((text) => this.hashVector(text));
    const tokens = inputs.reduce((n, t) => n + estimateTokens(t), 0);
    return {
      vectors,
      model: model.id,
      provider: 'mock',
      usage: { promptTokens: tokens, completionTokens: 0, totalTokens: tokens },
      costUsd: 0,
      latencyMs: Date.now() - start,
    };
  }

  /** Deterministic, normalized pseudo-embedding from a string hash. */
  private hashVector(text: string): number[] {
    const vec = new Array<number>(DIMS).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = i % DIMS;
      vec[idx] = (vec[idx] ?? 0) + text.charCodeAt(i);
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}
