"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintDevToken = mintDevToken;
exports.verifyDevToken = verifyDevToken;
exports.verifyKeycloakToken = verifyKeycloakToken;
const jose_1 = require("jose");
/** Mint a local dev token (HS256). Only used when AUTH_MODE=dev. */
async function mintDevToken(claims, secret, expiresIn = '12h') {
    const key = new TextEncoder().encode(secret);
    return new jose_1.SignJWT({
        email: claims.email,
        name: claims.name,
        roles: claims.roles ?? [],
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(claims.sub)
        .setIssuedAt()
        .setIssuer('bellasos-dev')
        .setExpirationTime(expiresIn)
        .sign(key);
}
async function verifyDevToken(token, secret) {
    const key = new TextEncoder().encode(secret);
    const { payload } = await (0, jose_1.jwtVerify)(token, key, { issuer: 'bellasos-dev' });
    return payload;
}
/** Verify a Keycloak-issued OIDC token via the realm JWKS endpoint. */
async function verifyKeycloakToken(token, issuerUrl) {
    const jwks = (0, jose_1.createRemoteJWKSet)(new URL(`${issuerUrl}/protocol/openid-connect/certs`));
    const { payload } = await (0, jose_1.jwtVerify)(token, jwks, { issuer: issuerUrl });
    // Keycloak nests realm roles under realm_access.roles.
    const realmAccess = payload['realm_access'];
    return {
        ...payload,
        sub: payload.sub,
        roles: realmAccess?.roles ?? [],
    };
}
//# sourceMappingURL=tokens.js.map