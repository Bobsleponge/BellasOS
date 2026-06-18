import type {
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelDescriptor,
  ProviderAdapter,
  ProviderType,
} from '@bellasos/contracts';
import { BellasError, ErrorCode } from '@bellasos/contracts';
import { DEFAULT_MODELS } from '@bellasos/ai-model-registry';
import { computeCost, emptyUsage } from './util';
import { isProviderConfiguredSync, resolveCredentialSync } from './credentials';

/**
 * Adapter for OpenAI-compatible Chat Completions APIs. DeepSeek reuses this with
 * a different base URL + provider tag, since its API is OpenAI-compatible.
 */
export class OpenAICompatibleProvider implements ProviderAdapter {
  constructor(
    readonly type: ProviderType,
    private readonly opts: {
      apiKeyEnv: string;
      baseUrl: string;
    },
  ) {}

  isConfigured(): boolean {
    return isProviderConfiguredSync(this.type);
  }

  listModels(): ModelDescriptor[] {
    return DEFAULT_MODELS.filter((m) => m.provider === this.type);
  }

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${resolveCredentialSync(this.type) ?? ''}`,
    };
  }

  async complete(
    request: CompletionRequest,
    model: ModelDescriptor,
  ): Promise<CompletionResponse> {
    const start = Date.now();
    const res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: model.id,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
      }),
    });
    if (!res.ok) {
      throw new BellasError(
        ErrorCode.ProviderError,
        `${this.type} completion failed: ${res.status}`,
      );
    }
    const json = (await res.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
    const usage = json.usage
      ? {
          promptTokens: json.usage.prompt_tokens,
          completionTokens: json.usage.completion_tokens,
          totalTokens: json.usage.total_tokens,
        }
      : emptyUsage();
    return {
      text: json.choices[0]?.message.content ?? '',
      model: model.id,
      provider: this.type,
      usage,
      costUsd: computeCost(model, usage),
      latencyMs: Date.now() - start,
      finishReason: json.choices[0]?.finish_reason,
    };
  }

  async embed(
    request: EmbeddingRequest,
    model: ModelDescriptor,
  ): Promise<EmbeddingResponse> {
    const start = Date.now();
    const res = await fetch(`${this.opts.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: model.id, input: request.input }),
    });
    if (!res.ok) {
      throw new BellasError(
        ErrorCode.ProviderError,
        `${this.type} embedding failed: ${res.status}`,
      );
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
      usage?: { prompt_tokens: number; total_tokens: number };
    };
    const usage = {
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: 0,
      totalTokens: json.usage?.total_tokens ?? 0,
    };
    return {
      vectors: json.data.map((d) => d.embedding),
      model: model.id,
      provider: this.type,
      usage,
      costUsd: computeCost(model, usage),
      latencyMs: Date.now() - start,
    };
  }
}

export function createOpenAIProvider(): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('openai', {
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
  });
}

export function createDeepSeekProvider(): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider('deepseek', {
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1',
  });
}
