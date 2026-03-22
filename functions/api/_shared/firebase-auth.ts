interface FirebaseJwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface FirebaseJwtPayload {
  aud?: string;
  iss?: string;
  sub?: string;
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  iat?: number;
  exp?: number;
}

interface GoogleJwksResponse {
  keys?: Array<JsonWebKey & { kid?: string; kty?: string }>;
}

export interface VerifiedFirebaseIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

const GOOGLE_SECURETOKEN_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const DEFAULT_JWKS_CACHE_SECONDS = 300;
const CLOCK_SKEW_SECONDS = 300;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let cachedJwks: GoogleJwksResponse | null = null;
let cachedJwksExpiresAt = 0;

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = normalized + '='.repeat(paddingLength);
  const binary = atob(padded);

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function decodeJsonSegment<T>(segment: string): T | null {
  try {
    const decoded = textDecoder.decode(base64UrlToBytes(segment));
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function resolveJwksCacheSeconds(cacheControl: string | null): number {
  if (!cacheControl) {
    return DEFAULT_JWKS_CACHE_SECONDS;
  }

  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  if (!maxAgeMatch) {
    return DEFAULT_JWKS_CACHE_SECONDS;
  }

  const parsed = Number.parseInt(maxAgeMatch[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_JWKS_CACHE_SECONDS;
}

async function getSecureTokenJwks(): Promise<GoogleJwksResponse | null> {
  if (cachedJwks && Date.now() < cachedJwksExpiresAt) {
    return cachedJwks;
  }

  let response: Response;
  try {
    response = await fetch(GOOGLE_SECURETOKEN_JWKS_URL, { method: 'GET' });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as GoogleJwksResponse | null;
  if (!payload?.keys || !Array.isArray(payload.keys) || payload.keys.length === 0) {
    return null;
  }

  const cacheSeconds = resolveJwksCacheSeconds(response.headers.get('Cache-Control'));
  cachedJwks = payload;
  cachedJwksExpiresAt = Date.now() + cacheSeconds * 1000;

  return payload;
}

async function verifyTokenSignature(
  headerSegment: string,
  payloadSegment: string,
  signatureSegment: string,
  jwtHeader: FirebaseJwtHeader
): Promise<boolean> {
  if (jwtHeader.alg !== 'RS256' || typeof jwtHeader.kid !== 'string' || jwtHeader.kid.length === 0) {
    return false;
  }

  const jwks = await getSecureTokenJwks();
  const verificationJwk = jwks?.keys?.find(
    (candidate) => candidate.kid === jwtHeader.kid && candidate.kty === 'RSA'
  );
  if (!verificationJwk) {
    return false;
  }

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      verificationJwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['verify']
    );
  } catch {
    return false;
  }

  const signedContent = new Uint8Array(textEncoder.encode(`${headerSegment}.${payloadSegment}`));
  const signatureBytes = new Uint8Array(base64UrlToBytes(signatureSegment));

  try {
    return await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      cryptoKey,
      signatureBytes,
      signedContent
    );
  } catch {
    return false;
  }
}

function validateTokenClaims(payload: FirebaseJwtPayload, env: Env): boolean {
  const configuredProjectId = typeof env.PROJECT_ID === 'string' ? env.PROJECT_ID.trim() : '';
  if (configuredProjectId.length === 0) {
    return false;
  }

  if (typeof payload.aud !== 'string' || payload.aud !== configuredProjectId) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${payload.aud}`;

  if (payload.iss !== expectedIssuer) {
    return false;
  }

  if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    return false;
  }

  if (typeof payload.exp !== 'number' || payload.exp < nowSeconds - CLOCK_SKEW_SECONDS) {
    return false;
  }

  if (typeof payload.iat !== 'number' || payload.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    return false;
  }

  return true;
}

function extractBearerToken(request: Request): string | null {
  const authorizationHeader = request.headers.get('Authorization');
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  const normalizedToken = token.trim();
  return normalizedToken.length > 0 ? normalizedToken : null;
}

export async function verifyFirebaseIdentityFromRequest(
  request: Request,
  env: Env
): Promise<VerifiedFirebaseIdentity | null> {
  const idToken = extractBearerToken(request);
  if (!idToken) {
    return null;
  }

  const tokenSegments = idToken.split('.');
  if (tokenSegments.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signatureSegment] = tokenSegments;
  const jwtHeader = decodeJsonSegment<FirebaseJwtHeader>(headerSegment);
  const jwtPayload = decodeJsonSegment<FirebaseJwtPayload>(payloadSegment);

  if (!jwtHeader || !jwtPayload) {
    return null;
  }

  const signatureValid = await verifyTokenSignature(
    headerSegment,
    payloadSegment,
    signatureSegment,
    jwtHeader
  );
  if (!signatureValid) {
    return null;
  }

  if (!validateTokenClaims(jwtPayload, env)) {
    return null;
  }

  const uid =
    (typeof jwtPayload.user_id === 'string' && jwtPayload.user_id.trim().length > 0
      ? jwtPayload.user_id
      : jwtPayload.sub) ||
    null;
  if (!uid) {
    return null;
  }

  return {
    uid,
    email: typeof jwtPayload.email === 'string' ? jwtPayload.email : null,
    emailVerified: jwtPayload.email_verified === true
  };
}
