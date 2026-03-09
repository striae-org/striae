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

interface ConfirmationSignatureMetadata {
  caseNumber: string;
  exportDate: string;
  exportedBy: string;
  exportedByUid: string;
  exportedByName: string;
  exportedByCompany: string;
  totalConfirmations: number;
  version: string;
  hash: string;
  originalExportCreatedAt?: string;
}

interface ConfirmationRecord {
  fullName: string;
  badgeId: string;
  timestamp: string;
  confirmationId: string;
  confirmedBy: string;
  confirmedByEmail: string;
  confirmedByCompany: string;
  confirmedAt: string;
}

interface ConfirmationSigningPayload {
  metadata: ConfirmationSignatureMetadata;
  confirmations: Record<string, ConfirmationRecord[]>;
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
const SIGN_CONFIRMATION_PATH = '/api/forensic/sign-confirmation';
const FORENSIC_MANIFEST_VERSION = '2.0';
const CONFIRMATION_SIGNATURE_VERSION = '2.0';
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

function hasValidConfirmationRecord(entry: Partial<ConfirmationRecord>): entry is ConfirmationRecord {
  return (
    typeof entry.fullName === 'string' &&
    typeof entry.badgeId === 'string' &&
    typeof entry.timestamp === 'string' &&
    typeof entry.confirmationId === 'string' &&
    typeof entry.confirmedBy === 'string' &&
    typeof entry.confirmedByEmail === 'string' &&
    typeof entry.confirmedByCompany === 'string' &&
    typeof entry.confirmedAt === 'string' &&
    !Number.isNaN(Date.parse(entry.confirmedAt))
  );
}

function isValidConfirmationPayload(
  candidate: Partial<ConfirmationSigningPayload>
): candidate is ConfirmationSigningPayload {
  if (!candidate || !candidate.metadata || !candidate.confirmations) {
    return false;
  }

  const metadata = candidate.metadata;
  if (
    typeof metadata.caseNumber !== 'string' ||
    typeof metadata.exportDate !== 'string' ||
    typeof metadata.exportedBy !== 'string' ||
    typeof metadata.exportedByUid !== 'string' ||
    typeof metadata.exportedByName !== 'string' ||
    typeof metadata.exportedByCompany !== 'string' ||
    typeof metadata.totalConfirmations !== 'number' ||
    metadata.totalConfirmations < 0 ||
    typeof metadata.version !== 'string' ||
    typeof metadata.hash !== 'string' ||
    !SHA256_HEX_REGEX.test(metadata.hash)
  ) {
    return false;
  }

  if (Number.isNaN(Date.parse(metadata.exportDate))) {
    return false;
  }

  if (
    typeof metadata.originalExportCreatedAt === 'string' &&
    Number.isNaN(Date.parse(metadata.originalExportCreatedAt))
  ) {
    return false;
  }

  for (const [imageId, confirmationList] of Object.entries(candidate.confirmations)) {
    if (!imageId || !Array.isArray(confirmationList)) {
      return false;
    }

    for (const record of confirmationList) {
      if (!record || typeof record !== 'object' || !hasValidConfirmationRecord(record)) {
        return false;
      }
    }
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

function normalizeConfirmationEntries(entries: ConfirmationRecord[]): ConfirmationRecord[] {
  return [...entries]
    .map((entry) => ({
      fullName: entry.fullName,
      badgeId: entry.badgeId,
      timestamp: entry.timestamp,
      confirmationId: entry.confirmationId,
      confirmedBy: entry.confirmedBy,
      confirmedByEmail: entry.confirmedByEmail,
      confirmedByCompany: entry.confirmedByCompany,
      confirmedAt: entry.confirmedAt
    }))
    .sort((left, right) => {
      const leftKey = `${left.confirmationId}|${left.confirmedAt}|${left.confirmedBy}`;
      const rightKey = `${right.confirmationId}|${right.confirmedAt}|${right.confirmedBy}`;
      return leftKey.localeCompare(rightKey);
    });
}

function normalizeConfirmations(confirmations: Record<string, ConfirmationRecord[]>): Record<string, ConfirmationRecord[]> {
  const normalized: Record<string, ConfirmationRecord[]> = {};
  const sortedImageIds = Object.keys(confirmations).sort();

  for (const imageId of sortedImageIds) {
    normalized[imageId] = normalizeConfirmationEntries(confirmations[imageId] || []);
  }

  return normalized;
}

function createConfirmationSigningPayload(confirmationData: ConfirmationSigningPayload): string {
  const canonicalPayload = {
    signatureVersion: CONFIRMATION_SIGNATURE_VERSION,
    metadata: {
      caseNumber: confirmationData.metadata.caseNumber,
      exportDate: confirmationData.metadata.exportDate,
      exportedBy: confirmationData.metadata.exportedBy,
      exportedByUid: confirmationData.metadata.exportedByUid,
      exportedByName: confirmationData.metadata.exportedByName,
      exportedByCompany: confirmationData.metadata.exportedByCompany,
      totalConfirmations: confirmationData.metadata.totalConfirmations,
      version: confirmationData.metadata.version,
      hash: confirmationData.metadata.hash.toUpperCase(),
      ...(confirmationData.metadata.originalExportCreatedAt
        ? { originalExportCreatedAt: confirmationData.metadata.originalExportCreatedAt }
        : {})
    },
    confirmations: normalizeConfirmations(confirmationData.confirmations)
  };

  return JSON.stringify(canonicalPayload);
}

async function signPayload(payload: string, env: Env): Promise<{
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

async function signManifest(manifest: ForensicManifestPayload, env: Env): Promise<{
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}> {
  const payload = createManifestSigningPayload(manifest);
  return signPayload(payload, env);
}

async function signConfirmation(confirmationData: ConfirmationSigningPayload, env: Env): Promise<{
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}> {
  const payload = createConfirmationSigningPayload(confirmationData);
  return signPayload(payload, env);
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

async function handleSignConfirmation(request: Request, env: Env): Promise<Response> {
  try {
    const requestBody = await request.json() as {
      confirmationData?: Partial<ConfirmationSigningPayload>;
      signatureVersion?: string;
    } & Partial<ConfirmationSigningPayload>;

    const requestedSignatureVersion =
      typeof requestBody.signatureVersion === 'string' && requestBody.signatureVersion.trim().length > 0
        ? requestBody.signatureVersion
        : CONFIRMATION_SIGNATURE_VERSION;

    if (requestedSignatureVersion !== CONFIRMATION_SIGNATURE_VERSION) {
      return createResponse(
        { error: `Unsupported confirmation signature version: ${requestedSignatureVersion}` },
        400
      );
    }

    const confirmationCandidate: Partial<ConfirmationSigningPayload> = requestBody.confirmationData ?? requestBody;

    if (!confirmationCandidate || !isValidConfirmationPayload(confirmationCandidate)) {
      return createResponse({ error: 'Invalid confirmation payload' }, 400);
    }

    const signature = await signConfirmation(confirmationCandidate, env);

    return createResponse({
      success: true,
      signatureVersion: CONFIRMATION_SIGNATURE_VERSION,
      signature
    });
  } catch (error) {
    console.error('Confirmation signing failed:', error);
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

      if (request.method === 'POST' && pathname === SIGN_CONFIRMATION_PATH) {
        return await handleSignConfirmation(request, env);
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
