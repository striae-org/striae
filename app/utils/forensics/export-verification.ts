import { type ConfirmationImportData } from '~/types';
import {
  extractForensicManifestData,
  type ManifestSignatureVerificationResult,
  type SignedForensicManifest,
  calculateSHA256Secure,
  validateCaseIntegritySecure,
  verifyForensicManifestSignature
} from './SHA256';
import {
  type AuditExportSigningPayload,
  verifyAuditExportSignature
} from './audit-export-signature';
import { verifyConfirmationSignature } from './confirmation-signature';

export interface ExportVerificationResult {
  isValid: boolean;
  message: string;
  exportType?: 'case-zip' | 'confirmation' | 'audit-json';
}

const CASE_EXPORT_FILE_REGEX = /_data\.(json|csv)$/i;
const CONFIRMATION_EXPORT_FILE_REGEX = /^confirmation-data-.*\.json$/i;

interface BundledAuditExportFile {
  metadata?: {
    exportTimestamp?: string;
    exportVersion?: string;
    totalEntries?: number;
    application?: string;
    exportType?: 'entries' | 'trail' | 'report';
    scopeType?: 'case' | 'user';
    scopeIdentifier?: string;
    hash?: string;
    signatureVersion?: string;
    signatureMetadata?: Partial<AuditExportSigningPayload>;
    signature?: {
      algorithm: string;
      keyId: string;
      signedAt: string;
      value: string;
    };
  };
  auditTrail?: unknown;
  auditEntries?: unknown;
}

interface StandaloneAuditExportFile extends BundledAuditExportFile {
  metadata?: BundledAuditExportFile['metadata'] & {
    integrityNote?: string;
  };
}

export interface CasePackageIntegrityInput {
  cleanedContent: string;
  imageFiles: Record<string, Blob>;
  forensicManifest: SignedForensicManifest;
  verificationPublicKeyPem?: string;
  bundledAuditFiles?: {
    auditTrailContent?: string;
    auditSignatureContent?: string;
  };
}

export interface CasePackageIntegrityResult {
  isValid: boolean;
  signatureResult: ManifestSignatureVerificationResult;
  integrityResult: Awaited<ReturnType<typeof validateCaseIntegritySecure>>;
  bundledAuditVerification: ExportVerificationResult | null;
}

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
  targetLabel: 'export ZIP' | 'confirmation file' | 'audit export'
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

function isAuditExportCandidate(candidate: unknown): candidate is StandaloneAuditExportFile {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const auditCandidate = candidate as StandaloneAuditExportFile;
  const metadata = auditCandidate.metadata;

  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  return (
    typeof metadata.exportTimestamp === 'string' &&
    typeof metadata.exportType === 'string' &&
    typeof metadata.scopeType === 'string' &&
    typeof metadata.scopeIdentifier === 'string' &&
    typeof metadata.hash === 'string' &&
    !!metadata.signature &&
    (auditCandidate.auditTrail !== undefined || auditCandidate.auditEntries !== undefined)
  );
}

async function verifyAuditExportContent(
  fileContent: string,
  verificationPublicKeyPem: string
): Promise<ExportVerificationResult> {
  try {
    const parsedContent = JSON.parse(fileContent) as unknown;

    if (!isAuditExportCandidate(parsedContent)) {
      return createVerificationResult(
        false,
        'The JSON file is not a supported Striae audit export.',
        'audit-json'
      );
    }

    const auditExport = parsedContent as StandaloneAuditExportFile;
    const metadata = auditExport.metadata!;

    const unsignedAuditExport = auditExport.auditTrail !== undefined
      ? {
          metadata: {
            exportTimestamp: metadata.exportTimestamp,
            exportVersion: metadata.exportVersion,
            totalEntries: metadata.totalEntries,
            application: metadata.application,
            exportType: metadata.exportType,
            scopeType: metadata.scopeType,
            scopeIdentifier: metadata.scopeIdentifier,
          },
          auditTrail: auditExport.auditTrail,
        }
      : {
          metadata: {
            exportTimestamp: metadata.exportTimestamp,
            exportVersion: metadata.exportVersion,
            totalEntries: metadata.totalEntries,
            application: metadata.application,
            exportType: metadata.exportType,
            scopeType: metadata.scopeType,
            scopeIdentifier: metadata.scopeIdentifier,
          },
          auditEntries: auditExport.auditEntries,
        };

    const recalculatedHash = await calculateSHA256Secure(JSON.stringify(unsignedAuditExport, null, 2));
    const hashValid = recalculatedHash.toUpperCase() === metadata.hash!.toUpperCase();

    const signaturePayload: Partial<AuditExportSigningPayload> = {
      signatureVersion: metadata.signatureVersion,
      exportFormat: 'json',
      exportType: metadata.exportType,
      scopeType: metadata.scopeType,
      scopeIdentifier: metadata.scopeIdentifier,
      generatedAt: metadata.exportTimestamp,
      totalEntries: metadata.totalEntries,
      hash: metadata.hash,
    };

    const signatureResult = await verifyAuditExportSignature(
      signaturePayload,
      metadata.signature,
      verificationPublicKeyPem
    );

    if (hashValid && signatureResult.isValid) {
      return createVerificationResult(
        true,
        'The audit export passed signature and integrity verification.',
        'audit-json'
      );
    }

    if (!hashValid && !signatureResult.isValid) {
      return createVerificationResult(
        false,
        'The audit export failed signature and integrity verification.',
        'audit-json'
      );
    }

    if (!signatureResult.isValid) {
      return createVerificationResult(
        false,
        getSignatureFailureMessage(signatureResult.error, 'audit export'),
        'audit-json'
      );
    }

    return createVerificationResult(
      false,
      'The audit export failed integrity verification.',
      'audit-json'
    );
  } catch {
    return createVerificationResult(
      false,
      'The JSON file could not be read as a supported Striae audit export.',
      'audit-json'
    );
  }
}

