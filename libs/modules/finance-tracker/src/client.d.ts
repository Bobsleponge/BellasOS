import { ApiKeyHttpClient } from '@bellasos/core-external-apps';
export interface FinanceTrackerClientConfig {
    baseUrl?: string;
    apiKey?: string;
}
export declare class FinanceTrackerClient extends ApiKeyHttpClient {
    constructor(config?: FinanceTrackerClientConfig);
    get config(): {
        authMode: string;
        baseUrl: string;
        appName: string | undefined;
        hasApiKey: boolean;
    };
    ping(): Promise<{
        ok: boolean;
        database?: unknown;
    }>;
    verifyConnection(): Promise<{
        ok: boolean;
        service?: string;
        user?: unknown;
    }>;
}
export declare function createFinanceTrackerClient(config?: FinanceTrackerClientConfig): FinanceTrackerClient;
//# sourceMappingURL=client.d.ts.map