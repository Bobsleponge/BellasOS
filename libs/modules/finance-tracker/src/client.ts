import { ApiKeyHttpClient, resolveExternalAppEnv } from '@bellasos/core-external-apps';

export interface FinanceTrackerClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

export class FinanceTrackerClient extends ApiKeyHttpClient {
  constructor(config: FinanceTrackerClientConfig = {}) {
    const env = resolveExternalAppEnv('FINANCE_TRACKER');
    super({
      baseUrl: config.baseUrl ?? env.baseUrl ?? 'http://localhost:5000',
      apiKey: config.apiKey ?? env.apiKey,
      appName: 'Finance-Tracker',
    });
  }

  get config() {
    return {
      ...super.config,
      authMode: this.apiKey ? 'api_key' : 'none',
    };
  }

  async ping(): Promise<{ ok: boolean; database?: unknown }> {
    return this.request('/api/health/database', { auth: false });
  }

  async verifyConnection() {
    if (!this.apiKey) {
      throw new Error(
        'Finance-Tracker API key is not configured. Add it in Command Centre → Portfolio.',
      );
    }
    return super.verifyConnection();
  }
}

export function createFinanceTrackerClient(config: FinanceTrackerClientConfig = {}) {
  return new FinanceTrackerClient(config);
}
