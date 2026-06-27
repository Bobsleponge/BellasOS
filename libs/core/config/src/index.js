"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const secrets_1 = require("./secrets");
__exportStar(require("./secrets"), exports);
const log = (0, observability_1.createLogger)({ lib: 'config' });
const AI_PROVIDER_KEYS = {
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
class ConfigService {
    secrets;
    memory = new Map();
    secretMemory = new Map();
    constructor(secrets = (0, secrets_1.createSecretsBackend)()) {
        this.secrets = secrets;
    }
    scope(namespace) {
        return {
            get: (key) => this.get(namespace, key),
            set: (key, value) => this.set(namespace, key, value),
            getSecret: (key) => this.getSecret(namespace, key),
            setSecret: (key, value) => this.setSecret(namespace, key, value),
        };
    }
    async get(namespace, key) {
        const memKey = `${namespace}:${key}`;
        if (this.memory.has(memKey))
            return this.memory.get(memKey);
        if (!(0, db_1.isDbAvailable)())
            return undefined;
        try {
            const row = await (0, db_1.getDb)()
                .selectFrom('core.config')
                .select(['value', 'is_secret'])
                .where('namespace', '=', namespace)
                .where('key', '=', key)
                .executeTakeFirst();
            if (!row || row.is_secret)
                return undefined;
            return row.value ?? undefined;
        }
        catch (err) {
            log.error('config get failed', { error: err.message });
            return undefined;
        }
    }
    async set(namespace, key, value) {
        this.memory.set(`${namespace}:${key}`, value);
        if (!(0, db_1.isDbAvailable)())
            return;
        try {
            await (0, db_1.getDb)()
                .insertInto('core.config')
                .values({
                namespace,
                key,
                value: value,
                is_secret: false,
                secret_ref: null,
            })
                .onConflict((oc) => oc.columns(['namespace', 'key']).doUpdateSet({
                value: value,
                is_secret: false,
            }))
                .execute();
        }
        catch (err) {
            log.error('config set failed', { error: err.message });
        }
    }
    /** Persist a secret to core.config (dev) and memory; never returned in plaintext via get(). */
    async setSecret(namespace, key, value) {
        const memKey = `${namespace}:${key}`;
        this.secretMemory.set(memKey, value);
        if (!(0, db_1.isDbAvailable)())
            return;
        try {
            await (0, db_1.getDb)()
                .insertInto('core.config')
                .values({
                namespace,
                key,
                value: { v: value },
                is_secret: true,
                secret_ref: `${namespace}:${key}`,
            })
                .onConflict((oc) => oc.columns(['namespace', 'key']).doUpdateSet({
                value: { v: value },
                is_secret: true,
            }))
                .execute();
        }
        catch (err) {
            log.error('config setSecret failed', { error: err.message });
        }
    }
    /** Secret values: memory → DB → env ref fallback. */
    async getSecret(namespace, key) {
        const memKey = `${namespace}:${key}`;
        if (this.secretMemory.has(memKey))
            return this.secretMemory.get(memKey);
        if ((0, db_1.isDbAvailable)()) {
            try {
                const row = await (0, db_1.getDb)()
                    .selectFrom('core.config')
                    .select(['value', 'is_secret'])
                    .where('namespace', '=', namespace)
                    .where('key', '=', key)
                    .executeTakeFirst();
                if (row?.is_secret && row.value && typeof row.value === 'object') {
                    const v = row.value.v;
                    if (v) {
                        this.secretMemory.set(memKey, v);
                        return v;
                    }
                }
            }
            catch (err) {
                log.error('config getSecret db failed', { error: err.message });
            }
        }
        const ref = (await this.get(namespace, `${key}__ref`)) ?? key;
        return this.secrets.get(ref);
    }
    async deleteSecret(namespace, key) {
        this.secretMemory.delete(`${namespace}:${key}`);
        if (!(0, db_1.isDbAvailable)())
            return;
        try {
            await (0, db_1.getDb)()
                .deleteFrom('core.config')
                .where('namespace', '=', namespace)
                .where('key', '=', key)
                .execute();
        }
        catch (err) {
            log.error('config deleteSecret failed', { error: err.message });
        }
    }
    /** Resolve AI provider credential: UI-stored secret first, then env var. */
    async getProviderCredential(provider) {
        const fromConfig = await this.getSecret('ai', `${provider}.credential`);
        if (fromConfig)
            return fromConfig;
        const envKey = AI_PROVIDER_KEYS[provider];
        if (envKey)
            return process.env[envKey] || undefined;
        return undefined;
    }
    async setProviderCredential(provider, value) {
        await this.setSecret('ai', `${provider}.credential`, value);
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)()
                    .updateTable('ai.providers')
                    .set({ credentials_ref: `ai:${provider}.credential` })
                    .where('id', '=', provider)
                    .execute();
            }
            catch {
                /* best-effort */
            }
        }
    }
    async getRoutingStrategy() {
        return this.get('ai', 'routingStrategy');
    }
    async setRoutingStrategy(strategy) {
        await this.set('ai', 'routingStrategy', strategy);
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=index.js.map