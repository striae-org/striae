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

export interface ExportVerificationResult {
  isValid: boolean;
  message: string;
  exportType?: 'case-zip' | 'confirmation' | 'audit-json';
}

interface BundledAuditExportFile {
  metadata?: {
    exportTimestamp?: string;
    exportVersion?: string;
    totalEntries?: number;
    application?: string;
    exportType?: 'trail';
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

export interface CasePackageIntegrityInput {
  cleanedContent: string;
  imageFiles: Record<string, Blob>;
  forensicManifest: SignedForensicManifest;
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

async function verifyBundledAuditExport(
  zip: {
    file: (path: string) => { async: (type: 'text') => Promise<string> } | null;
  }
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
      exportType: 'trail',
      scopeType: metadata.scopeType,
      scopeIdentifier: metadata.scopeIdentifier,
      generatedAt: metadata.exportTimestamp,
      totalEntries: metadata.totalEntries,
      hash: metadata.hash,
    };

    const signatureVerification = await verifyAuditExportSignature(
      embeddedSignaturePayload,
      metadata.signature
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
 * Supports the warning format added to JSON case exports.
 */
export function removeForensicWarning(content: string): string {
  const jsonForensicWarningRegex = /^\/\*\s*CASE\s+DATA\s+WARNING[\s\S]*?\*\/\s*\r?\n*/;

  let cleaned = content;

  if (jsonForensicWarningRegex.test(content)) {
    cleaned = content.replace(jsonForensicWarningRegex, '');
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

export async function verifyCasePackageIntegrity(
  input: CasePackageIntegrityInput
): Promise<CasePackageIntegrityResult> {
  const manifestData = extractForensicManifestData(input.forensicManifest);

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

  const signatureResult = await verifyForensicManifestSignature(
    input.forensicManifest
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
        }
      )
    : null;

  return {
    isValid: signatureResult.isValid && integrityResult.isValid && !bundledAuditVerification,
    signatureResult,
    integrityResult,
    bundledAuditVerification
  };
}