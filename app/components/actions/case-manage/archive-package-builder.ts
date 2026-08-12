import type { User } from 'firebase/auth';
import { type AuditTrail, type CaseExportData, type ValidationAuditEntry } from '~/types';
import { signForensicManifest } from '~/utils/data';
import {
  calculateSHA256Secure,
  createPublicSigningKeyFileName,
  encryptExportDataWithAllImages,
  generateForensicManifestSecure,
  getCurrentEncryptionPublicKeyDetails,
  getCurrentPublicSigningKeyDetails,
  getVerificationPublicKey,
} from '~/utils/forensics';
import { signAuditExport } from '~/services/audit/audit-export-signing';
import { generateAuditSummary, sortAuditEntriesNewestFirst } from '~/services/audit/audit-query-helpers';
import { auditService } from '~/services/audit';
import { getImageUrl } from '../image-manage';
import { getOtherFileUrl } from '../other-files-manage';

export interface ArchiveBundleAuditConfig {
  startDate: string;
  endDate: string;
  additionalEntries?: ValidationAuditEntry[];
}

export interface ArchiveBundleReadmeConfig {
  archivedAt: string;
  archivedByDisplay: string;
  archiveReason?: string;
}

export interface BuildArchivePackageInput {
  user: User;
  caseNumber: string;
  caseJsonContent: string;
  files: CaseExportData['files'];
  otherFiles?: NonNullable<CaseExportData['otherFiles']>;
  auditConfig: ArchiveBundleAuditConfig;
  readmeConfig: ArchiveBundleReadmeConfig;
}

export interface BuildArchivePackageResult {
  zipBlob: Blob;
  publicKeyFileName: string;
  manifestSignatureKeyId: string;
}

function generateArchiveImageFilename(originalFilename: string, id: string): string {
  const lastDotIndex = originalFilename.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return `${originalFilename}-${id}`;
  }

  const basename = originalFilename.substring(0, lastDotIndex);
  const extension = originalFilename.substring(lastDotIndex);

  return `${basename}-${id}${extension}`;
}

function getVerificationPublicSigningKey(preferredKeyId?: string): { keyId: string | null; publicKeyPem: string } {
  const preferredKey = preferredKeyId ? getVerificationPublicKey(preferredKeyId) : null;
  const currentDetails = getCurrentPublicSigningKeyDetails();
  const resolvedPem = preferredKey ?? currentDetails.publicKeyPem;
  const resolvedKeyId = preferredKey ? preferredKeyId ?? null : currentDetails.keyId;

  if (!resolvedPem || resolvedPem.trim().length === 0) {
    throw new Error('No public signing key is configured for archive packaging.');
  }

  return {
    keyId: resolvedKeyId,
    publicKeyPem: resolvedPem.endsWith('\n') ? resolvedPem : `${resolvedPem}\n`,
  };
}

