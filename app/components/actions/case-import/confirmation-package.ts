import type { User } from 'firebase/auth';
import { type ConfirmationImportData, type ConfirmationImportPreview } from '~/types';
import type { EncryptionManifest } from '~/utils/forensics/export-encryption';
import { decryptExportBatch } from '~/utils/data/operations/signing-operations';

function isEncryptionManifest(value: unknown): value is EncryptionManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<EncryptionManifest>;
  return (
    typeof candidate.encryptionVersion === 'string' &&
    typeof candidate.algorithm === 'string' &&
    typeof candidate.keyId === 'string' &&
    typeof candidate.wrappedKey === 'string' &&
    typeof candidate.dataIv === 'string' &&
    Array.isArray(candidate.encryptedImages)
  );
}

const CONFIRMATION_EXPORT_FILE_REGEX = /^confirmation-data-.*\.json$/i;
const ENCRYPTION_MANIFEST_FILE_NAME = 'encryption_manifest.json';

function uint8ArrayToBase64Url(data: Uint8Array): string {
  const chunkSize = 8192;
  let binaryString = '';

  for (let index = 0; index < data.length; index += chunkSize) {
    const chunk = data.subarray(index, Math.min(index + chunkSize, data.length));

    for (let chunkIndex = 0; chunkIndex < chunk.length; chunkIndex += 1) {
      binaryString += String.fromCharCode(chunk[chunkIndex]);
    }
  }

  return btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export interface ConfirmationImportPackage {
  confirmationData: ConfirmationImportData;
  confirmationJsonContent: string;
  verificationPublicKeyPem?: string;
  confirmationFileName: string;
  isEncrypted?: boolean;
  encryptionManifest?: unknown;
  encryptedDataBase64?: string;
}

function getLeafFileName(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}

function selectPreferredPemPath(pemPaths: string[]): string | undefined {
  if (pemPaths.length === 0) {
    return undefined;
  }

  const sortedPaths = [...pemPaths].sort((left, right) => left.localeCompare(right));
  const preferred = sortedPaths.find((path) =>
    /^striae-public-signing-key.*\.pem$/i.test(getLeafFileName(path))
  );

  return preferred ?? sortedPaths[0];
}

async function extractConfirmationPackageFromZip(file: File): Promise<ConfirmationImportPackage> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const fileEntries = Object.keys(zip.files).filter((path) => !zip.files[path].dir);

  // Check for encryption manifest first
  const hasEncryptionManifest = fileEntries.some((path) =>
    getLeafFileName(path).toLowerCase() === ENCRYPTION_MANIFEST_FILE_NAME
  );

  let confirmationData: ConfirmationImportData;
  let confirmationJsonContent: string;
  let confirmationFileName: string;
  let isEncrypted: boolean;
  let encryptionManifest: unknown;
  let encryptedDataBase64: string | undefined;

  if (hasEncryptionManifest) {
    // Handle encrypted confirmation export
    isEncrypted = true;

    // Read encryption manifest
    const manifestPath = fileEntries.find((path) =>
      getLeafFileName(path).toLowerCase() === ENCRYPTION_MANIFEST_FILE_NAME
    );
    if (!manifestPath) {
      throw new Error('Encrypted confirmation ZIP is missing ENCRYPTION_MANIFEST.json.');
    }

    const manifestFile = zip.file(manifestPath);
    if (!manifestFile) {
      throw new Error('Failed to read ENCRYPTION_MANIFEST.json from encrypted confirmation ZIP package.');
    }

    const manifestContent = await manifestFile.async('text');
    if (manifestContent.trim().length === 0) {
      throw new Error('ENCRYPTION_MANIFEST.json is empty in the encrypted confirmation ZIP package.');
    }

    try {
      encryptionManifest = JSON.parse(manifestContent);
    } catch {
      throw new Error('ENCRYPTION_MANIFEST.json is invalid in the encrypted confirmation ZIP package.');
    }

    // Find and read encrypted confirmation data file
    const confirmationPaths = fileEntries.filter((path) =>
      CONFIRMATION_EXPORT_FILE_REGEX.test(getLeafFileName(path))
    );

    if (confirmationPaths.length !== 1) {
      throw new Error('Encrypted confirmation ZIP must contain exactly one confirmation-data file.');
    }

    const confirmationPath = confirmationPaths[0];
    const encryptedContent = await zip.file(confirmationPath)?.async('uint8array');
    if (!encryptedContent) {
      throw new Error('Failed to read encrypted confirmation data from ZIP package.');
    }

    encryptedDataBase64 = uint8ArrayToBase64Url(encryptedContent);
    confirmationFileName = getLeafFileName(confirmationPath);

    // For encrypted data, return placeholder confirmationData for now
    // The actual decryption will happen in confirmation-import.ts
    confirmationData = {
      metadata: {},
      confirmations: {}
    } as ConfirmationImportData;
    confirmationJsonContent = encryptedDataBase64;
  } else {
    throw new Error(
      'Confirmation imports now require an encrypted confirmation ZIP package exported from Striae. ' +
      'Legacy plaintext confirmation ZIP packages are no longer supported.'
    );
  }

  const pemPaths = fileEntries.filter((path) => getLeafFileName(path).toLowerCase().endsWith('.pem'));
  const preferredPemPath = selectPreferredPemPath(pemPaths);

  let verificationPublicKeyPem: string | undefined;
  if (preferredPemPath) {
    verificationPublicKeyPem = await zip.file(preferredPemPath)?.async('text');
  }

  return {
    confirmationData,
    confirmationJsonContent,
    verificationPublicKeyPem,
    confirmationFileName,
    isEncrypted,
    encryptionManifest,
    encryptedDataBase64
  };
}

