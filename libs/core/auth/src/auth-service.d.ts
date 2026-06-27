import type { Principal } from '@bellasos/contracts';
export type AuthMode = 'dev' | 'keycloak';
export interface AuthConfig {
    mode: AuthMode;
    jwtSecret: string;
    keycloakIssuerUrl?: string;
}
/**
 * Authenticates tokens into Principals. In `dev` mode it mints/accepts a local
 * HS256 token (no Keycloak needed). In `keycloak` mode it verifies OIDC tokens
 * against the realm JWKS. Roles are expanded to permissions via RBAC.
 */
export declare class AuthService {
    private readonly config;
    private readonly rbac;
    constructor(config: AuthConfig);
    issueDevToken(claims: {
        sub: string;
        email?: string;
        name?: string;
        roles?: string[];
    }): Promise<string>;
    authenticate(token: string): Promise<Principal>;
}
//# sourceMappingURL=auth-service.d.ts.map