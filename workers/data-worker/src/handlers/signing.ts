import { signPayload as signWithWorkerKey } from '../signature-utils';
import {
  AUDIT_EXPORT_SIGNATURE_VERSION,
  CONFIRMATION_SIGNATURE_VERSION,
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
  FORENSIC_MANIFEST_VERSION,
  type AuditExportSigningPayload,
  type ConfirmationSigningPayload,
  type ForensicManifestPayload,
  createAuditExportSigningPayload,
  createConfirmationSigningPayload,
  createManifestSigningPayload,
  isValidAuditExportPayload,
  isValidConfirmationPayload,
  isValidManifestPayload
} from '../signing-payload-utils';
import { getManifestSigningKeyContext } from '../registry/key-registry';
import type { CreateResponse, Env } from '../types';

async function signPayloadWithWorkerKey(payload: string, env: Env): Promise<{
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}> {
  const signingContext = await getManifestSigningKeyContext(env);

  return signWithWorkerKey(
    payload,
    signingContext.privateKeyPem,
    signingContext.keyId,
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

export async function handleSignManifest(
  request: Request,
  env: Env,
  respond: CreateResponse
): Promise<Response> {
  try {
    const requestBody = await request.json() as { manifest?: Partial<ForensicManifestPayload> } & Partial<ForensicManifestPayload>;
    const manifestCandidate: Partial<ForensicManifestPayload> = requestBody.manifest ?? requestBody;

    if (!manifestCandidate || !isValidManifestPayload(manifestCandidate)) {
      return respond({ error: 'Invalid manifest payload' }, 400);
    }

    const signature = await signManifest(manifestCandidate, env);

    return respond({
      success: true,
      manifestVersion: FORENSIC_MANIFEST_VERSION,
      signature
    });
  } catch (error) {
    console.error('Manifest signing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respond({ error: errorMessage }, 500);
  }
}

export async function handleSignConfirmation(
  request: Request,
  env: Env,
  respond: CreateResponse
): Promise<Response> {
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
      return respond(
        { error: `Unsupported confirmation signature version: ${requestedSignatureVersion}` },
        400
      );
    }

    const confirmationCandidate: Partial<ConfirmationSigningPayload> = requestBody.confirmationData ?? requestBody;

    if (!confirmationCandidate || !isValidConfirmationPayload(confirmationCandidate)) {
      return respond({ error: 'Invalid confirmation payload' }, 400);
    }

    const signature = await signConfirmation(confirmationCandidate, env);

    return respond({
      success: true,
      signatureVersion: CONFIRMATION_SIGNATURE_VERSION,
      signature
    });
  } catch (error) {
    console.error('Confirmation signing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respond({ error: errorMessage }, 500);
  }
}

export async function handleSignAuditExport(
  request: Request,
  env: Env,
  respond: CreateResponse
): Promise<Response> {
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
      return respond(
        { error: `Unsupported audit export signature version: ${requestedSignatureVersion}` },
        400
      );
    }

    const auditExportCandidate: Partial<AuditExportSigningPayload> = requestBody.auditExport ?? requestBody;

    if (!auditExportCandidate || !isValidAuditExportPayload(auditExportCandidate)) {
      return respond({ error: 'Invalid audit export payload' }, 400);
    }

    const signature = await signAuditExport(auditExportCandidate, env);

    return respond({
      success: true,
      signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION,
      signature
    });
  } catch (error) {
    console.error('Audit export signing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respond({ error: errorMessage }, 500);
  }
}