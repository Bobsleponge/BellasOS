/**
 * Shared client for BellasOS external app integrations.
 * Env: {PREFIX}_URL and {PREFIX}_API_KEY (e.g. FINANCE_TRACKER_API_KEY)
 */
export interface ExternalAppEnvConfig {
    baseUrl: string;
    apiKey?: string;
}
export interface ApiKeyHttpClientOptions {
    baseUrl: string;
    apiKey?: string;
    appName?: string;
}
export interface ApiKeyRequestOptions {
    method?: string;
    body?: unknown;
    auth?: boolean;
    headers?: Record<string, string>;
}
export declare function resolveExternalAppEnv(prefix: string): ExternalAppEnvConfig;
export declare class ApiKeyHttpClient {
    readonly baseUrl: string;
    readonly apiKey?: string;
    readonly appName?: string;
    constructor(options: ApiKeyHttpClientOptions);
    static fromEnv(prefix: string, appName?: string): ApiKeyHttpClient;
    get config(): {
        baseUrl: string;
        appName: string | undefined;
        hasApiKey: boolean;
    };
    private authHeaders;
    request<T = unknown>(path: string, options?: ApiKeyRequestOptions): Promise<T>;
    verifyConnection(): Promise<{
        ok: boolean;
        service?: string;
        user?: unknown;
    }>;
}
//# sourceMappingURL=index.d.ts.map