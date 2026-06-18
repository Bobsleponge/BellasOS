import type { ProviderType } from '@bellasos/contracts';

const ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
};

/** In-memory cache refreshed from ConfigService + env at boot and on credential updates. */
class CredentialCache {
  private readonly values = new Map<string, string>();

  set(provider: string, value: string | undefined): void {
    if (value) this.values.set(provider, value);
    else this.values.delete(provider);
  }

  get(provider: string): string | undefined {
    return this.values.get(provider) ?? process.env[ENV_KEYS[provider] ?? ''] ?? undefined;
  }

  isConfigured(provider: string): boolean {
    return Boolean(this.get(provider));
  }
}

export const credentialCache = new CredentialCache();

export async function refreshCredentials(
  getProviderCredential: (provider: string) => Promise<string | undefined>,
): Promise<void> {
  for (const p of Object.keys(ENV_KEYS)) {
    const v = await getProviderCredential(p);
    credentialCache.set(p, v);
  }
}

export function resolveCredentialSync(provider: ProviderType): string | undefined {
  return credentialCache.get(provider);
}

export function isProviderConfiguredSync(provider: ProviderType): boolean {
  if (provider === 'mock') return true;
  return credentialCache.isConfigured(provider);
}
