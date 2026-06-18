import type {
  CompletionRequest,
  CompletionResponse,
  ModelDescriptor,
  ProviderAdapter,
} from '@bellasos/contracts';
import { BellasError, ErrorCode } from '@bellasos/contracts';
import { DEFAULT_MODELS } from '@bellasos/ai-model-registry';
import { computeCost } from './util';
import { isProviderConfiguredSync, resolveCredentialSync } from './credentials';

/** Adapter for Anthropic's Messages API. */
export class AnthropicProvider implements ProviderAdapter {
  readonly type = 'anthropic' as const;

  isConfigured(): boolean {
    return isProviderConfiguredSync('anthropic');
  }

  listModels(): ModelDescriptor[] {
    return DEFAULT_MODELS.filter((m) => m.provider === 'anthropic');
  }

  async complete(
    request: CompletionRequest,
    model: ModelDescriptor,
  ): Promise<CompletionResponse> {
    const start = Date.now();
    const system = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': resolveCredentialSync('anthropic') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model.id,
        system: system || undefined,
        messages,
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      }),
    });
    if (!res.ok) {
      throw new BellasError(
        ErrorCode.ProviderError,
        `anthropic completion failed: ${res.status}`,
      );
    }
    const json = (await res.json()) as {
      content: Array<{ text: string }>;
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };
    const usage = {
      promptTokens: json.usage.input_tokens,
      completionTokens: json.usage.output_tokens,
      totalTokens: json.usage.input_tokens + json.usage.output_tokens,
    };
    return {
      text: json.content.map((c) => c.text).join(''),
      model: model.id,
      provider: 'anthropic',
      usage,
      costUsd: computeCost(model, usage),
      latencyMs: Date.now() - start,
      finishReason: json.stop_reason,
    };
  }
}
