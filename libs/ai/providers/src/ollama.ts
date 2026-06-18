import type {
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelDescriptor,
  ProviderAdapter,
} from '@bellasos/contracts';
import { BellasError, ErrorCode } from '@bellasos/contracts';
import { DEFAULT_MODELS } from '@bellasos/ai-model-registry';
import { estimateTokens } from './util';
import { isProviderConfiguredSync, resolveCredentialSync } from './credentials';

/** Adapter for a local Ollama runtime (privacy-safe, zero-cost). */
export class OllamaProvider implements ProviderAdapter {
  readonly type = 'ollama' as const;

  private get baseUrl(): string {
    return resolveCredentialSync('ollama') ?? 'http://localhost:11434';
  }

  isConfigured(): boolean {
    return isProviderConfiguredSync('ollama');
  }

  listModels(): ModelDescriptor[] {
    return DEFAULT_MODELS.filter((m) => m.provider === 'ollama');
  }

  /**
   * Query the live Ollama runtime for the models actually pulled, so they are
   * registered automatically (whatever the user `ollama pull`s shows up).
   */
  async discoverModels(): Promise<ModelDescriptor[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const json = (await res.json()) as {
        models?: Array<{ name: string }>;
      };
      const names = (json.models ?? []).map((m) => m.name);
      return Promise.all(names.map((name) => this.describe(name)));
    } catch {
      return [];
    }
  }

  /** Enrich a model with real context length + parameter size via /api/show. */
  private async describe(name: string): Promise<ModelDescriptor> {
    const isEmbed = /embed/i.test(name);
    let contextWindow = isEmbed ? 8192 : 8192;
    let paramsB: number | undefined;
    try {
      const res = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const info = (await res.json()) as {
          details?: { parameter_size?: string };
          model_info?: Record<string, unknown>;
        };
        const ctx = Object.entries(info.model_info ?? {}).find(([k]) =>
          k.endsWith('.context_length'),
        )?.[1];
        if (typeof ctx === 'number') contextWindow = ctx;
        const size = info.details?.parameter_size; // e.g. "8.0B", "1.2B"
        if (size) {
          const n = parseFloat(size);
          if (!Number.isNaN(n)) paramsB = /m/i.test(size) ? n / 1000 : n;
        }
      }
    } catch {
      /* best-effort enrichment */
    }
    return {
      id: name,
      provider: 'ollama',
      displayName: `${name} (local)`,
      capabilities: isEmbed
        ? ['embedding']
        : ['chat', 'reasoning', 'tool_use'],
      contextWindow,
      cost: { inputPerMTokensUsd: 0, outputPerMTokensUsd: 0 },
      latencyHint: 4,
      paramsB,
      local: true,
      enabled: true,
    };
  }

  async complete(
    request: CompletionRequest,
    model: ModelDescriptor,
  ): Promise<CompletionResponse> {
    const start = Date.now();
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model.id,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 256,
        },
      }),
    });
    if (!res.ok) {
      throw new BellasError(
        ErrorCode.ProviderError,
        `ollama completion failed: ${res.status}`,
      );
    }
    const json = (await res.json()) as {
      message: { content: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const usage = {
      promptTokens: json.prompt_eval_count ?? 0,
      completionTokens: json.eval_count ?? 0,
      totalTokens: (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0),
    };
    return {
      text: json.message.content,
      model: model.id,
      provider: 'ollama',
      usage,
      costUsd: 0,
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
    const vectors: number[][] = [];
    for (const input of inputs) {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: model.id, prompt: input }),
      });
      if (!res.ok) {
        throw new BellasError(
          ErrorCode.ProviderError,
          `ollama embedding failed: ${res.status}`,
        );
      }
      const json = (await res.json()) as { embedding: number[] };
      vectors.push(json.embedding);
    }
    const tokens = inputs.reduce((n, t) => n + estimateTokens(t), 0);
    return {
      vectors,
      model: model.id,
      provider: 'ollama',
      usage: { promptTokens: tokens, completionTokens: 0, totalTokens: tokens },
      costUsd: 0,
      latencyMs: Date.now() - start,
    };
  }
}
