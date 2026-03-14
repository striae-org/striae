import { type ConfirmationImportData } from '~/types';
import {
  type ForensicManifestSignature,
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
  type ManifestSignatureVerificationResult
} from './SHA256';
import { verifySignaturePayload } from './signature-utils';

export const CONFIRMATION_SIGNATURE_VERSION = '2.0';

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

type ConfirmationEntry = {
  fullName: string;
  badgeId: string;
  timestamp: string;
  confirmationId: string;
  confirmedBy: string;
  confirmedByEmail: string;
  confirmedByCompany: string;
  confirmedAt: string;
};

type ConfirmationMap = Record<string, ConfirmationEntry[]>;

function hasValidConfirmationEntry(entry: Partial<ConfirmationEntry>): entry is ConfirmationEntry {
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

function isValidConfirmationData(candidate: Partial<ConfirmationImportData>): candidate is ConfirmationImportData {
  if (!candidate || !candidate.metadata || !candidate.confirmations) {
    return false;
  }

  const { metadata } = candidate;

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

  const confirmations = candidate.confirmations as Record<string, unknown>;
  for (const [imageId, confirmationList] of Object.entries(confirmations)) {
    if (!imageId || !Array.isArray(confirmationList)) {
      return false;
    }

    for (const confirmationEntry of confirmationList) {
      if (
        typeof confirmationEntry !== 'object' ||
        confirmationEntry === null ||
        !hasValidConfirmationEntry(confirmationEntry as Partial<ConfirmationEntry>)
      ) {
        return false;
      }
    }
  }

  return true;
}

function normalizeConfirmationEntries(entries: ConfirmationEntry[]): ConfirmationEntry[] {
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

function normalizeConfirmations(confirmations: ConfirmationMap): ConfirmationMap {
  const normalized: ConfirmationMap = {};
  const sortedImageIds = Object.keys(confirmations).sort();

  for (const imageId of sortedImageIds) {
    normalized[imageId] = normalizeConfirmationEntries(confirmations[imageId] || []);
  }

  return normalized;
}

export function createConfirmationSigningPayload(
  confirmationData: ConfirmationImportData,
  signatureVersion: string = CONFIRMATION_SIGNATURE_VERSION
): string {
  const canonicalPayload = {
    signatureVersion,
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

export async function verifyConfirmationSignature(
  confirmationData: Partial<ConfirmationImportData>
): Promise<ManifestSignatureVerificationResult> {
  const signature = confirmationData.metadata?.signature as ForensicManifestSignature | undefined;
  const signatureVersion = confirmationData.metadata?.signatureVersion;

  if (!signature) {
    return {
      isValid: false,
      error: 'Missing confirmation signature'
    };
  }

  if (signatureVersion !== CONFIRMATION_SIGNATURE_VERSION) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: `Unsupported confirmation signature version: ${signatureVersion || 'unknown'}`
    };
  }

  if (!isValidConfirmationData(confirmationData)) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: 'Confirmation content is malformed'
    };
  }

  const payload = createConfirmationSigningPayload(confirmationData, signatureVersion);

  return verifySignaturePayload(
    payload,
    signature,
    FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
    {
      unsupportedAlgorithmPrefix: 'Unsupported confirmation signature algorithm',
      missingKeyOrValueError: 'Missing confirmation signature key ID or value',
      noVerificationKeyPrefix: 'No verification key configured for key ID',
      invalidPublicKeyError: 'Confirmation signature verification failed: invalid public key',
      verificationFailedError: 'Confirmation signature verification failed'
    }
  );
}
