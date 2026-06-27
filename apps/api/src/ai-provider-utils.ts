import type { ProviderType } from '@bellasos/contracts';
import type { ConfigService } from '@bellasos/core-config';
import type { AIGatewayImpl } from '@bellasos/ai-gateway';

const ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
};

/** Stable, low-cost models used by the provider test endpoint. */
export const PROVIDER_TEST_MODELS: Partial<Record<ProviderType, string>> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4',
  google: 'gemini-2.5-pro',
  deepseek: 'deepseek-chat',
};

export type ProviderStatusDetail = {
  provider: ProviderType;
  configured: boolean;
  source: 'ui' | 'env' | 'none';
  masked?: string;
};

export function maskSecret(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export async function resolveProviderStatuses(
  ai: AIGatewayImpl,
  config: ConfigService,
): Promise<ProviderStatusDetail[]> {
  await ai.refreshProviderCredentials();
  const base = ai.providerStatus();
  const out: ProviderStatusDetail[] = [];

  for (const row of base) {
    if (row.provider === 'mock') {
      out.push({ provider: row.provider, configured: true, source: 'none' });
      continue;
    }

    const fromUi = await config.getSecret('ai', `${row.provider}.credential`);
    const envKey = ENV_KEYS[row.provider];
    const fromEnv = envKey ? process.env[envKey]?.trim() : undefined;
    const credential = await config.getProviderCredential(row.provider);
    const configured = Boolean(credential?.trim());

    out.push({
      provider: row.provider,
      configured,
      source: fromUi ? 'ui' : fromEnv ? 'env' : 'none',
      masked: maskSecret(credential),
    });
  }

  return out;
}
