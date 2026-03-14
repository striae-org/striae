import { User } from 'firebase/auth';
import { signAuditExportData } from '~/utils/data-operations';
import {
  AUDIT_EXPORT_SIGNATURE_VERSION,
  AuditExportFormat,
  AuditExportSigningPayload,
  AuditExportType
} from '~/utils/audit-export-signature';

export interface AuditExportContext {
  user: User;
  scopeType: 'case' | 'user';
  scopeIdentifier: string;
  caseNumber?: string;
}

interface SignAuditExportInput {
  exportFormat: AuditExportFormat;
  exportType: AuditExportType;
  generatedAt: string;
  totalEntries: number;
  hash: string;
}

export interface AuditExportSignature {
  algorithm: string;
  keyId: string;
  signedAt: string;
  value: string;
}

export interface SignedAuditExportPayload {
  signatureMetadata: AuditExportSigningPayload;
  signature: AuditExportSignature;
}

const buildAuditSignaturePayload = (
  exportFormat: AuditExportFormat,
  exportType: AuditExportType,
  generatedAt: string,
  totalEntries: number,
  hash: string,
  context: AuditExportContext
): AuditExportSigningPayload => {
  return {
    signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION,
    exportFormat,
    exportType,
    scopeType: context.scopeType,
    scopeIdentifier: context.scopeIdentifier,
    generatedAt,
    totalEntries,
    hash: hash.toUpperCase()
  };
};

export const signAuditExport = async (
  payload: SignAuditExportInput,
  context: AuditExportContext
): Promise<SignedAuditExportPayload> => {
  const signatureMetadata = buildAuditSignaturePayload(
    payload.exportFormat,
    payload.exportType,
    payload.generatedAt,
    payload.totalEntries,
    payload.hash,
    context
  );

  const caseNumber =
    context.scopeType === 'case'
      ? (context.caseNumber || context.scopeIdentifier)
      : undefined;

  const signatureResponse = await signAuditExportData(
    context.user,
    signatureMetadata,
    { caseNumber }
  );

  return {
    signatureMetadata,
    signature: signatureResponse.signature
  };
};