export async function verifyBundledAuditExport(
  zip: {
    file: (path: string) => { async: (type: 'text') => Promise<string> } | null;
  },
  verificationPublicKeyPem: string
): Promise<ExportVerificationResult | null> {
  const auditTrailContent = await zip.file('audit/case-audit-trail.json')?.async('text');
  const auditSignatureContent = await zip.file('audit/case-audit-signature.json')?.async('text');

  if (!auditTrailContent && !auditSignatureContent) {
    return null;
  }

  if (!auditTrailContent || !auditSignatureContent) {
    return createVerificationResult(
      false,
      'The archive ZIP contains incomplete bundled audit verification files.',
      'case-zip'
    );
  }

  try {
    const auditTrailExport = JSON.parse(auditTrailContent) as BundledAuditExportFile;
    const auditSignatureExport = JSON.parse(auditSignatureContent) as {
      signatureMetadata?: Partial<AuditExportSigningPayload>;
      signature?: NonNullable<BundledAuditExportFile['metadata']>['signature'];
    };

    const metadata = auditTrailExport.metadata;
    if (!metadata?.signature || typeof metadata.hash !== 'string') {
      return createVerificationResult(
        false,
        'The bundled audit export is missing required hash or signature metadata.',
        'case-zip'
      );
    }

    const unsignedAuditExport = auditTrailExport.auditTrail !== undefined
      ? {
          metadata: {
            exportTimestamp: metadata.exportTimestamp,
            exportVersion: metadata.exportVersion,
            totalEntries: metadata.totalEntries,
            application: metadata.application,
            exportType: metadata.exportType,
            scopeType: metadata.scopeType,
            scopeIdentifier: metadata.scopeIdentifier,
          },
          auditTrail: auditTrailExport.auditTrail,
        }
      : {
          metadata: {
            exportTimestamp: metadata.exportTimestamp,
            exportVersion: metadata.exportVersion,
            totalEntries: metadata.totalEntries,
            application: metadata.application,
            exportType: metadata.exportType,
            scopeType: metadata.scopeType,
            scopeIdentifier: metadata.scopeIdentifier,
          },
          auditEntries: auditTrailExport.auditEntries,
        };

    const recalculatedHash = await calculateSHA256Secure(JSON.stringify(unsignedAuditExport, null, 2));
    if (recalculatedHash.toUpperCase() !== metadata.hash.toUpperCase()) {
      return createVerificationResult(
        false,
        'The bundled audit export failed integrity verification.',
        'case-zip'
      );
    }

    const embeddedSignaturePayload: Partial<AuditExportSigningPayload> = metadata.signatureMetadata ?? {
      signatureVersion: metadata.signatureVersion,
      exportFormat: 'json',
      exportType: metadata.exportType,
      scopeType: metadata.scopeType,
      scopeIdentifier: metadata.scopeIdentifier,
      generatedAt: metadata.exportTimestamp,
      totalEntries: metadata.totalEntries,
      hash: metadata.hash,
    };

    const signatureVerification = await verifyAuditExportSignature(
      embeddedSignaturePayload,
      metadata.signature,
      verificationPublicKeyPem
    );

    if (!signatureVerification.isValid) {
      return createVerificationResult(
        false,
        getSignatureFailureMessage(signatureVerification.error, 'export ZIP'),
        'case-zip'
      );
    }

    if (
      JSON.stringify(auditSignatureExport.signatureMetadata ?? null) !== JSON.stringify(metadata.signatureMetadata ?? null) ||
      JSON.stringify(auditSignatureExport.signature ?? null) !== JSON.stringify(metadata.signature ?? null)
    ) {
      return createVerificationResult(
        false,
        'The bundled audit signature artifact does not match the signed audit export.',
        'case-zip'
      );
    }

    return null;
  } catch {
    return createVerificationResult(
      false,
      'The bundled audit export could not be parsed for verification.',
      'case-zip'
    );
  }
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

    const bundledAuditFiles = {
      auditTrailContent: await zip.file('audit/case-audit-trail.json')?.async('text'),
      auditSignatureContent: await zip.file('audit/case-audit-signature.json')?.async('text')
    };

    const casePackageResult = await verifyCasePackageIntegrity({
      cleanedContent,
      imageFiles,
      forensicManifest,
      verificationPublicKeyPem,
      bundledAuditFiles
    });

    const signatureResult = casePackageResult.signatureResult;
    const integrityResult = casePackageResult.integrityResult;
    const bundledAuditVerification = casePackageResult.bundledAuditVerification;

    if (bundledAuditVerification) {
      return bundledAuditVerification;
    }

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

async function verifyConfirmationContent(
  fileContent: string,
  verificationPublicKeyPem: string
): Promise<ExportVerificationResult> {
  try {
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
      'The confirmation content could not be read as a supported Striae confirmation export.',
      'confirmation'
    );
  }
}

