interface Env {
  USER_DB_AUTH: string;
  USER_DB: KVNamespace;
  R2_KEY_SECRET: string;
  IMAGES_API_TOKEN: string;
  DATA_WORKER_DOMAIN?: string;
  IMAGES_WORKER_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_JWKS_URL?: string;
  PROJECT_ID: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
}

interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  permitted: boolean;
  cases: CaseItem[];
  readOnlyCases?: ReadOnlyCaseItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface CaseItem {
  caseNumber: string;
  caseName?: string;
  [key: string]: unknown;
}

interface ReadOnlyCaseItem {
  caseNumber: string;
  caseName?: string;
  [key: string]: unknown;
}

interface UserRequestData {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  permitted?: boolean;
  readOnlyCases?: ReadOnlyCaseItem[];
}

interface AddCasesRequest {
  cases: CaseItem[];
}

interface DeleteCasesRequest {
  casesToDelete: string[];
}

interface CaseData {
  files?: Array<{ id: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface AccountDeletionProgressEvent {
  event: 'start' | 'case-start' | 'case-complete' | 'complete' | 'error';
  totalCases: number;
  completedCases: number;
  currentCaseNumber?: string;
  success?: boolean;
  message?: string;
}

interface GoogleOAuthTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface FirebaseDeleteAccountErrorResponse {
  error?: {
    message?: string;
  };
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
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

// Worker URLs - configure these for deployment
const DEFAULT_DATA_WORKER_BASE_URL = 'DATA_WORKER_DOMAIN';
const DEFAULT_IMAGE_WORKER_BASE_URL = 'IMAGES_WORKER_DOMAIN';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIREBASE_IDENTITY_TOOLKIT_BASE_URL = 'https://identitytoolkit.googleapis.com/v1/projects';
const GOOGLE_IDENTITY_TOOLKIT_SCOPE = 'https://www.googleapis.com/auth/identitytoolkit';
const ACCESS_JWT_HEADER_NAME = 'CF-Access-Jwt-Assertion';
const ACCESS_JWKS_CACHE_SECONDS = 300;
const ACCESS_CLOCK_SKEW_SECONDS = 60;
const accessJwtDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
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

  const signedContent = textEncoder.encode(`${headerSegment}.${payloadSegment}`);
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

async function authenticate(request: Request, env: Env): Promise<void> {
  const authKey = request.headers.get('X-Custom-Auth-Key');
  if (authKey !== env.USER_DB_AUTH) throw new Error('Unauthorized');

  const accessJwtValid = await validateCloudflareAccessJwt(request, env);
  if (!accessJwtValid) throw new Error('Unauthorized');
}

function normalizeWorkerBaseUrl(workerDomain: string): string {
  const trimmedDomain = workerDomain.trim().replace(/\/+$/, '');
  if (trimmedDomain.startsWith('http://') || trimmedDomain.startsWith('https://')) {
    return trimmedDomain;
  }

  return `https://${trimmedDomain}`;
}

function resolveDataWorkerBaseUrl(env: Env): string {
  const configuredDomain = typeof env.DATA_WORKER_DOMAIN === 'string' ? env.DATA_WORKER_DOMAIN.trim() : '';
  if (configuredDomain.length > 0) {
    return normalizeWorkerBaseUrl(configuredDomain);
  }

  return normalizeWorkerBaseUrl(DEFAULT_DATA_WORKER_BASE_URL);
}

function resolveImageWorkerBaseUrl(env: Env): string {
  const configuredDomain = typeof env.IMAGES_WORKER_DOMAIN === 'string' ? env.IMAGES_WORKER_DOMAIN.trim() : '';
  if (configuredDomain.length > 0) {
    return normalizeWorkerBaseUrl(configuredDomain);
  }

  return normalizeWorkerBaseUrl(DEFAULT_IMAGE_WORKER_BASE_URL);
}

function base64UrlEncode(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? textEncoder.encode(value) : value;
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parsePkcs8PrivateKey(privateKey: string): ArrayBuffer {
  const normalizedKey = privateKey
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n');

  const pemBody = normalizedKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');

  if (!pemBody) {
    throw new Error('Firebase service account private key is invalid');
  }

  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function buildServiceAccountAssertion(env: Env): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  const payload = {
    iss: env.FIREBASE_SERVICE_ACCOUNT_EMAIL,
    scope: GOOGLE_IDENTITY_TOOLKIT_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;

  let signingKey: CryptoKey;

  try {
    signingKey = await crypto.subtle.importKey(
      'pkcs8',
      parsePkcs8PrivateKey(env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );
  } catch {
    throw new Error('Invalid Firebase service account private key format. Use the service account JSON private_key value (PKCS8) and keep newline markers as \\n.');
  }

  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    signingKey,
    textEncoder.encode(unsignedToken)
  );

  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function getGoogleAccessToken(env: Env): Promise<string> {
  const assertion = await buildServiceAccountAssertion(env);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const tokenResponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const tokenData = await tokenResponse.json().catch(() => ({})) as GoogleOAuthTokenResponse;
  if (!tokenResponse.ok || !tokenData.access_token) {
    const errorReason = tokenData.error_description || tokenData.error || `HTTP ${tokenResponse.status}`;
    throw new Error(`Failed to authorize Firebase admin deletion: ${errorReason}`);
  }

  return tokenData.access_token;
}

async function deleteFirebaseAuthUser(env: Env, userUid: string): Promise<void> {
  if (!env.PROJECT_ID || !env.FIREBASE_SERVICE_ACCOUNT_EMAIL || !env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Firebase Auth deletion is not configured in User Worker secrets');
  }

  const accessToken = await getGoogleAccessToken(env);
  const deleteResponse = await fetch(
    `${FIREBASE_IDENTITY_TOOLKIT_BASE_URL}/${encodeURIComponent(env.PROJECT_ID)}/accounts:delete`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ localId: userUid })
    }
  );

  if (deleteResponse.ok) {
    return;
  }

  const deleteErrorPayload = await deleteResponse.json().catch(() => ({})) as FirebaseDeleteAccountErrorResponse;
  const deleteErrorMessage = deleteErrorPayload.error?.message || '';

  if (deleteErrorMessage.includes('USER_NOT_FOUND')) {
    return;
  }

  throw new Error(deleteErrorMessage ? `Firebase Auth deletion failed: ${deleteErrorMessage}` : `Firebase Auth deletion failed with status ${deleteResponse.status}`);
}

async function handleGetUser(env: Env, userUid: string): Promise<Response> {
  try {
    const value = await env.USER_DB.get(userUid);
    if (value === null) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }
    return new Response(value, { 
      status: 200, 
      headers: corsHeaders 
    });
  } catch {
    return new Response('Failed to get user data', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

async function handleAddUser(request: Request, env: Env, userUid: string): Promise<Response> {
  try {
    const requestData: UserRequestData = await request.json();
    const { email, firstName, lastName, company, permitted } = requestData;
    
    // Check for existing user
    const value = await env.USER_DB.get(userUid);
    
    let userData: UserData;
    if (value !== null) {
      // Update existing user, preserving cases
      const existing: UserData = JSON.parse(value);
      userData = {
        ...existing,
        // Preserve all existing fields
        email: email || existing.email,
        firstName: firstName || existing.firstName,
        lastName: lastName || existing.lastName,
        company: company || existing.company,
        permitted: permitted !== undefined ? permitted : existing.permitted,
        updatedAt: new Date().toISOString()
      };
      if (requestData.readOnlyCases !== undefined) {
        userData.readOnlyCases = requestData.readOnlyCases;
      }
    } else {
      // Create new user
      userData = {
        uid: userUid,
        email: email || '',
        firstName: firstName || '',
        lastName: lastName || '',
        company: company || '',
        permitted: permitted !== undefined ? permitted : true,
        cases: [],
        createdAt: new Date().toISOString()
      };
      if (requestData.readOnlyCases !== undefined) {
        userData.readOnlyCases = requestData.readOnlyCases;
      }
    }

    // Store value in KV
    await env.USER_DB.put(userUid, JSON.stringify(userData));

    return new Response(JSON.stringify(userData), {
      status: value !== null ? 200 : 201,
      headers: corsHeaders
    });
  } catch {
    return new Response('Failed to save user data', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

// Function to delete a single case (similar to case-manage.ts deleteCase)
async function deleteSingleCase(env: Env, userUid: string, caseNumber: string): Promise<void> {
  const dataApiKey = env.R2_KEY_SECRET;
  const imageApiKey = env.IMAGES_API_TOKEN;

  const dataWorkerBaseUrl = resolveDataWorkerBaseUrl(env);
  const imageWorkerBaseUrl = resolveImageWorkerBaseUrl(env);
  const encodedUserId = encodeURIComponent(userUid);
  const encodedCaseNumber = encodeURIComponent(caseNumber);

  const caseResponse = await fetch(`${dataWorkerBaseUrl}/${encodedUserId}/${encodedCaseNumber}/data.json`, {
    headers: { 'X-Custom-Auth-Key': dataApiKey }
  });

  if (caseResponse.status === 404) {
    return;
  }

  if (!caseResponse.ok) {
    throw new Error(`Failed to load case data for deletion (${caseNumber}): ${caseResponse.status}`);
  }

  const caseData = await caseResponse.json() as CaseData;
  const deletionErrors: string[] = [];

  // Delete all files associated with this case
  if (caseData.files && caseData.files.length > 0) {
    for (const file of caseData.files) {
      const encodedFileId = encodeURIComponent(file.id);

      try {
        const imageDeleteResponse = await fetch(`${imageWorkerBaseUrl}/${encodedFileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${imageApiKey}`
          }
        });

        if (!imageDeleteResponse.ok && imageDeleteResponse.status !== 404) {
          deletionErrors.push(`image ${file.id} delete failed (${imageDeleteResponse.status})`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown image delete error';
        deletionErrors.push(`image ${file.id} delete threw (${message})`);
      }

      try {
        const notesDeleteResponse = await fetch(
          `${dataWorkerBaseUrl}/${encodedUserId}/${encodedCaseNumber}/${encodedFileId}/data.json`,
          {
            method: 'DELETE',
            headers: { 'X-Custom-Auth-Key': dataApiKey }
          }
        );

        if (!notesDeleteResponse.ok && notesDeleteResponse.status !== 404) {
          deletionErrors.push(`annotation ${file.id} delete failed (${notesDeleteResponse.status})`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown annotation delete error';
        deletionErrors.push(`annotation ${file.id} delete threw (${message})`);
      }
    }
  }

  // Delete case data file
  try {
    const caseDeleteResponse = await fetch(
      `${dataWorkerBaseUrl}/${encodedUserId}/${encodedCaseNumber}/data.json`,
      {
        method: 'DELETE',
        headers: { 'X-Custom-Auth-Key': dataApiKey }
      }
    );

    if (!caseDeleteResponse.ok && caseDeleteResponse.status !== 404) {
      deletionErrors.push(`case ${caseNumber} delete failed (${caseDeleteResponse.status})`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown case delete error';
    deletionErrors.push(`case ${caseNumber} delete threw (${message})`);
  }

  if (deletionErrors.length > 0) {
    throw new Error(`Case cleanup incomplete for ${caseNumber}: ${deletionErrors.join('; ')}`);
  }
}

async function executeUserDeletion(
  env: Env,
  userUid: string,
  reportProgress?: (progress: AccountDeletionProgressEvent) => void
): Promise<{ success: boolean; message: string; totalCases: number; completedCases: number }> {
  const userData = await env.USER_DB.get(userUid);
  if (userData === null) {
    throw new Error('User not found');
  }

  const userObject: UserData = JSON.parse(userData);
  const ownedCases = (userObject.cases || []).map((caseItem) => caseItem.caseNumber);
  const readOnlyCases = (userObject.readOnlyCases || []).map((caseItem) => caseItem.caseNumber);
  const allCaseNumbers = Array.from(new Set([...ownedCases, ...readOnlyCases]));
  const totalCases = allCaseNumbers.length;
  let completedCases = 0;
  const caseCleanupErrors: string[] = [];

  reportProgress?.({
    event: 'start',
    totalCases,
    completedCases
  });

  for (const caseNumber of allCaseNumbers) {
    reportProgress?.({
      event: 'case-start',
      totalCases,
      completedCases,
      currentCaseNumber: caseNumber
    });

    let caseDeletionError: string | null = null;
    try {
      await deleteSingleCase(env, userUid, caseNumber);
    } catch (error) {
      caseDeletionError = error instanceof Error ? error.message : `Case cleanup failed for ${caseNumber}`;
      caseCleanupErrors.push(caseDeletionError);
      console.error(`Case cleanup error for ${caseNumber}:`, error);
    }

    completedCases += 1;

    reportProgress?.({
      event: 'case-complete',
      totalCases,
      completedCases,
      currentCaseNumber: caseNumber,
      success: caseDeletionError === null,
      message: caseDeletionError || undefined
    });
  }

  if (caseCleanupErrors.length > 0) {
    throw new Error(`Failed to fully delete all case data: ${caseCleanupErrors.join(' | ')}`);
  }

  await deleteFirebaseAuthUser(env, userUid);

  // Delete the user account from the database
  await env.USER_DB.delete(userUid);

  return {
    success: true,
    message: 'Account successfully deleted',
    totalCases,
    completedCases
  };
}

async function handleDeleteUser(env: Env, userUid: string): Promise<Response> {
  try {
    const result = await executeUserDeletion(env, userUid);
    
    return new Response(JSON.stringify({
      success: result.success,
      message: result.message
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Delete user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (errorMessage === 'User not found') {
      return new Response('User not found', {
        status: 404,
        headers: corsHeaders
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete user account'
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

function handleDeleteUserWithProgress(env: Env, userUid: string): Response {
  const sseHeaders: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive'
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (payload: AccountDeletionProgressEvent) => {
        controller.enqueue(encoder.encode(`event: ${payload.event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const result = await executeUserDeletion(env, userUid, sendEvent);
        sendEvent({
          event: 'complete',
          totalCases: result.totalCases,
          completedCases: result.completedCases,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete user account';

        sendEvent({
          event: 'error',
          totalCases: 0,
          completedCases: 0,
          success: false,
          message: errorMessage
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: sseHeaders
  });
}

async function handleAddCases(request: Request, env: Env, userUid: string): Promise<Response> {
  try {
    const { cases = [] }: AddCasesRequest = await request.json();
    
    // Get current user data
    const value = await env.USER_DB.get(userUid);
    if (!value) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update cases
    const userData: UserData = JSON.parse(value);
    const existingCases = userData.cases || [];
    
    // Filter out duplicates
    const newCases = cases.filter(newCase => 
      !existingCases.some(existingCase => 
        existingCase.caseNumber === newCase.caseNumber
      )
    );

    // Update user data
    userData.cases = [...existingCases, ...newCases];
    userData.updatedAt = new Date().toISOString();

    // Save to KV
    await env.USER_DB.put(userUid, JSON.stringify(userData));

    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: corsHeaders
    });
  } catch {
    return new Response('Failed to add cases', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

async function handleDeleteCases(request: Request, env: Env, userUid: string): Promise<Response> {
  try {
    const { casesToDelete }: DeleteCasesRequest = await request.json();
    
    // Get current user data
    const value = await env.USER_DB.get(userUid);
    if (!value) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Update user data
    const userData: UserData = JSON.parse(value);
    userData.cases = userData.cases.filter(c => 
      !casesToDelete.includes(c.caseNumber)
    );
    userData.updatedAt = new Date().toISOString();

    // Save to KV
    await env.USER_DB.put(userUid, JSON.stringify(userData));

    return new Response(JSON.stringify(userData), {
      status: 200,
      headers: corsHeaders
    });
  } catch {
    return new Response('Failed to delete cases', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      await authenticate(request, env);
      
      const url = new URL(request.url);
      const parts = url.pathname.split('/');
      const userUid = parts[1];
      const isCasesEndpoint = parts[2] === 'cases';
      
      if (!userUid) {
        return new Response('Not Found', { status: 404 });
      }

      // Handle regular cases endpoint
      if (isCasesEndpoint) {
        switch (request.method) {
          case 'PUT': return handleAddCases(request, env, userUid);
          case 'DELETE': return handleDeleteCases(request, env, userUid);
          default: return new Response('Method not allowed', {
            status: 405,
            headers: corsHeaders
          });
        }
      }

      // Handle user operations
      const acceptsEventStream = request.headers.get('Accept')?.includes('text/event-stream') === true;
      const streamProgress = url.searchParams.get('stream') === 'true' || acceptsEventStream;

      switch (request.method) {
        case 'GET': return handleGetUser(env, userUid);
        case 'PUT': return handleAddUser(request, env, userUid);
        case 'DELETE': return streamProgress ? handleDeleteUserWithProgress(env, userUid) : handleDeleteUser(env, userUid);
        default: return new Response('Method not allowed', {
          status: 405,
          headers: corsHeaders
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage === 'Unauthorized') {
        return new Response('Forbidden', { 
          status: 403, 
          headers: corsHeaders 
        });
      }
      
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};