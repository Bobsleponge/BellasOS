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

export function resolveExternalAppEnv(prefix: string): ExternalAppEnvConfig {
  const baseUrl =
    process.env[`${prefix}_URL`] ??
    process.env[`NEXT_PUBLIC_${prefix}_URL`] ??
    '';
  const apiKey = process.env[`${prefix}_API_KEY`];
  return { baseUrl, apiKey };
}

export class ApiKeyHttpClient {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly appName?: string;

  constructor(options: ApiKeyHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.appName = options.appName;
  }

  static fromEnv(prefix: string, appName?: string): ApiKeyHttpClient {
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

  private authHeaders(): Record<string, string> {
    if (!this.apiKey) return {};
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'X-Api-Key': this.apiKey,
    };
  }

  async request<T = unknown>(path: string, options: ApiKeyRequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const auth = options.auth ?? true;
    const headers: Record<string, string> = {
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
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }

    if (!res.ok) {
      const detail =
        typeof json === 'object' && json && 'message' in json
          ? String((json as { message: string }).message)
          : text;
      throw new Error(`${this.appName ?? 'External app'} ${method} ${path} failed (${res.status}): ${detail}`);
    }

    return json as T;
  }

  async verifyConnection(): Promise<{ ok: boolean; service?: string; user?: unknown }> {
    return this.request('/api/service/connection');
  }
}
