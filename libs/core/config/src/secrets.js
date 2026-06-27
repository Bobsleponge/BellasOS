"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultSecretsBackend = exports.EnvSecretsBackend = void 0;
exports.createSecretsBackend = createSecretsBackend;
/** Resolves secrets from environment variables (ref === env var name). */
class EnvSecretsBackend {
    async get(ref) {
        return process.env[ref];
    }
}
exports.EnvSecretsBackend = EnvSecretsBackend;
/**
 * HashiCorp Vault backend (KV v2). A thin, dependency-free client used when
 * SECRETS_BACKEND=vault. Falls back to env if Vault is not configured so the
 * platform still boots.
 */
class VaultSecretsBackend {
    addr;
    token;
    mount;
    constructor(addr = process.env.VAULT_ADDR, token = process.env.VAULT_TOKEN, mount = process.env.VAULT_MOUNT ?? 'secret') {
        this.addr = addr;
        this.token = token;
        this.mount = mount;
    }
    async get(ref) {
        if (!this.addr || !this.token)
            return process.env[ref];
        try {
            const res = await fetch(`${this.addr}/v1/${this.mount}/data/${ref}`, {
                headers: { 'x-vault-token': this.token },
            });
            if (!res.ok)
                return undefined;
            const json = (await res.json());
            return json.data?.data?.value;
        }
        catch {
            return undefined;
        }
    }
}
exports.VaultSecretsBackend = VaultSecretsBackend;
function createSecretsBackend(kind = process.env.SECRETS_BACKEND ?? 'env') {
    switch (kind) {
        case 'vault':
            return new VaultSecretsBackend();
        case 'env':
        default:
            return new EnvSecretsBackend();
    }
}
//# sourceMappingURL=secrets.js.map