export async function previewConfirmationImport(
  file: File,
  user: User
): Promise<ConfirmationImportPreview> {
  const pkg = await extractConfirmationImportPackage(file);

  if (!pkg.isEncrypted || !pkg.encryptedDataBase64) {
    throw new Error(
      'Confirmation imports require an encrypted confirmation ZIP package exported from Striae.'
    );
  }

  if (!isEncryptionManifest(pkg.encryptionManifest)) {
    throw new Error('Encrypted confirmation manifest is missing required fields.');
  }

  let parsed: ConfirmationImportData;
  try {
    const decryptResult = await decryptExportBatch(
      user,
      pkg.encryptionManifest,
      pkg.encryptedDataBase64,
      {}
    );
    parsed = JSON.parse(decryptResult.plaintext) as ConfirmationImportData;
  } catch (error) {
    throw new Error(
      `Failed to decrypt confirmation package for preview: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { cause: error }
    );
  }

  const meta = parsed.metadata;
  if (!meta?.caseNumber) {
    throw new Error('Decrypted confirmation data is missing required case number.');
  }

  return {
    caseNumber: meta.caseNumber,
    exportedBy: meta.exportedBy ?? '',
    exportedByName: meta.exportedByName ?? '',
    exportedByCompany: meta.exportedByCompany ?? '',
    exportedByBadgeId: meta.exportedByBadgeId,
    exportDate: meta.exportDate ?? new Date().toISOString(),
    totalConfirmations: meta.totalConfirmations ?? 0
  };
}

export async function extractConfirmationImportPackage(file: File): Promise<ConfirmationImportPackage> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.json')) {
    throw new Error(
      'Confirmation imports now require an encrypted confirmation ZIP package exported from Striae. ' +
      'Plaintext confirmation JSON files are no longer supported.'
    );
  }

  if (lowerName.endsWith('.zip')) {
    return extractConfirmationPackageFromZip(file);
  }

  throw new Error('Unsupported confirmation import file type. Use an encrypted confirmation ZIP package exported from Striae.');
}
