import type { ProviderType } from '@bellasos/contracts';
/** In-memory cache refreshed from ConfigService + env at boot and on credential updates. */
declare class CredentialCache {
    private readonly values;
    set(provider: string, value: string | undefined): void;
    get(provider: string): string | undefined;
    isConfigured(provider: string): boolean;
}
export declare const credentialCache: CredentialCache;
export declare function refreshCredentials(getProviderCredential: (provider: string) => Promise<string | undefined>): Promise<void>;
export declare function resolveCredentialSync(provider: ProviderType): string | undefined;
export declare function isProviderConfiguredSync(provider: ProviderType): boolean;
export {};
//# sourceMappingURL=credentials.d.ts.map