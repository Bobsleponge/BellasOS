"use strict";
/**
 * Shared client for BellasOS external app integrations.
 * Env: {PREFIX}_URL and {PREFIX}_API_KEY (e.g. FINANCE_TRACKER_API_KEY)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyHttpClient = void 0;
exports.resolveExternalAppEnv = resolveExternalAppEnv;
function resolveExternalAppEnv(prefix) {
    const baseUrl = process.env[`${prefix}_URL`] ??
        process.env[`NEXT_PUBLIC_${prefix}_URL`] ??
        '';
    const apiKey = process.env[`${prefix}_API_KEY`];
    return { baseUrl, apiKey };
}
class ApiKeyHttpClient {
    baseUrl;
    apiKey;
    appName;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.appName = options.appName;
    }
    static fromEnv(prefix, appName) {
        const { baseUrl, apiKey } = resolveExternalAppEnv(prefix);
        if (!baseUrl) {
            throw new Error(`Missing ${prefix}_URL environment variable`);
        }
        return new ApiKeyHttpClient({ baseUrl, apiKey, appName });
    }
    get config() {
        return {
            baseUrl: this.baseUrl,
            appName: this.appName,
            hasApiKey: Boolean(this.apiKey),
        };
    }
    authHeaders() {
        if (!this.apiKey)
            return {};
        return {
            Authorization: `Bearer ${this.apiKey}`,
            'X-Api-Key': this.apiKey,
        };
    }
    async request(path, options = {}) {
        const method = options.method ?? 'GET';
        const auth = options.auth ?? true;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
            ...(auth ? this.authHeaders() : {}),
        };
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: options.body != null ? JSON.stringify(options.body) : undefined,
        });
        const text = await res.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch {
            json = text;
        }
        if (!res.ok) {
            const detail = typeof json === 'object' && json && 'message' in json
                ? String(json.message)
                : text;
            throw new Error(`${this.appName ?? 'External app'} ${method} ${path} failed (${res.status}): ${detail}`);
        }
        return json;
    }
    async verifyConnection() {
        return this.request('/api/service/connection');
    }
}
exports.ApiKeyHttpClient = ApiKeyHttpClient;
//# sourceMappingURL=index.js.map