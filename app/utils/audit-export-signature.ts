import {
  type ForensicManifestSignature,
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
  type ManifestSignatureVerificationResult
} from './SHA256';
import { verifySignaturePayload } from './signature-utils';

export const AUDIT_EXPORT_SIGNATURE_VERSION = '1.0';

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

export type AuditExportFormat = 'csv' | 'json' | 'txt';
export type AuditExportType = 'entries' | 'trail' | 'report';
export type AuditExportScopeType = 'case' | 'user';

export interface AuditExportSigningPayload {
  signatureVersion: string;
  exportFormat: AuditExportFormat;
  exportType: AuditExportType;
  scopeType: AuditExportScopeType;
  scopeIdentifier: string;
  generatedAt: string;
  totalEntries: number;
  hash: string;
}

export function isValidAuditExportSigningPayload(
  payload: Partial<AuditExportSigningPayload>
): payload is AuditExportSigningPayload {
  if (!payload) {
    return false;
  }

  if (payload.signatureVersion !== AUDIT_EXPORT_SIGNATURE_VERSION) {
    return false;
  }

  if (payload.exportFormat !== 'csv' && payload.exportFormat !== 'json' && payload.exportFormat !== 'txt') {
    return false;
  }

  if (payload.exportType !== 'entries' && payload.exportType !== 'trail' && payload.exportType !== 'report') {
    return false;
  }

  if (payload.scopeType !== 'case' && payload.scopeType !== 'user') {
    return false;
  }

  if (typeof payload.scopeIdentifier !== 'string' || payload.scopeIdentifier.trim().length === 0) {
    return false;
  }

  if (typeof payload.generatedAt !== 'string' || Number.isNaN(Date.parse(payload.generatedAt))) {
    return false;
  }

  if (typeof payload.totalEntries !== 'number' || payload.totalEntries < 0) {
    return false;
  }

  if (typeof payload.hash !== 'string' || !SHA256_HEX_REGEX.test(payload.hash)) {
    return false;
  }

  return true;
}

export function createAuditExportSigningPayload(payload: AuditExportSigningPayload): string {
  const canonicalPayload = {
    signatureVersion: payload.signatureVersion,
    exportFormat: payload.exportFormat,
    exportType: payload.exportType,
    scopeType: payload.scopeType,
    scopeIdentifier: payload.scopeIdentifier,
    generatedAt: payload.generatedAt,
    totalEntries: payload.totalEntries,
    hash: payload.hash.toUpperCase()
  };

  return JSON.stringify(canonicalPayload);
}

export async function verifyAuditExportSignature(
  payload: Partial<AuditExportSigningPayload>,
  signature?: ForensicManifestSignature
): Promise<ManifestSignatureVerificationResult> {
  if (!signature) {
    return {
      isValid: false,
      error: 'Missing audit export signature'
    };
  }

  if (!isValidAuditExportSigningPayload(payload)) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: 'Audit export signature metadata is malformed'
    };
  }

  const signingPayload = createAuditExportSigningPayload(payload);

  return verifySignaturePayload(
    signingPayload,
    signature,
    FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
    {
      unsupportedAlgorithmPrefix: 'Unsupported audit export signature algorithm',
      missingKeyOrValueError: 'Missing audit export signature key ID or value',
      noVerificationKeyPrefix: 'No verification key configured for key ID',
      invalidPublicKeyError: 'Audit export signature verification failed: invalid public key',
      verificationFailedError: 'Audit export signature verification failed'
    }
  );
}
