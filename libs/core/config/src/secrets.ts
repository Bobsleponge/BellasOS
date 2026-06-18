/**
 * Secrets backend abstraction. Secrets are referenced by id and never stored in
 * plaintext columns or logs. The env backend is used locally; a Vault/KMS
 * backend can be dropped in later without changing callers.
 */
export interface SecretsBackend {
  get(ref: string): Promise<string | undefined>;
}

/** Resolves secrets from environment variables (ref === env var name). */
export class EnvSecretsBackend implements SecretsBackend {
  async get(ref: string): Promise<string | undefined> {
    return process.env[ref];
  }
}

/**
 * HashiCorp Vault backend (KV v2). A thin, dependency-free client used when
 * SECRETS_BACKEND=vault. Falls back to env if Vault is not configured so the
 * platform still boots.
 */
export class VaultSecretsBackend implements SecretsBackend {
  constructor(
    private readonly addr = process.env.VAULT_ADDR,
    private readonly token = process.env.VAULT_TOKEN,
    private readonly mount = process.env.VAULT_MOUNT ?? 'secret',
  ) {}

  async get(ref: string): Promise<string | undefined> {
    if (!this.addr || !this.token) return process.env[ref];
    try {
      const res = await fetch(`${this.addr}/v1/${this.mount}/data/${ref}`, {
        headers: { 'x-vault-token': this.token },
      });
      if (!res.ok) return undefined;
      const json = (await res.json()) as { data?: { data?: { value?: string } } };
      return json.data?.data?.value;
    } catch {
      return undefined;
    }
  }
}

export function createSecretsBackend(
  kind: string = process.env.SECRETS_BACKEND ?? 'env',
): SecretsBackend {
  switch (kind) {
    case 'vault':
      return new VaultSecretsBackend();
    case 'env':
    default:
      return new EnvSecretsBackend();
  }
}
