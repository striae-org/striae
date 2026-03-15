interface Env {
  API_TOKEN: string;
  ACCOUNT_ID: string;
  HMAC_KEY: string;
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

interface CloudflareImagesResponse {
  success: boolean;
  errors?: Array<{
    code: number;
    message: string;
  }>;
  messages?: string[];
  result?: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
}

interface ErrorResponse {
  error: string;
}

type APIResponse = CloudflareImagesResponse | ErrorResponse | string;

const API_BASE = "https://api.cloudflare.com/client/v4/accounts";

/**
 * CORS headers to allow requests from the Striae app
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

const createResponse = (data: APIResponse, status: number = 200): Response => new Response(
  typeof data === 'string' ? data : JSON.stringify(data), 
  { status, headers: corsHeaders }
);

const hasValidToken = (request: Request, env: Env): boolean => {
  const authHeader = request.headers.get("Authorization");
  const expectedToken = `Bearer ${env.API_TOKEN}`;
  return authHeader === expectedToken;
};

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
  if (hasValidToken(request, env)) {
    return true;
  }

  return validateCloudflareAccessJwt(request, env);
};

/**
 * Handle image upload requests
 */
async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  if (!(await isRequestAuthorized(request, env))) {
    return createResponse({ error: 'Unauthorized' }, 403);
  }

  const formData = await request.formData();
  const endpoint = `${API_BASE}/${env.ACCOUNT_ID}/images/v1`;

  // Add requireSignedURLs to form data
  formData.append('requireSignedURLs', 'true');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.API_TOKEN}`,
    },
    body: formData
  });
  
  const data: CloudflareImagesResponse = await response.json();
  return createResponse(data, response.status);
}

/**
 * Handle image delete requests
 */
async function handleImageDelete(request: Request, env: Env): Promise<Response> {
  if (!(await isRequestAuthorized(request, env))) {
    return createResponse({ error: 'Unauthorized' }, 403);
  }

  const url = new URL(request.url);
  const imageId = url.pathname.split('/').pop();
  
  if (!imageId) {
    return createResponse({ error: 'Image ID is required' }, 400);
  }
  
  const endpoint = `${API_BASE}/${env.ACCOUNT_ID}/images/v1/${imageId}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${env.API_TOKEN}`,
    }
  });
  
  const data: CloudflareImagesResponse = await response.json();
  return createResponse(data, response.status);
}

/**
 * Handle Signed URL generation
 */
const EXPIRATION = 60 * 60; // 1 hour

const bufferToHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');

async function generateSignedUrl(url: URL, env: Env): Promise<Response> {
  const encoder = new TextEncoder();
  const secretKeyData = encoder.encode(env.HMAC_KEY);
  const key = await crypto.subtle.importKey(
    'raw',
    secretKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Add expiration
  const expiry = Math.floor(Date.now() / 1000) + EXPIRATION;
  url.searchParams.set('exp', expiry.toString());

  const stringToSign = url.pathname + '?' + url.searchParams.toString();
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign));
  const sig = bufferToHex(mac);

  // Add signature
  url.searchParams.set('sig', sig);

  // Return the modified URL with signature and expiration
  return new Response(url.toString(), {
    headers: corsHeaders
  });
}

async function handleImageServing(request: Request, env: Env): Promise<Response> {
  if (!(await isRequestAuthorized(request, env))) {
    return createResponse({ error: 'Unauthorized' }, 403);
  }

  const url = new URL(request.url);
  const pathWithoutSlash = url.pathname.slice(1);
  const imageDeliveryURL = new URL(
    pathWithoutSlash.replace('https:/imagedelivery.net', 'https://imagedelivery.net')
  );
  
  return generateSignedUrl(imageDeliveryURL, env);
}

/**
 * Main worker functions
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (request.method) {
        case 'POST':
          return handleImageUpload(request, env);
        case 'GET':
          return handleImageServing(request, env);
        case 'DELETE':
          return handleImageDelete(request, env);
        default:
          return createResponse({ error: 'Method not allowed' }, 405);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return createResponse({ error: errorMessage }, 500);
    }
  }
};