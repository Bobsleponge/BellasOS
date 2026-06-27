import type { ConfigStore } from '@bellasos/contracts';
import { getDb, isDbAvailable } from '@bellasos/db';
import { createLogger } from '@bellasos/observability';
import { createSecretsBackend, type SecretsBackend } from './secrets';

export * from './secrets';

const log = createLogger({ lib: 'config' });

const AI_PROVIDER_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  ollama: 'OLLAMA_BASE_URL',
};

/**
 * Namespaced configuration service. Each module/subsystem gets a scoped
 * ConfigStore; values persist to `core.config` when the DB is available and to
 * an in-memory map otherwise. Secrets resolve via the secrets backend.
 */
export class ConfigService {
  private readonly memory = new Map<string, unknown>();
  private readonly secretMemory = new Map<string, string>();

  constructor(
    private readonly secrets: SecretsBackend = createSecretsBackend(),
  ) {}

  scope(namespace: string): ConfigStore {
    return {
      get: <T>(key: string) => this.get<T>(namespace, key),
      set: <T>(key: string, value: T) => this.set(namespace, key, value),
      getSecret: (key: string) => this.getSecret(namespace, key),
      setSecret: (key: string, value: string) => this.setSecret(namespace, key, value),
    };
  }

  async get<T>(namespace: string, key: string): Promise<T | undefined> {
    const memKey = `${namespace}:${key}`;
    if (this.memory.has(memKey)) return this.memory.get(memKey) as T;
    if (!isDbAvailable()) return undefined;
    try {
      const row = await getDb()
        .selectFrom('core.config')
        .select(['value', 'is_secret'])
        .where('namespace', '=', namespace)
        .where('key', '=', key)
        .executeTakeFirst();
      if (!row || row.is_secret) return undefined;
      return (row.value as T) ?? undefined;
    } catch (err) {
      log.error('config get failed', { error: (err as Error).message });
      return undefined;
    }
  }

  async set<T>(namespace: string, key: string, value: T): Promise<void> {
    this.memory.set(`${namespace}:${key}`, value);
    if (!isDbAvailable()) return;
    try {
      await getDb()
        .insertInto('core.config')
        .values({
          namespace,
          key,
          value: value as Record<string, unknown>,
          is_secret: false,
          secret_ref: null,
        })
        .onConflict((oc) =>
          oc.columns(['namespace', 'key']).doUpdateSet({
            value: value as Record<string, unknown>,
            is_secret: false,
          }),
        )
        .execute();
    } catch (err) {
      log.error('config set failed', { error: (err as Error).message });
    }
  }

  /** Persist a secret to core.config (dev) and memory; never returned in plaintext via get(). */
  async setSecret(namespace: string, key: string, value: string): Promise<void> {
    const memKey = `${namespace}:${key}`;
    this.secretMemory.set(memKey, value);
    if (!isDbAvailable()) return;
    try {
      await getDb()
        .insertInto('core.config')
        .values({
          namespace,
          key,
          value: { v: value } as Record<string, unknown>,
          is_secret: true,
          secret_ref: `${namespace}:${key}`,
        })
        .onConflict((oc) =>
          oc.columns(['namespace', 'key']).doUpdateSet({
            value: { v: value } as Record<string, unknown>,
            is_secret: true,
          }),
        )
        .execute();
    } catch (err) {
      log.error('config setSecret failed', { error: (err as Error).message });
    }
  }

  /** Secret values: memory → DB → env ref fallback. */
  async getSecret(namespace: string, key: string): Promise<string | undefined> {
    const memKey = `${namespace}:${key}`;
    if (this.secretMemory.has(memKey)) return this.secretMemory.get(memKey);
    if (isDbAvailable()) {
      try {
        const row = await getDb()
          .selectFrom('core.config')
          .select(['value', 'is_secret'])
          .where('namespace', '=', namespace)
          .where('key', '=', key)
          .executeTakeFirst();
        if (row?.is_secret && row.value && typeof row.value === 'object') {
          const v = (row.value as { v?: string }).v;
          if (v) {
            this.secretMemory.set(memKey, v);
            return v;
          }
        }
      } catch (err) {
        log.error('config getSecret db failed', { error: (err as Error).message });
      }
    }
    const ref = (await this.get<string>(namespace, `${key}__ref`)) ?? key;
    return this.secrets.get(ref);
  }

  async deleteSecret(namespace: string, key: string): Promise<void> {
    this.secretMemory.delete(`${namespace}:${key}`);
    if (!isDbAvailable()) return;
    try {
      await getDb()
        .deleteFrom('core.config')
        .where('namespace', '=', namespace)
        .where('key', '=', key)
        .execute();
    } catch (err) {
      log.error('config deleteSecret failed', { error: (err as Error).message });
    }
  }

  /** Resolve AI provider credential: UI-stored secret first, then env var. */
  async getProviderCredential(provider: string): Promise<string | undefined> {
    const fromConfig = await this.getSecret('ai', `${provider}.credential`);
    if (fromConfig) return fromConfig;
    const envKey = AI_PROVIDER_KEYS[provider];
    if (envKey) return process.env[envKey] || undefined;
    return undefined;
  }

  async setProviderCredential(provider: string, value: string): Promise<void> {
    await this.setSecret('ai', `${provider}.credential`, value);
    if (isDbAvailable()) {
      try {
        await getDb()
          .updateTable('ai.providers')
          .set({ credentials_ref: `ai:${provider}.credential` })
          .where('id', '=', provider)
          .execute();
      } catch {
        /* best-effort */
      }
    }
  }

  async getRoutingStrategy(): Promise<string | undefined> {
    return this.get<string>('ai', 'routingStrategy');
  }

  async setRoutingStrategy(strategy: string): Promise<void> {
    await this.set('ai', 'routingStrategy', strategy);
  }
}