async function fetchImageAsBlob(user: User, fileData: CaseExportData['files'][number]['fileData'], caseNumber: string): Promise<Blob | null> {
  try {
    const imageAccess = await getImageUrl(user, fileData, caseNumber, 'Archive Package');
    const { blob, revoke, url } = imageAccess;

    if (!blob) {
      const signedResponse = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/octet-stream,image/*',
        },
      });

      if (!signedResponse.ok) {
        throw new Error(`Signed URL fetch failed with status ${signedResponse.status}`);
      }

      return await signedResponse.blob();
    }

    try {
      return blob;
    } finally {
      revoke();
    }
  } catch (error) {
    console.error('Failed to fetch image for archive package:', error);
    return null;
  }
}

async function fetchOtherFileAsBlob(
  user: User,
  fileData: NonNullable<CaseExportData['otherFiles']>[number]['fileData'],
  caseNumber: string
): Promise<Blob | null> {
  try {
    const fileAccess = await getOtherFileUrl(user, fileData, caseNumber, 'Archive Package');
    const { blob, revoke, url } = fileAccess;

    if (!blob) {
      const signedResponse = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/octet-stream',
        },
      });

      if (!signedResponse.ok) {
        throw new Error(`Signed URL fetch failed with status ${signedResponse.status}`);
      }

      return await signedResponse.blob();
    }

    try {
      return blob;
    } finally {
      revoke();
    }
  } catch (error) {
    console.error('Failed to fetch associated file for archive package:', error);
    return null;
  }
}

export async function buildArchivePackage(input: BuildArchivePackageInput): Promise<BuildArchivePackageResult> {
  const { user, caseNumber, caseJsonContent, files, otherFiles = [], auditConfig, readmeConfig } = input;

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  zip.file(`${caseNumber}_data.json`, caseJsonContent);

  const imageFolder = zip.folder('images');
  const filesFolder = zip.folder('files');
  const associatedBlobs: Record<string, Blob> = {};
  if (imageFolder && files) {
    for (const fileEntry of files) {
      const imageBlob = await fetchImageAsBlob(user, fileEntry.fileData, caseNumber);
      if (!imageBlob) {
        continue;
      }

      const exportFileName = generateArchiveImageFilename(
        fileEntry.fileData.originalFilename,
        fileEntry.fileData.id
      );
      imageFolder.file(exportFileName, imageBlob);
      associatedBlobs[`images/${exportFileName}`] = imageBlob;
    }
  }

  if (filesFolder && otherFiles.length > 0) {
    for (const fileEntry of otherFiles) {
      const fileBlob = await fetchOtherFileAsBlob(user, fileEntry.fileData, caseNumber);
      if (!fileBlob) {
        continue;
      }

      const exportFileName = generateArchiveImageFilename(
        fileEntry.fileData.originalFilename,
        fileEntry.fileData.id
      );
      filesFolder.file(exportFileName, fileBlob);
      associatedBlobs[`files/${exportFileName}`] = fileBlob;
    }
  }

  const forensicManifest = await generateForensicManifestSecure(caseJsonContent, associatedBlobs, caseNumber);
  const manifestSigningResponse = await signForensicManifest(user, caseNumber, forensicManifest);

  const signingKey = getVerificationPublicSigningKey(manifestSigningResponse.signature.keyId);
  const publicKeyFileName = createPublicSigningKeyFileName(signingKey.keyId);
  zip.file(publicKeyFileName, signingKey.publicKeyPem);

  zip.file(
    'FORENSIC_MANIFEST.json',
    JSON.stringify(
      {
        ...forensicManifest,
        manifestVersion: manifestSigningResponse.manifestVersion,
        signature: manifestSigningResponse.signature,
      },
      null,
      2
    )
  );

  const auditEntries = await auditService.getAuditEntriesForUser(user.uid, {
    caseNumber,
    startDate: auditConfig.startDate,
    endDate: auditConfig.endDate,
  });

  const auditEntriesWithExtras = sortAuditEntriesNewestFirst([
    ...auditEntries,
    ...(auditConfig.additionalEntries ?? []),
  ]);

  const auditTrail: AuditTrail = {
    caseNumber,
    workflowId: `${caseNumber}-archive-${Date.now()}`,
    entries: auditEntriesWithExtras,
    summary: generateAuditSummary(auditEntriesWithExtras),
  };

  const auditTrailPayload = {
    metadata: {
      exportTimestamp: new Date().toISOString(),
      exportVersion: '1.0',
      totalEntries: auditTrail.summary.totalEvents,
      application: 'Striae',
      exportType: 'trail' as const,
      scopeType: 'case' as const,
      scopeIdentifier: caseNumber,
    },
    auditTrail,
  };

  const auditTrailRawContent = JSON.stringify(auditTrailPayload, null, 2);
  const auditTrailHash = await calculateSHA256Secure(auditTrailRawContent);
  const signedAuditExportPayload = await signAuditExport(
    {
      exportFormat: 'json',
      exportType: 'trail',
      generatedAt: auditTrailPayload.metadata.exportTimestamp,
      totalEntries: auditTrail.summary.totalEvents,
      hash: auditTrailHash.toUpperCase(),
    },
    {
      user,
      scopeType: 'case',
      scopeIdentifier: caseNumber,
      caseNumber,
    }
  );

  const signedAuditTrail = {
    metadata: {
      ...auditTrailPayload.metadata,
      hash: auditTrailHash.toUpperCase(),
      signatureVersion: signedAuditExportPayload.signatureMetadata.signatureVersion,
      signatureMetadata: signedAuditExportPayload.signatureMetadata,
      signature: signedAuditExportPayload.signature,
    },
    auditTrail,
  };

  const auditTrailJson = JSON.stringify(signedAuditTrail, null, 2);
  const auditSignatureJson = JSON.stringify(signedAuditExportPayload, null, 2);
  zip.file('audit/case-audit-trail.json', auditTrailJson);
  zip.file('audit/case-audit-signature.json', auditSignatureJson);

  const encryptionKeyDetails = getCurrentEncryptionPublicKeyDetails();

  if (!encryptionKeyDetails.publicKeyPem || !encryptionKeyDetails.keyId) {
    throw new Error(
      'Archive encryption is mandatory. Your Striae instance does not have a configured encryption public key. ' +
      'Please contact your administrator to set up export encryption.'
    );
  }

  const filesToEncrypt: Array<{ filename: string; blob: Blob }> = [
    ...Object.entries(associatedBlobs).map(([filename, blob]) => ({
      filename,
      blob,
    })),
    {
      filename: 'audit/case-audit-trail.json',
      blob: new Blob([auditTrailJson], { type: 'application/json' }),
    },
    {
      filename: 'audit/case-audit-signature.json',
      blob: new Blob([auditSignatureJson], { type: 'application/json' }),
    },
  ];

  const encryptionResult = await encryptExportDataWithAllImages(
    caseJsonContent,
    filesToEncrypt,
    encryptionKeyDetails.publicKeyPem,
    encryptionKeyDetails.keyId
  );

  zip.file(`${caseNumber}_data.json`, encryptionResult.ciphertext);

  for (let index = 0; index < filesToEncrypt.length; index += 1) {
    const originalFilename = filesToEncrypt[index].filename;
    const encryptedContent = encryptionResult.encryptedFiles[index];

    if (originalFilename.startsWith('audit/')) {
      zip.file(originalFilename, encryptedContent);
      continue;
    }

    if (originalFilename.startsWith('images/')) {
      imageFolder?.file(originalFilename.replace(/^images\//, ''), encryptedContent);
      continue;
    }

    if (originalFilename.startsWith('files/')) {
      filesFolder?.file(originalFilename.replace(/^files\//, ''), encryptedContent);
    }
  }

  zip.file('ENCRYPTION_MANIFEST.json', JSON.stringify(encryptionResult.encryptionManifest, null, 2));

  zip.file(
    'README.txt',
    [
      'Striae Archived Case Package',
      '===========================',
      '',
      `Case Number: ${caseNumber}`,
      `Archived At: ${readmeConfig.archivedAt}`,
      `Archived By: ${readmeConfig.archivedByDisplay}`,
      `Archive Reason: ${readmeConfig.archiveReason?.trim() || 'Not provided'}`,
      '',
      'Package Contents',
      '- Case data JSON export with all image references',
      '- images/ folder with exported image files (encrypted)',
      '- files/ folder with exported associated non-image files (encrypted)',
      '- Full case audit trail export and signed audit metadata',
      '- Forensic manifest with server-side signature',
      '- ENCRYPTION_MANIFEST.json with encryption metadata and encrypted file hashes',
      `- ${publicKeyFileName} for verification`,
      '',
      'This package is intended for read-only review and verification workflows.',
      'This package is encrypted. Only Striae can decrypt and re-import it.',
    ].join('\n')
  );

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    zipBlob,
    publicKeyFileName,
    manifestSignatureKeyId: manifestSigningResponse.signature.keyId,
  };
}
