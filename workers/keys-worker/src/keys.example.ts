interface Env {
  R2_KEY_SECRET: string;
  ACCOUNT_HASH: string;
  IMAGES_API_TOKEN: string;
  USER_DB_AUTH: string;
  PDF_WORKER_AUTH: string;
  KEYS_AUTH: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_JWKS_URL?: string;
}

interface AccessJwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface AccessJwtPayload {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
}

interface AccessJwksResponse {
  keys?: Array<JsonWebKey & { kid?: string; kty?: string }>;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'text/plain'
};

const hasValidHeader = (request: Request, env: Env): boolean => 
  request.headers.get("X-Custom-Auth-Key") === env.KEYS_AUTH;

const ACCESS_JWT_HEADER_NAME = 'CF-Access-Jwt-Assertion';
const ACCESS_JWKS_CACHE_SECONDS = 300;
const ACCESS_CLOCK_SKEW_SECONDS = 60;
const accessJwtDecoder = new TextDecoder();
const accessJwtEncoder = new TextEncoder();
let cachedAccessJwks: AccessJwksResponse | null = null;
let cachedAccessJwksExpiresAt = 0;

function getAccessValidationConfig(env: Env): { aud: string; jwksUrl: string } | null {
  const aud = typeof env.CF_ACCESS_AUD === 'string' ? env.CF_ACCESS_AUD.trim() : '';
  const jwksUrl = typeof env.CF_ACCESS_JWKS_URL === 'string' ? env.CF_ACCESS_JWKS_URL.trim() : '';

  if (!aud && !jwksUrl) {
    return null;
  }

  if (!aud || !jwksUrl) {
    return null;
  }

  return { aud, jwksUrl };
}

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

function decodeJwtSegment<T>(segment: string): T | null {
  try {
    const decoded = accessJwtDecoder.decode(base64UrlToBytes(segment));
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

function resolveCacheTtlSeconds(cacheControl: string | null): number {
  if (!cacheControl) {
    return ACCESS_JWKS_CACHE_SECONDS;
  }

  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  if (!maxAgeMatch) {
    return ACCESS_JWKS_CACHE_SECONDS;
  }

  const parsed = Number.parseInt(maxAgeMatch[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : ACCESS_JWKS_CACHE_SECONDS;
}

async function fetchAccessJwks(jwksUrl: string): Promise<AccessJwksResponse | null> {
  if (cachedAccessJwks && Date.now() < cachedAccessJwksExpiresAt) {
    return cachedAccessJwks;
  }

  let response: Response;
  try {
    response = await fetch(jwksUrl, { method: 'GET' });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as AccessJwksResponse | null;
  if (!payload?.keys || !Array.isArray(payload.keys) || payload.keys.length === 0) {
    return null;
  }

  const cacheSeconds = resolveCacheTtlSeconds(response.headers.get('Cache-Control'));
  cachedAccessJwks = payload;
  cachedAccessJwksExpiresAt = Date.now() + cacheSeconds * 1000;

  return payload;
}

async function verifyAccessJwtSignature(
  headerSegment: string,
  payloadSegment: string,
  signatureSegment: string,
  jwtHeader: AccessJwtHeader,
  jwksUrl: string
): Promise<boolean> {
  if (jwtHeader.alg !== 'RS256' || typeof jwtHeader.kid !== 'string' || jwtHeader.kid.length === 0) {
    return false;
  }

  const jwks = await fetchAccessJwks(jwksUrl);
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

  const signedContent = new Uint8Array(accessJwtEncoder.encode(`${headerSegment}.${payloadSegment}`));
  const signatureBytes = base64UrlToBytes(signatureSegment);

  try {
    return await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      cryptoKey,
      signatureBytes as BufferSource,
      signedContent
    );
  } catch {
    return false;
  }
}

function hasExpectedAccessAudience(payload: AccessJwtPayload, expectedAudience: string): boolean {
  if (typeof payload.aud === 'string') {
    return payload.aud === expectedAudience;
  }

  if (Array.isArray(payload.aud)) {
    return payload.aud.includes(expectedAudience);
  }

  return false;
}

function hasValidAccessJwtClaims(payload: AccessJwtPayload, expectedAudience: string, jwksUrl: string): boolean {
  if (!hasExpectedAccessAudience(payload, expectedAudience)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof payload.exp !== 'number' || payload.exp < nowSeconds - ACCESS_CLOCK_SKEW_SECONDS) {
    return false;
  }

  if (typeof payload.iat === 'number' && payload.iat > nowSeconds + ACCESS_CLOCK_SKEW_SECONDS) {
    return false;
  }

  if (typeof payload.nbf === 'number' && payload.nbf > nowSeconds + ACCESS_CLOCK_SKEW_SECONDS) {
    return false;
  }

  try {
    const expectedIssuer = new URL(jwksUrl).origin;
    if (typeof payload.iss !== 'string' || payload.iss !== expectedIssuer) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

async function validateCloudflareAccessJwt(request: Request, env: Env): Promise<boolean> {
  const config = getAccessValidationConfig(env);
  if (!config) {
    return true;
  }

  const accessJwt = request.headers.get(ACCESS_JWT_HEADER_NAME);
  if (!accessJwt) {
    return false;
  }

  const tokenSegments = accessJwt.split('.');
  if (tokenSegments.length !== 3) {
    return false;
  }

  const [headerSegment, payloadSegment, signatureSegment] = tokenSegments;
  const jwtHeader = decodeJwtSegment<AccessJwtHeader>(headerSegment);
  const jwtPayload = decodeJwtSegment<AccessJwtPayload>(payloadSegment);

  if (!jwtHeader || !jwtPayload) {
    return false;
  }

  const signatureValid = await verifyAccessJwtSignature(
    headerSegment,
    payloadSegment,
    signatureSegment,
    jwtHeader,
    config.jwksUrl
  );
  if (!signatureValid) {
    return false;
  }

  return hasValidAccessJwtClaims(jwtPayload, config.aud, config.jwksUrl);
}

const isRequestAuthorized = async (request: Request, env: Env): Promise<boolean> => {
  if (hasValidHeader(request, env)) {
    return true;
  }

  return validateCloudflareAccessJwt(request, env);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!(await isRequestAuthorized(request, env))) {
      return new Response('Forbidden', { 
        status: 403,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace('/', '');
    
    // Handle regular key retrieval
    if (request.method === 'GET') {
      const keyName = path;
      
      if (!keyName) {
        return new Response('Key name required', { 
          status: 400,
          headers: corsHeaders 
        });
      }

      if (!(keyName in env)) {
        return new Response('Key not found', { 
          status: 404,
          headers: corsHeaders 
        });
      }

      // Type assertion needed here since TypeScript doesn't know that keyName exists in env
      const keyValue = env[keyName as keyof Env];
      
      return new Response(keyValue, {
        headers: corsHeaders
      });
    }

    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }
};