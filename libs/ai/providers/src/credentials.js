"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialCache = void 0;
exports.refreshCredentials = refreshCredentials;
exports.resolveCredentialSync = resolveCredentialSync;
exports.isProviderConfiguredSync = isProviderConfiguredSync;
const ENV_KEYS = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    ollama: 'OLLAMA_BASE_URL',
};
/** In-memory cache refreshed from ConfigService + env at boot and on credential updates. */
class CredentialCache {
    values = new Map();
    set(provider, value) {
        if (value)
            this.values.set(provider, value);
        else
            this.values.delete(provider);
    }
    get(provider) {
        return this.values.get(provider) ?? process.env[ENV_KEYS[provider] ?? ''] ?? undefined;
    }
    isConfigured(provider) {
        return Boolean(this.get(provider));
    }
}
exports.credentialCache = new CredentialCache();
async function refreshCredentials(getProviderCredential) {
    for (const p of Object.keys(ENV_KEYS)) {
        const v = await getProviderCredential(p);
        exports.credentialCache.set(p, v);
    }
}
function resolveCredentialSync(provider) {
    return exports.credentialCache.get(provider);
}
function isProviderConfiguredSync(provider) {
    if (provider === 'mock')
        return true;
    return exports.credentialCache.isConfigured(provider);
}
//# sourceMappingURL=credentials.js.map