import { type ConfirmationImportData } from '~/types';
import {
  extractForensicManifestData,
  type SignedForensicManifest,
  calculateSHA256Secure,
  validateCaseIntegritySecure,
  verifyForensicManifestSignature
} from './SHA256';
import { verifyConfirmationSignature } from './confirmation-signature';

export interface ExportVerificationResult {
  isValid: boolean;
  message: string;
  exportType?: 'case-zip' | 'confirmation';
}

const CASE_EXPORT_FILE_REGEX = /_data\.(json|csv)$/i;

function createVerificationResult(
  isValid: boolean,
  message: string,
  exportType?: ExportVerificationResult['exportType']
): ExportVerificationResult {
  return {
    isValid,
    message,
    exportType
  };
}

function getSignatureFailureMessage(
  error: string | undefined,
  targetLabel: 'export ZIP' | 'confirmation file'
): string {
  if (error?.includes('invalid public key')) {
    return 'The selected PEM file is not a valid public key.';
  }

  if (error?.includes('Unsupported')) {
    return `This ${targetLabel} uses an unsupported signature format.`;
  }

  if (error?.includes('Missing')) {
    return `This ${targetLabel} is missing required signature information.`;
  }

  return `The ${targetLabel} signature did not verify with the selected public key.`;
}

function isConfirmationImportCandidate(candidate: unknown): candidate is Partial<ConfirmationImportData> {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const confirmationCandidate = candidate as Partial<ConfirmationImportData>;
  return (
    !!confirmationCandidate.metadata &&
    typeof confirmationCandidate.metadata.hash === 'string' &&
    !!confirmationCandidate.confirmations &&
    typeof confirmationCandidate.confirmations === 'object'
  );
}

/**
 * Remove forensic warning from content for hash validation.
 * Supports the warning formats added to JSON and CSV case exports.
 */
export function removeForensicWarning(content: string): string {
  const jsonForensicWarningRegex = /^\/\*\s*CASE\s+DATA\s+WARNING[\s\S]*?\*\/\s*\r?\n*/;
  const csvForensicWarningRegex = /^"CASE DATA WARNING: This file contains evidence data for forensic examination\. Any modification may compromise the integrity of the evidence\. Handle according to your organization's chain of custody procedures\."(?:\r?\n){2}/;

  let cleaned = content;

  if (jsonForensicWarningRegex.test(content)) {
    cleaned = content.replace(jsonForensicWarningRegex, '');
  } else if (csvForensicWarningRegex.test(content)) {
    cleaned = content.replace(csvForensicWarningRegex, '');
  } else if (content.startsWith('"CASE DATA WARNING:')) {
    const match = content.match(/^"[^"]*"(?:\r?\n)+/);
    if (match) {
      cleaned = content.substring(match[0].length);
    }
  }

  return cleaned.replace(/^\s+/, '');
}

/**
 * Validate the stored confirmation hash without exposing expected/actual values.
 */
export async function validateConfirmationHash(jsonContent: string, expectedHash: string): Promise<boolean> {
  try {
    if (!expectedHash || typeof expectedHash !== 'string') {
      return false;
    }

    const data = JSON.parse(jsonContent);
    const dataWithoutHash = {
      ...data,
      metadata: {
        ...data.metadata,
        hash: undefined
      }
    };

    delete dataWithoutHash.metadata.hash;
    delete dataWithoutHash.metadata.signature;
    delete dataWithoutHash.metadata.signatureVersion;

    const contentForHash = JSON.stringify(dataWithoutHash, null, 2);
    const actualHash = await calculateSHA256Secure(contentForHash);

    return actualHash.toUpperCase() === expectedHash.toUpperCase();
  } catch {
    return false;
  }
}

