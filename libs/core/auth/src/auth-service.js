"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const contracts_1 = require("@bellasos/contracts");
const observability_1 = require("@bellasos/observability");
const rbac_1 = require("./rbac");
const tokens_1 = require("./tokens");
const log = (0, observability_1.createLogger)({ lib: 'auth' });
/**
 * Authenticates tokens into Principals. In `dev` mode it mints/accepts a local
 * HS256 token (no Keycloak needed). In `keycloak` mode it verifies OIDC tokens
 * against the realm JWKS. Roles are expanded to permissions via RBAC.
 */
class AuthService {
    config;
    rbac = new rbac_1.RbacService();
    constructor(config) {
        this.config = config;
    }
    async issueDevToken(claims) {
        if (this.config.mode !== 'dev') {
            throw new contracts_1.BellasError(contracts_1.ErrorCode.AuthzDenied, 'Dev tokens are disabled outside dev mode');
        }
        return (0, tokens_1.mintDevToken)(claims, this.config.jwtSecret);
    }
    async authenticate(token) {
        let claims;
        try {
            claims =
                this.config.mode === 'keycloak' && this.config.keycloakIssuerUrl
                    ? await (0, tokens_1.verifyKeycloakToken)(token, this.config.keycloakIssuerUrl)
                    : await (0, tokens_1.verifyDevToken)(token, this.config.jwtSecret);
        }
        catch (err) {
            log.warn('token verification failed', { error: err.message });
            throw new contracts_1.BellasError(contracts_1.ErrorCode.Unauthenticated, 'Invalid token');
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
exports.AuthService = AuthService;
//# sourceMappingURL=auth-service.js.map