/**
 * Secrets backend abstraction. Secrets are referenced by id and never stored in
 * plaintext columns or logs. The env backend is used locally; a Vault/KMS
 * backend can be dropped in later without changing callers.
 */
export interface SecretsBackend {
    get(ref: string): Promise<string | undefined>;
}
/** Resolves secrets from environment variables (ref === env var name). */
export declare class EnvSecretsBackend implements SecretsBackend {
    get(ref: string): Promise<string | undefined>;
}
/**
 * HashiCorp Vault backend (KV v2). A thin, dependency-free client used when
 * SECRETS_BACKEND=vault. Falls back to env if Vault is not configured so the
 * platform still boots.
 */
export declare class VaultSecretsBackend implements SecretsBackend {
    private readonly addr;
    private readonly token;
    private readonly mount;
    constructor(addr?: string | undefined, token?: string | undefined, mount?: string);
    get(ref: string): Promise<string | undefined>;
}
export declare function createSecretsBackend(kind?: string): SecretsBackend;
//# sourceMappingURL=secrets.d.ts.map