async function verifyConfirmationZipExport(
  file: File,
  verificationPublicKeyPem: string
): Promise<ExportVerificationResult> {
  const JSZip = (await import('jszip')).default;

  try {
    const zip = await JSZip.loadAsync(file);
    const confirmationFiles = Object.keys(zip.files).filter((name) => CONFIRMATION_EXPORT_FILE_REGEX.test(name));

    if (confirmationFiles.length !== 1) {
      return createVerificationResult(
        false,
        'The ZIP file is not a supported Striae confirmation export package.'
      );
    }

    const confirmationContent = await zip.file(confirmationFiles[0])?.async('text');
    if (!confirmationContent) {
      return createVerificationResult(
        false,
        'The confirmation JSON file inside the ZIP could not be read.',
        'confirmation'
      );
    }

    return verifyConfirmationContent(confirmationContent, verificationPublicKeyPem);
  } catch {
    return createVerificationResult(
      false,
      'The ZIP file could not be read as a supported Striae export.'
    );
  }
}

export async function verifyExportFile(
  file: File,
  verificationPublicKeyPem: string
): Promise<ExportVerificationResult> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.zip')) {
    const confirmationZipResult = await verifyConfirmationZipExport(file, verificationPublicKeyPem);
    if (confirmationZipResult.exportType === 'confirmation' || confirmationZipResult.isValid) {
      return confirmationZipResult;
    }

    return verifyCaseZipExport(file, verificationPublicKeyPem);
  }

  if (lowerName.endsWith('.json')) {
    try {
      const fileContent = await file.text();
      const parsedContent = JSON.parse(fileContent) as unknown;

      if (isConfirmationImportCandidate(parsedContent)) {
        return verifyConfirmationContent(fileContent, verificationPublicKeyPem);
      }

      if (isAuditExportCandidate(parsedContent)) {
        return verifyAuditExportContent(fileContent, verificationPublicKeyPem);
      }

      return createVerificationResult(
        false,
        'Select a confirmation JSON/ZIP file, standalone audit JSON export, or a case export ZIP file.'
      );
    } catch {
      return createVerificationResult(
        false,
        'The JSON file could not be read as a supported Striae confirmation or audit export.'
      );
    }
  }

  return createVerificationResult(
    false,
    'Select a confirmation JSON/ZIP file, standalone audit JSON export, or a case export ZIP file.'
  );
}

export async function verifyCasePackageIntegrity(
  input: CasePackageIntegrityInput
): Promise<CasePackageIntegrityResult> {
  const manifestData = extractForensicManifestData(input.forensicManifest);
  const verificationPublicKeyPem = input.verificationPublicKeyPem;

  if (!manifestData) {
    return {
      isValid: false,
      signatureResult: {
        isValid: false,
        error: 'Forensic manifest structure is invalid'
      },
      integrityResult: {
        isValid: false,
        dataValid: false,
        imageValidation: {},
        manifestValid: false,
        errors: ['Forensic manifest structure is invalid'],
        summary: 'Manifest validation failed'
      },
      bundledAuditVerification: null
    };
  }

  if (!verificationPublicKeyPem) {
    return {
      isValid: false,
      signatureResult: {
        isValid: false,
        error: 'Missing verification public key'
      },
      integrityResult: {
        isValid: false,
        dataValid: false,
        imageValidation: {},
        manifestValid: false,
        errors: ['Missing verification public key'],
        summary: 'Manifest validation failed'
      },
      bundledAuditVerification: null
    };
  }

  const signatureResult = await verifyForensicManifestSignature(
    input.forensicManifest,
    verificationPublicKeyPem
  );

  const integrityResult = await validateCaseIntegritySecure(
    input.cleanedContent,
    input.imageFiles,
    manifestData
  );

  const bundledAuditVerification = input.bundledAuditFiles
    ? await verifyBundledAuditExport(
        {
          file: (path: string) => {
            const content = path === 'audit/case-audit-trail.json'
              ? input.bundledAuditFiles?.auditTrailContent
              : path === 'audit/case-audit-signature.json'
                ? input.bundledAuditFiles?.auditSignatureContent
                : undefined;

            if (content === undefined) {
              return null;
            }

            return {
              async: async () => content,
            };
          }
        },
        verificationPublicKeyPem
      )
    : null;

  return {
    isValid: signatureResult.isValid && integrityResult.isValid && !bundledAuditVerification,
    signatureResult,
    integrityResult,
    bundledAuditVerification
  };
}