import type { ConfigStore } from '@bellasos/contracts';
import { type SecretsBackend } from './secrets';
export * from './secrets';
/**
 * Namespaced configuration service. Each module/subsystem gets a scoped
 * ConfigStore; values persist to `core.config` when the DB is available and to
 * an in-memory map otherwise. Secrets resolve via the secrets backend.
 */
export declare class ConfigService {
    private readonly secrets;
    private readonly memory;
    private readonly secretMemory;
    constructor(secrets?: SecretsBackend);
    scope(namespace: string): ConfigStore;
    get<T>(namespace: string, key: string): Promise<T | undefined>;
    set<T>(namespace: string, key: string, value: T): Promise<void>;
    /** Persist a secret to core.config (dev) and memory; never returned in plaintext via get(). */
    setSecret(namespace: string, key: string, value: string): Promise<void>;
    /** Secret values: memory → DB → env ref fallback. */
    getSecret(namespace: string, key: string): Promise<string | undefined>;
    deleteSecret(namespace: string, key: string): Promise<void>;
    /** Resolve AI provider credential: UI-stored secret first, then env var. */
    getProviderCredential(provider: string): Promise<string | undefined>;
    setProviderCredential(provider: string, value: string): Promise<void>;
    getRoutingStrategy(): Promise<string | undefined>;
    setRoutingStrategy(strategy: string): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map