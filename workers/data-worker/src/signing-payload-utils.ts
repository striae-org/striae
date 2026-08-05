export interface ForensicManifestPayload {
  caseNumber: string;
  dataHash: string;
  imageHashes: { [filename: string]: string };
  manifestHash: string;
  totalFiles: number;
  createdAt: string;
}

export interface ConfirmationSignatureMetadata {
  caseNumber: string;
  exportDate: string;
  exportedBy: string;
  exportedByUid: string;
  exportedByName: string;
  exportedByCompany: string;
  exportedByBadgeId?: string;
  totalConfirmations: number;
  version: string;
  hash: string;
  originalExportCreatedAt?: string;
  originalCaseOwnerUid?: string;
}

export interface ConfirmationRecord {
  fullName: string;
  badgeId: string;
  timestamp: string;
  confirmationId: string;
  confirmedBy: string;
  confirmedByEmail: string;
  confirmedByCompany: string;
  confirmedAt: string;
}

export interface ConfirmationSigningPayload {
  metadata: ConfirmationSignatureMetadata;
  confirmations: Record<string, ConfirmationRecord[]>;
}

export type AuditExportFormat = 'json';
export type AuditExportType = 'trail';
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

export const FORENSIC_MANIFEST_LEGACY_VERSION = '3.0';
export const FORENSIC_MANIFEST_VERSION = '4.0';
export const CONFIRMATION_SIGNATURE_VERSION = '3.0';
export const AUDIT_EXPORT_SIGNATURE_VERSION = '2.0';
export const FORENSIC_MANIFEST_SIGNATURE_ALGORITHM = 'RSASSA-PSS-SHA-256';

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

function normalizeImageHashes(imageHashes: { [filename: string]: string }): { [filename: string]: string } {
  const normalized: { [filename: string]: string } = {};
  const sortedFilenames = Object.keys(imageHashes).sort();

  for (const filename of sortedFilenames) {
    normalized[filename] = imageHashes[filename].toLowerCase();
  }

  return normalized;
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

export function isValidManifestPayload(candidate: Partial<ForensicManifestPayload>): candidate is ForensicManifestPayload {
  if (!candidate) {
    return false;
  }

  if (typeof candidate.caseNumber !== 'string' || candidate.caseNumber.trim().length === 0) {
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

export function isValidConfirmationPayload(
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
    (typeof metadata.exportedByBadgeId !== 'undefined' && typeof metadata.exportedByBadgeId !== 'string') ||
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

  if (
    typeof metadata.originalCaseOwnerUid !== 'undefined' &&
    (typeof metadata.originalCaseOwnerUid !== 'string' || metadata.originalCaseOwnerUid.trim().length === 0)
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

export function isValidAuditExportPayload(
  candidate: Partial<AuditExportSigningPayload>
): candidate is AuditExportSigningPayload {
  if (!candidate) {
    return false;
  }

  if (candidate.signatureVersion !== AUDIT_EXPORT_SIGNATURE_VERSION) {
    return false;
  }

  if (candidate.exportFormat !== 'json') {
    return false;
  }

  if (candidate.exportType !== 'trail') {
    return false;
  }

  if (candidate.scopeType !== 'case' && candidate.scopeType !== 'user') {
    return false;
  }

  if (typeof candidate.scopeIdentifier !== 'string' || candidate.scopeIdentifier.trim().length === 0) {
    return false;
  }

  if (typeof candidate.generatedAt !== 'string' || Number.isNaN(Date.parse(candidate.generatedAt))) {
    return false;
  }

  if (typeof candidate.totalEntries !== 'number' || candidate.totalEntries < 0) {
    return false;
  }

  if (typeof candidate.hash !== 'string' || !SHA256_HEX_REGEX.test(candidate.hash)) {
    return false;
  }

  return true;
}

export function createManifestSigningPayload(manifest: ForensicManifestPayload): string {
  if (manifest.caseNumber.trim().length === 0) {
    throw new Error('Manifest case number is required for signing');
  }

  const canonicalPayload = {
    manifestVersion: FORENSIC_MANIFEST_VERSION,
    caseNumber: manifest.caseNumber,
    dataHash: manifest.dataHash.toLowerCase(),
    imageHashes: normalizeImageHashes(manifest.imageHashes),
    manifestHash: manifest.manifestHash.toLowerCase(),
    totalFiles: manifest.totalFiles,
    createdAt: manifest.createdAt
  };

  return JSON.stringify(canonicalPayload);
}

export function createLegacyManifestSigningPayload(manifest: Omit<ForensicManifestPayload, 'caseNumber'>): string {
  const canonicalPayload = {
    manifestVersion: FORENSIC_MANIFEST_LEGACY_VERSION,
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

export function createConfirmationSigningPayload(confirmationData: ConfirmationSigningPayload): string {
  const canonicalPayload = {
    signatureVersion: CONFIRMATION_SIGNATURE_VERSION,
    metadata: {
      caseNumber: confirmationData.metadata.caseNumber,
      exportDate: confirmationData.metadata.exportDate,
      exportedBy: confirmationData.metadata.exportedBy,
      exportedByUid: confirmationData.metadata.exportedByUid,
      exportedByName: confirmationData.metadata.exportedByName,
      exportedByCompany: confirmationData.metadata.exportedByCompany,
      ...(confirmationData.metadata.exportedByBadgeId
        ? { exportedByBadgeId: confirmationData.metadata.exportedByBadgeId }
        : {}),
      totalConfirmations: confirmationData.metadata.totalConfirmations,
      version: confirmationData.metadata.version,
      hash: confirmationData.metadata.hash.toUpperCase(),
      ...(confirmationData.metadata.originalExportCreatedAt
        ? { originalExportCreatedAt: confirmationData.metadata.originalExportCreatedAt }
        : {}),
      ...(confirmationData.metadata.originalCaseOwnerUid
        ? { originalCaseOwnerUid: confirmationData.metadata.originalCaseOwnerUid }
        : {})
    },
    confirmations: normalizeConfirmations(confirmationData.confirmations)
  };

  return JSON.stringify(canonicalPayload);
}

export function createAuditExportSigningPayload(auditExportData: AuditExportSigningPayload): string {
  const canonicalPayload = {
    signatureVersion: auditExportData.signatureVersion,
    exportFormat: auditExportData.exportFormat,
    exportType: auditExportData.exportType,
    scopeType: auditExportData.scopeType,
    scopeIdentifier: auditExportData.scopeIdentifier,
    generatedAt: auditExportData.generatedAt,
    totalEntries: auditExportData.totalEntries,
    hash: auditExportData.hash.toUpperCase()
  };

  return JSON.stringify(canonicalPayload);
}
