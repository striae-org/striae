import { signPayload as signWithWorkerKey } from './signature-utils';
import {
  AUDIT_EXPORT_SIGNATURE_VERSION,
  CONFIRMATION_SIGNATURE_VERSION,
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
  FORENSIC_MANIFEST_VERSION,
  AuditExportSigningPayload,
  ConfirmationSigningPayload,
  ForensicManifestPayload,
  createAuditExportSigningPayload,
  createConfirmationSigningPayload,
  createManifestSigningPayload,
  isValidAuditExportPayload,
  isValidConfirmationPayload,
  isValidManifestPayload
} from './signing-payload-utils';

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

type APIResponse = SuccessResponse | ErrorResponse | unknown[] | Record<string, unknown>;

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
const SIGN_AUDIT_EXPORT_PATH = '/api/forensic/sign-audit-export';

async function signPayloadWithWorkerKey(payload: string, env: Env): Promise<{
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}> {
  return signWithWorkerKey(
    payload,
    env.MANIFEST_SIGNING_PRIVATE_KEY,
    env.MANIFEST_SIGNING_KEY_ID,
    FORENSIC_MANIFEST_SIGNATURE_ALGORITHM
  );
}

async function signManifest(manifest: ForensicManifestPayload, env: Env): Promise<{
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}> {
  const payload = createManifestSigningPayload(manifest);
  return signPayloadWithWorkerKey(payload, env);
}

async function signConfirmation(confirmationData: ConfirmationSigningPayload, env: Env): Promise<{
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}> {
  const payload = createConfirmationSigningPayload(confirmationData);
  return signPayloadWithWorkerKey(payload, env);
}

async function signAuditExport(auditExportData: AuditExportSigningPayload, env: Env): Promise<{
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}> {
  const payload = createAuditExportSigningPayload(auditExportData);
  return signPayloadWithWorkerKey(payload, env);
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

async function handleSignAuditExport(request: Request, env: Env): Promise<Response> {
  try {
    const requestBody = await request.json() as {
      auditExport?: Partial<AuditExportSigningPayload>;
      signatureVersion?: string;
    } & Partial<AuditExportSigningPayload>;

    const requestedSignatureVersion =
      typeof requestBody.signatureVersion === 'string' && requestBody.signatureVersion.trim().length > 0
        ? requestBody.signatureVersion
        : AUDIT_EXPORT_SIGNATURE_VERSION;

    if (requestedSignatureVersion !== AUDIT_EXPORT_SIGNATURE_VERSION) {
      return createResponse(
        { error: `Unsupported audit export signature version: ${requestedSignatureVersion}` },
        400
      );
    }

    const auditExportCandidate: Partial<AuditExportSigningPayload> = requestBody.auditExport ?? requestBody;

    if (!auditExportCandidate || !isValidAuditExportPayload(auditExportCandidate)) {
      return createResponse({ error: 'Invalid audit export payload' }, 400);
    }

    const signature = await signAuditExport(auditExportCandidate, env);

    return createResponse({
      success: true,
      signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION,
      signature
    });
  } catch (error) {
    console.error('Audit export signing failed:', error);
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

      if (request.method === 'POST' && pathname === SIGN_AUDIT_EXPORT_PATH) {
        return await handleSignAuditExport(request, env);
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
