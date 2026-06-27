import { type JWTPayload } from 'jose';
/** Claims carried by a BellasOS access token (dev) / mapped from Keycloak. */
export interface BellasClaims extends JWTPayload {
    sub: string;
    email?: string;
    name?: string;
    roles?: string[];
}
/** Mint a local dev token (HS256). Only used when AUTH_MODE=dev. */
export declare function mintDevToken(claims: {
    sub: string;
    email?: string;
    name?: string;
    roles?: string[];
}, secret: string, expiresIn?: string): Promise<string>;
export declare function verifyDevToken(token: string, secret: string): Promise<BellasClaims>;
/** Verify a Keycloak-issued OIDC token via the realm JWKS endpoint. */
export declare function verifyKeycloakToken(token: string, issuerUrl: string): Promise<BellasClaims>;
//# sourceMappingURL=tokens.d.ts.map