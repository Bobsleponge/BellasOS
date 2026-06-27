import {
  SignJWT,
  jwtVerify,
  createRemoteJWKSet,
  type JWTPayload,
} from 'jose';

/** Claims carried by a BellasOS access token (dev) / mapped from Keycloak. */
export interface BellasClaims extends JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
}

/** Mint a local dev token (HS256). Only used when AUTH_MODE=dev. */
export async function mintDevToken(
  claims: { sub: string; email?: string; name?: string; roles?: string[] },
  secret: string,
  expiresIn = '12h',
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({
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

export async function verifyDevToken(
  token: string,
  secret: string,
): Promise<BellasClaims> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, { issuer: 'bellasos-dev' });
  return payload as BellasClaims;
}

const EMBED_AUDIENCE = 'bellasos-finance-embed';

/** Short-lived token for Wealth iframe SSO (Finance-Tracker exchange). */
export async function mintEmbedToken(
  claims: { sub: string; email?: string; name?: string },
  secret: string,
  expiresIn = '5m',
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    aud: EMBED_AUDIENCE,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('bellasos-dev')
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyEmbedToken(
  token: string,
  secret: string,
): Promise<BellasClaims> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, {
    issuer: 'bellasos-dev',
    audience: EMBED_AUDIENCE,
  });
  return payload as BellasClaims;
}

/** Verify a Keycloak-issued OIDC token via the realm JWKS endpoint. */
export async function verifyKeycloakToken(
  token: string,
  issuerUrl: string,
): Promise<BellasClaims> {
  const jwks = createRemoteJWKSet(
    new URL(`${issuerUrl}/protocol/openid-connect/certs`),
  );
  const { payload } = await jwtVerify(token, jwks, { issuer: issuerUrl });
  // Keycloak nests realm roles under realm_access.roles.
  const realmAccess = payload['realm_access'] as
    | { roles?: string[] }
    | undefined;
  return {
    ...payload,
    sub: payload.sub as string,
    roles: realmAccess?.roles ?? [],
  } as BellasClaims;
}