async function verifyCaseZipExport(
  file: File,
  verificationPublicKeyPem: string
): Promise<ExportVerificationResult> {
  const JSZip = (await import('jszip')).default;

  try {
    const zip = await JSZip.loadAsync(file);
    const dataFiles = Object.keys(zip.files).filter((name) => CASE_EXPORT_FILE_REGEX.test(name));

    if (dataFiles.length !== 1) {
      return createVerificationResult(
        false,
        'The ZIP file must contain exactly one case export data file.',
        'case-zip'
      );
    }

    const dataContent = await zip.file(dataFiles[0])?.async('text');
    if (!dataContent) {
      return createVerificationResult(false, 'The ZIP data file could not be read.', 'case-zip');
    }

    const manifestContent = await zip.file('FORENSIC_MANIFEST.json')?.async('text');
    if (!manifestContent) {
      return createVerificationResult(
        false,
        'The ZIP file does not contain FORENSIC_MANIFEST.json.',
        'case-zip'
      );
    }

    const forensicManifest = JSON.parse(manifestContent) as SignedForensicManifest;
    const manifestData = extractForensicManifestData(forensicManifest);

    if (!manifestData) {
      return createVerificationResult(false, 'The forensic manifest is malformed.', 'case-zip');
    }

    const cleanedContent = removeForensicWarning(dataContent);
    const imageFiles: Record<string, Blob> = {};

    await Promise.all(
      Object.keys(zip.files).map(async (path) => {
        if (!path.startsWith('images/') || path.endsWith('/')) {
          return;
        }

        const zipEntry = zip.file(path);
        if (!zipEntry) {
          return;
        }

        imageFiles[path.replace('images/', '')] = await zipEntry.async('blob');
      })
    );

    const signatureResult = await verifyForensicManifestSignature(forensicManifest, verificationPublicKeyPem);
    const integrityResult = await validateCaseIntegritySecure(cleanedContent, imageFiles, manifestData);

    if (signatureResult.isValid && integrityResult.isValid) {
      return createVerificationResult(
        true,
        'The export ZIP passed signature and integrity verification.',
        'case-zip'
      );
    }

    if (!signatureResult.isValid && !integrityResult.isValid) {
      return createVerificationResult(
        false,
        'The export ZIP failed signature and integrity verification.',
        'case-zip'
      );
    }

    if (!signatureResult.isValid) {
      return createVerificationResult(
        false,
        getSignatureFailureMessage(signatureResult.error, 'export ZIP'),
        'case-zip'
      );
    }

    return createVerificationResult(false, 'The export ZIP failed integrity verification.', 'case-zip');
  } catch {
    return createVerificationResult(
      false,
      'The ZIP file could not be read as a supported Striae export.',
      'case-zip'
    );
  }
}

async function verifyConfirmationExport(
  file: File,
  verificationPublicKeyPem: string
): Promise<ExportVerificationResult> {
  try {
    const fileContent = await file.text();
    const parsedContent = JSON.parse(fileContent) as unknown;

    if (!isConfirmationImportCandidate(parsedContent)) {
      return createVerificationResult(
        false,
        'The JSON file is not a supported Striae confirmation export.',
        'confirmation'
      );
    }

    const confirmationData = parsedContent as Partial<ConfirmationImportData>;
    const hashValid = await validateConfirmationHash(fileContent, confirmationData.metadata!.hash);
    const signatureResult = await verifyConfirmationSignature(confirmationData, verificationPublicKeyPem);

    if (hashValid && signatureResult.isValid) {
      return createVerificationResult(
        true,
        'The confirmation file passed signature and integrity verification.',
        'confirmation'
      );
    }

    if (!signatureResult.isValid && signatureResult.error === 'Confirmation content is malformed') {
      return createVerificationResult(
        false,
        'The JSON file is not a supported Striae confirmation export.',
        'confirmation'
      );
    }

    if (!hashValid && !signatureResult.isValid) {
      return createVerificationResult(
        false,
        'The confirmation file failed signature and integrity verification.',
        'confirmation'
      );
    }

    if (!signatureResult.isValid) {
      return createVerificationResult(
        false,
        getSignatureFailureMessage(signatureResult.error, 'confirmation file'),
        'confirmation'
      );
    }

    return createVerificationResult(
      false,
      'The confirmation file failed integrity verification.',
      'confirmation'
    );
  } catch {
    return createVerificationResult(
      false,
      'The JSON file could not be read as a supported Striae confirmation export.',
      'confirmation'
    );
  }
}

export async function verifyExportFile(
  file: File,
  verificationPublicKeyPem: string
): Promise<ExportVerificationResult> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.zip')) {
    return verifyCaseZipExport(file, verificationPublicKeyPem);
  }

  if (lowerName.endsWith('.json')) {
    return verifyConfirmationExport(file, verificationPublicKeyPem);
  }

  return createVerificationResult(
    false,
    'Select a confirmation JSON file or a case export ZIP file.'
  );
}