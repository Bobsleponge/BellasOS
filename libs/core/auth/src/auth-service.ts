import type { Principal } from '@bellasos/contracts';
import { BellasError, ErrorCode } from '@bellasos/contracts';
import { createLogger } from '@bellasos/observability';
import { RbacService } from './rbac';
import {
  mintDevToken,
  mintEmbedToken,
  verifyDevToken,
  verifyKeycloakToken,
  type BellasClaims,
} from './tokens';

const log = createLogger({ lib: 'auth' });

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
export class AuthService {
  private readonly rbac = new RbacService();

  constructor(private readonly config: AuthConfig) {}

  async issueDevToken(claims: {
    sub: string;
    email?: string;
    name?: string;
    roles?: string[];
  }): Promise<string> {
    if (this.config.mode !== 'dev') {
      throw new BellasError(
        ErrorCode.AuthzDenied,
        'Dev tokens are disabled outside dev mode',
      );
    }
    return mintDevToken(claims, this.config.jwtSecret);
  }

  /** Mint a short-lived token so Finance-Tracker can establish a session from BellasOS identity. */
  async issueEmbedToken(principal: Principal, expiresIn = '5m'): Promise<string> {
    const secret =
      process.env.BELLASOS_EMBED_SECRET?.trim() || this.config.jwtSecret;
    const email =
      typeof principal.attributes?.email === 'string'
        ? principal.attributes.email
        : undefined;
    return mintEmbedToken(
      { sub: principal.id, email, name: principal.displayName },
      secret,
      expiresIn,
    );
  }

  async authenticate(token: string): Promise<Principal> {
    let claims: BellasClaims;
    try {
      claims =
        this.config.mode === 'keycloak' && this.config.keycloakIssuerUrl
          ? await verifyKeycloakToken(token, this.config.keycloakIssuerUrl)
          : await verifyDevToken(token, this.config.jwtSecret);
    } catch (err) {
      log.warn('token verification failed', { error: (err as Error).message });
      throw new BellasError(ErrorCode.Unauthenticated, 'Invalid token');
    }

    const roles = claims.roles ?? [];
    const permissions = await this.rbac.permissionsForRoles(roles);
    return {
      id: claims.sub,
      type: 'user',
      displayName: claims.name ?? claims.email ?? claims.sub,
      roles,
      permissions,
      attributes: { email: claims.email },
    };
  }
}
