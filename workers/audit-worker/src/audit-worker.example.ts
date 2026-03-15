interface Env {
  R2_KEY_SECRET: string;
  STRIAE_AUDIT: R2Bucket;
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

interface AuditEntry {
  timestamp: string;
  userId: string;
  action: string;
  // Optional metadata fields that can be included
  [key: string]: unknown;
}

interface SuccessResponse {
  success: boolean;
  entryCount?: number;
  filename?: string;
}

interface ErrorResponse {
  error: string;
}

interface AuditRetrievalResponse {
  entries: AuditEntry[];
  total: number;
}

type APIResponse = SuccessResponse | ErrorResponse | AuditRetrievalResponse;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

const createResponse = (data: APIResponse, status: number = 200): Response => new Response(
  JSON.stringify(data), 
  { status, headers: corsHeaders }
);

const hasValidHeader = (request: Request, env: Env): boolean => 
  request.headers.get("X-Custom-Auth-Key") === env.R2_KEY_SECRET;

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
  if (!hasValidHeader(request, env)) {
    return false;
  }

  return validateCloudflareAccessJwt(request, env);
};

// Helper function to generate audit file names with user and date
const generateAuditFileName = (userId: string): string => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `audit-trails/${userId}/${date}.json`;
};

// Helper function to append audit entry to existing file
const appendAuditEntry = async (bucket: R2Bucket, filename: string, newEntry: AuditEntry): Promise<number> => {
  try {
    const existingFile = await bucket.get(filename);
    let entries: AuditEntry[] = [];
    
    if (existingFile) {
      const existingData = await existingFile.text();
      entries = JSON.parse(existingData);
    }
    
    entries.push(newEntry);
    await bucket.put(filename, JSON.stringify(entries));
    return entries.length;
  } catch (error) {
    console.error('Error appending audit entry:', error);
    throw error;
  }
};

// Type guard to validate audit entry structure
const isValidAuditEntry = (entry: unknown): entry is AuditEntry => {
  const candidate = entry as Partial<AuditEntry> | null;

  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.timestamp === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.action === 'string'
  );
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {       
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    if (!(await isRequestAuthorized(request, env))) {
      return createResponse({ error: 'Forbidden' }, 403);
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const bucket = env.STRIAE_AUDIT;

      // This worker only handles audit trail endpoints
      if (!pathname.startsWith('/audit/')) {
        return createResponse({ error: 'This worker only handles audit endpoints. Use /audit/ path.' }, 404);
      }

      const userId = url.searchParams.get('userId');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      
      if (request.method === 'POST') {
        // Add audit entry
        if (!userId) {
          return createResponse({ error: 'userId parameter is required' }, 400);
        }
        
        const auditEntry: unknown = await request.json();
        
        // Validate audit entry structure using type guard
        if (!isValidAuditEntry(auditEntry)) {
          return createResponse({ error: 'Invalid audit entry structure. Required fields: timestamp, userId, action' }, 400);
        }
        
        const filename = generateAuditFileName(userId);
        
        try {
          const entryCount = await appendAuditEntry(bucket, filename, auditEntry);
          return createResponse({ 
            success: true, 
            entryCount,
            filename 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          return createResponse({ error: `Failed to store audit entry: ${errorMessage}` }, 500);
        }
      }
      
      if (request.method === 'GET') {
        // Retrieve audit entries
        if (!userId) {
          return createResponse({ error: 'userId parameter is required' }, 400);
        }
        
        try {
          let allEntries: AuditEntry[] = [];
          
          if (startDate && endDate) {
            // Get entries for date range
            const start = new Date(startDate);
            const end = new Date(endDate);
            const currentDate = new Date(start);
            
            while (currentDate <= end) {
              const dateStr = currentDate.toISOString().split('T')[0];
              const filename = `audit-trails/${userId}/${dateStr}.json`;
              const file = await bucket.get(filename);
              
              if (file) {
                const fileText = await file.text();
                const entries: AuditEntry[] = JSON.parse(fileText);
                allEntries.push(...entries);
              }
              
              currentDate.setDate(currentDate.getDate() + 1);
            }
          } else {
            // Get today's entries
            const filename = generateAuditFileName(userId);
            const file = await bucket.get(filename);
            
            if (file) {
              const fileText = await file.text();
              allEntries = JSON.parse(fileText);
            }
          }
          
          // Sort by timestamp (newest first)
          allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          return createResponse({
            entries: allEntries,
            total: allEntries.length
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          return createResponse({ error: `Failed to retrieve audit entries: ${errorMessage}` }, 500);
        }
      }
      
      return createResponse({ error: 'Method not allowed for audit endpoints. Only GET and POST are supported.' }, 405);

    } catch (error) {
      console.error('Audit Worker error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return createResponse({ error: errorMessage }, 500);
    }
  }
};