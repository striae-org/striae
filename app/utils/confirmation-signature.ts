import paths from '~/config/config.json';
import { ConfirmationImportData } from '~/types';
import {
  ForensicManifestSignature,
  FORENSIC_MANIFEST_SIGNATURE_ALGORITHM,
  ManifestSignatureVerificationResult
} from './SHA256';

export const CONFIRMATION_SIGNATURE_VERSION = '2.0';

type ManifestSigningConfig = {
  manifest_signing_public_keys?: Record<string, string>;
  manifest_signing_public_key?: string;
  manifest_signing_key_id?: string;
};

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

function normalizePemPublicKey(pem: string): string {
  return pem.replace(/\\n/g, '\n').trim();
}

function publicKeyPemToArrayBuffer(publicKeyPem: string): ArrayBuffer {
  const normalized = normalizePemPublicKey(publicKeyPem);
  const pemBody = normalized
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  if (!pemBody) {
    throw new Error('Confirmation signature verification failed: invalid public key');
  }

  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(normalized + padding);
  const bytes = new Uint8Array(decoded.length);

  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }

  return bytes;
}

function getVerificationPublicKey(keyId: string): string | null {
  const config = paths as unknown as ManifestSigningConfig;
  const keyMap = config.manifest_signing_public_keys;

  if (keyMap && typeof keyMap === 'object') {
    const mappedKey = keyMap[keyId];
    if (typeof mappedKey === 'string' && mappedKey.trim().length > 0) {
      return mappedKey;
    }
  }

  if (
    typeof config.manifest_signing_key_id === 'string' &&
    config.manifest_signing_key_id === keyId &&
    typeof config.manifest_signing_public_key === 'string' &&
    config.manifest_signing_public_key.trim().length > 0
  ) {
    return config.manifest_signing_public_key;
  }

  return null;
}

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

  if (signature.algorithm !== FORENSIC_MANIFEST_SIGNATURE_ALGORITHM) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: `Unsupported confirmation signature algorithm: ${signature.algorithm}`
    };
  }

  if (!signature.keyId || !signature.value) {
    return {
      isValid: false,
      error: 'Missing confirmation signature key ID or value'
    };
  }

  if (!isValidConfirmationData(confirmationData)) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: 'Confirmation content is malformed'
    };
  }

  const publicKeyPem = getVerificationPublicKey(signature.keyId);
  if (!publicKeyPem) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: `No verification key configured for key ID: ${signature.keyId}`
    };
  }

  try {
    const key = await crypto.subtle.importKey(
      'spki',
      publicKeyPemToArrayBuffer(publicKeyPem),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['verify']
    );

    const payload = createConfirmationSigningPayload(confirmationData, signatureVersion);
    const signatureBytes = base64UrlToUint8Array(signature.value);
    const signatureBuffer = new Uint8Array(signatureBytes.byteLength);
    signatureBuffer.set(signatureBytes);

    const verified = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      signatureBuffer,
      new TextEncoder().encode(payload)
    );

    return {
      isValid: verified,
      keyId: signature.keyId,
      error: verified ? undefined : 'Confirmation signature verification failed'
    };
  } catch (error) {
    return {
      isValid: false,
      keyId: signature.keyId,
      error: error instanceof Error ? error.message : 'Confirmation signature verification failed'
    };
  }
}
