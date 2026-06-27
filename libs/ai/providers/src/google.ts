import type {
  CompletionRequest,
  CompletionResponse,
  ModelDescriptor,
  ProviderAdapter,
} from '@bellasos/contracts';
import { BellasError, ErrorCode } from '@bellasos/contracts';
import { DEFAULT_MODELS } from '@bellasos/ai-model-registry';
import { computeCost, emptyUsage } from './util';
import { isProviderConfiguredSync, resolveCredentialSync } from './credentials';

/** Adapter for Google Gemini (generativelanguage) API. */
export class GoogleProvider implements ProviderAdapter {
  readonly type = 'google' as const;

  isConfigured(): boolean {
    return isProviderConfiguredSync('google');
  }

  listModels(): ModelDescriptor[] {
    return DEFAULT_MODELS.filter((m) => m.provider === 'google');
  }

  async complete(
    request: CompletionRequest,
    model: ModelDescriptor,
  ): Promise<CompletionResponse> {
    const start = Date.now();
    const key = resolveCredentialSync('google') ?? '';
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    const system = request.messages.find((m) => m.role === 'system')?.content;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: system
            ? { parts: [{ text: system }] }
            : undefined,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens,
          },
        }),
      },
    );
    if (!res.ok) {
      throw new BellasError(
        ErrorCode.ProviderError,
        `google completion failed: ${res.status}`,
      );
    }
    const json = (await res.json()) as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        finishReason: string;
      }>;
      usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
      };
    };
    const usage = json.usageMetadata
      ? {
          promptTokens: json.usageMetadata.promptTokenCount,
          completionTokens: json.usageMetadata.candidatesTokenCount,
          totalTokens: json.usageMetadata.totalTokenCount,
        }
      : emptyUsage();
    return {
      text:
        json.candidates[0]?.content.parts.map((p) => p.text).join('') ?? '',
      model: model.id,
      provider: 'google',
      usage,
      costUsd: computeCost(model, usage),
      latencyMs: Date.now() - start,
      finishReason: json.candidates[0]?.finishReason,
    };
  }
}
