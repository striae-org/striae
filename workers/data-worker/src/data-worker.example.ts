interface Env {
  R2_KEY_SECRET: string;
  STRIAE_DATA: R2Bucket;
  MANIFEST_SIGNING_PRIVATE_KEY: string;
  MANIFEST_SIGNING_KEY_ID: string;
}

interface SuccessResponse {
  success: boolean;
}

interface ErrorResponse {
  error: string;
}

type APIResponse = SuccessResponse | ErrorResponse | any[] | Record<string, any>;

interface ForensicManifestPayload {
  dataHash: string;
  imageHashes: { [filename: string]: string };
  manifestHash: string;
  totalFiles: number;
  createdAt: string;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': 'PAGES_CUSTOM_DOMAIN',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Custom-Auth-Key',
  'Content-Type': 'application/json'
};

const createResponse = (data: APIResponse, status: number = 200): Response => new Response(
  JSON.stringify(data),
  { status, headers: corsHeaders }
);

const hasValidHeader = (request: Request, env: Env): boolean =>
  request.headers.get('X-Custom-Auth-Key') === env.R2_KEY_SECRET;

const SIGN_MANIFEST_PATH = '/api/forensic/sign-manifest';
const FORENSIC_MANIFEST_VERSION = '2.0';
const FORENSIC_MANIFEST_SIGNATURE_ALGORITHM = 'RSASSA-PKCS1-v1_5-SHA-256';
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;
const textEncoder = new TextEncoder();

function base64UrlEncode(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) {
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
    throw new Error('Manifest signing private key is invalid');
  }

  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function normalizeImageHashes(imageHashes: { [filename: string]: string }): { [filename: string]: string } {
  const normalized: { [filename: string]: string } = {};
  const sortedFilenames = Object.keys(imageHashes).sort();

  for (const filename of sortedFilenames) {
    normalized[filename] = imageHashes[filename].toLowerCase();
  }

  return normalized;
}

function isValidManifestPayload(candidate: Partial<ForensicManifestPayload>): candidate is ForensicManifestPayload {
  if (!candidate) {
    return false;
  }

  if (typeof candidate.dataHash !== 'string' || !SHA256_HEX_REGEX.test(candidate.dataHash)) {
    return false;
  }

  if (!candidate.imageHashes || typeof candidate.imageHashes !== 'object') {
    return false;
  }

  for (const hash of Object.values(candidate.imageHashes)) {
    if (typeof hash !== 'string' || !SHA256_HEX_REGEX.test(hash)) {
      return false;
    }
  }

  if (typeof candidate.manifestHash !== 'string' || !SHA256_HEX_REGEX.test(candidate.manifestHash)) {
    return false;
  }

  if (typeof candidate.totalFiles !== 'number' || candidate.totalFiles <= 0) {
    return false;
  }

  if (typeof candidate.createdAt !== 'string' || Number.isNaN(Date.parse(candidate.createdAt))) {
    return false;
  }

  return true;
}

function createManifestSigningPayload(manifest: ForensicManifestPayload): string {
  const canonicalPayload = {
    manifestVersion: FORENSIC_MANIFEST_VERSION,
    dataHash: manifest.dataHash.toLowerCase(),
    imageHashes: normalizeImageHashes(manifest.imageHashes),
    manifestHash: manifest.manifestHash.toLowerCase(),
    totalFiles: manifest.totalFiles,
    createdAt: manifest.createdAt
  };

  return JSON.stringify(canonicalPayload);
}

async function signManifest(manifest: ForensicManifestPayload, env: Env): Promise<{
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}> {
  if (!env.MANIFEST_SIGNING_PRIVATE_KEY || !env.MANIFEST_SIGNING_KEY_ID) {
    throw new Error('Manifest signing secrets are not configured');
  }

  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    parsePkcs8PrivateKey(env.MANIFEST_SIGNING_PRIVATE_KEY),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const payload = createManifestSigningPayload(manifest);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    signingKey,
    textEncoder.encode(payload)
  );

  return {
    algorithm: FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
    keyId: env.MANIFEST_SIGNING_KEY_ID,
    signedAt: new Date().toISOString(),
    value: base64UrlEncode(new Uint8Array(signature))
  };
}

async function handleSignManifest(request: Request, env: Env): Promise<Response> {
  try {
    const requestBody = await request.json() as { manifest?: Partial<ForensicManifestPayload> } & Partial<ForensicManifestPayload>;
    const manifestCandidate: Partial<ForensicManifestPayload> = requestBody.manifest ?? requestBody;

    if (!manifestCandidate || !isValidManifestPayload(manifestCandidate)) {
      return createResponse({ error: 'Invalid manifest payload' }, 400);
    }

    const signature = await signManifest(manifestCandidate, env);

    return createResponse({
      success: true,
      manifestVersion: FORENSIC_MANIFEST_VERSION,
      signature
    });
  } catch (error) {
    console.error('Manifest signing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createResponse({ error: errorMessage }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!hasValidHeader(request, env)) {
      return createResponse({ error: 'Forbidden' }, 403);
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const bucket = env.STRIAE_DATA;

      if (request.method === 'POST' && pathname === SIGN_MANIFEST_PATH) {
        return await handleSignManifest(request, env);
      }

      const filename = pathname.slice(1) || 'data.json';

      if (!filename.endsWith('.json')) {
        return createResponse({ error: 'Invalid file type. Only JSON files are allowed.' }, 400);
      }

      switch (request.method) {
        case 'GET': {
          const file = await bucket.get(filename);
          if (!file) {
            return createResponse([], 200);
          }
          const fileText = await file.text();
          const data = JSON.parse(fileText);
          return createResponse(data);
        }

        case 'PUT': {
          const newData = await request.json();
          await bucket.put(filename, JSON.stringify(newData));
          return createResponse({ success: true });
        }

        case 'DELETE': {
          const file = await bucket.get(filename);
          if (!file) {
            return createResponse({ error: 'File not found' }, 404);
          }
          await bucket.delete(filename);
          return createResponse({ success: true });
        }

        default:
          return createResponse({ error: 'Method not allowed' }, 405);
      }
    } catch (error) {
      console.error('Worker error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return createResponse({ error: errorMessage }, 500);
    }
  }
};
