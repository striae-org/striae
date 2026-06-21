import type { User } from 'firebase/auth';
import { type FileData, type CaseExportData, type ExportOptions } from '~/types';
import { getImageUrl } from '../image-manage';
import {
  generateForensicManifestSecure,
  calculateSHA256Secure,
  createPublicSigningKeyFileName,
  getCurrentPublicSigningKeyDetails,
  getVerificationPublicKey,
  getCurrentEncryptionPublicKeyDetails,
  encryptExportDataWithAllImages,
} from '~/utils/forensics';
import { signForensicManifest } from '~/utils/data';
import { formatDateForFilename } from './types-constants';
import { addForensicDataWarning } from './metadata-helpers';
import { exportCaseData } from './core-export';
import { auditService } from '~/services/audit';
import { buildArchivePackage } from '~/components/actions/case-manage/archive-package-builder';

/**
 * Generate export filename with embedded ID to prevent collisions
 * Format: {originalFilename}-{id}.{extension}
 * Example: "evidence.jpg" with ID "abc123" becomes "evidence-abc123.jpg"
 */
function generateExportFilename(originalFilename: string, id: string): string {
  const lastDotIndex = originalFilename.lastIndexOf('.');

  if (lastDotIndex === -1) {
    // No extension found
    return `${originalFilename}-${id}`;
  }

  const basename = originalFilename.substring(0, lastDotIndex);
  const extension = originalFilename.substring(lastDotIndex);

  return `${basename}-${id}${extension}`;
}

function addPublicSigningKeyPemToZip(
  zip: { file: (path: string, data: string) => unknown },
  preferredKeyId?: string
): string {
  const preferredPublicKey =
    typeof preferredKeyId === 'string' && preferredKeyId.trim().length > 0
      ? getVerificationPublicKey(preferredKeyId)
      : null;

  const currentKey = getCurrentPublicSigningKeyDetails();
  const keyId = preferredPublicKey ? preferredKeyId ?? null : currentKey.keyId;
  const publicKeyPem = preferredPublicKey ?? currentKey.publicKeyPem;

  if (!publicKeyPem || publicKeyPem.trim().length === 0) {
    throw new Error('No public signing key is configured for ZIP export packaging.');
  }

  const publicKeyFileName = createPublicSigningKeyFileName(keyId);
  const normalizedPem = publicKeyPem.endsWith('\n') ? publicKeyPem : `${publicKeyPem}\n`;
  zip.file(publicKeyFileName, normalizedPem);

  return publicKeyFileName;
}

/**
 * Download case data as ZIP file including images with forensic protection options
 */
export async function downloadCaseAsZip(
  user: User,
  caseNumber: string,
  onProgress?: (progress: number) => void,
  options: ExportOptions = {}
): Promise<void> {
  const startTime = Date.now();
  let manifestSignatureKeyId: string | undefined;
  let manifestSigned = false;
  let publicKeyFileName: string | undefined;
  const protectForensicData = true;

  try {
    // Start audit workflow
    auditService.startWorkflow(caseNumber);

    onProgress?.(10);

    // Get case data
    const exportData = await exportCaseData(user, caseNumber, options);
    onProgress?.(30);

    const archivePackageMode = options.archivePackageMode;

    if (archivePackageMode) {
      const archivedAt = exportData.metadata.archivedAt || new Date().toISOString();
      const archivedByDisplay =
        exportData.metadata.archivedByDisplay ||
        exportData.metadata.archivedBy ||
        exportData.metadata.exportedByName ||
        exportData.metadata.exportedBy ||
        'Unknown';
      // Don't add forensic warning comment to encrypted content; it will break JSON parsing on decryption.
      // The archive package already includes forensic metadata in README.txt and FORENSIC_MANIFEST.json.
      const caseJsonContent = await generateJSONContent(
        exportData,
        options.includeUserInfo,
        false
      );

      const archivePackage = await buildArchivePackage({
        user,
        caseNumber,
        caseJsonContent,
        files: exportData.files,
        auditConfig: {
          startDate: exportData.metadata.caseCreatedDate,
          endDate: archivedAt,
        },
        readmeConfig: {
          archivedAt,
          archivedByDisplay,
          archiveReason: exportData.metadata.archiveReason,
        },
      });

      manifestSignatureKeyId = archivePackage.manifestSignatureKeyId;
      manifestSigned = true;
      onProgress?.(95);

      const url = URL.createObjectURL(archivePackage.zipBlob);
      const exportFileName = `striae-case-${caseNumber}-archive-${formatDateForFilename(new Date())}-encrypted.zip`;

      const linkElement = document.createElement('a');
      linkElement.href = url;
      linkElement.setAttribute('download', exportFileName);
      linkElement.setAttribute('title', 'Encrypted Striae case package');
      linkElement.click();

      URL.revokeObjectURL(url);
      onProgress?.(100);

      const endTime = Date.now();
      await auditService.logCaseExport(
        user,
        caseNumber,
        exportFileName,
        'success',
        [],
        {
          processingTimeMs: endTime - startTime,
          fileSizeBytes: archivePackage.zipBlob.size,
          validationStepsCompleted: exportData.files?.length || 0,
          validationStepsFailed: 0,
        },
        'zip',
        protectForensicData,
        {
          present: true,
          valid: true,
          keyId: manifestSignatureKeyId,
        }
      );

      auditService.endWorkflow();
      return;
    }

    // Create ZIP
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const jsonContent = await generateJSONContent(exportData, options.includeUserInfo, protectForensicData);
    zip.file(`${caseNumber}_data.json`, jsonContent);
    onProgress?.(50);

    // Add images and collect them for manifest generation
    const imageFolder = zip.folder('images');
    const imageFiles: { [filename: string]: Blob } = {};
    if (imageFolder && exportData.files) {
      for (let i = 0; i < exportData.files.length; i++) {
        const file = exportData.files[i];
        try {
          const imageBlob = await fetchImageAsBlob(user, file.fileData, caseNumber);
          if (imageBlob) {
            const exportFilename = generateExportFilename(file.fileData.originalFilename, file.fileData.id);
            imageFolder.file(exportFilename, imageBlob);
            imageFiles[exportFilename] = imageBlob;
          }
        } catch (error) {
          console.warn(`Failed to fetch image ${file.fileData.originalFilename}:`, error);
        }
        onProgress?.(50 + (i / exportData.files.length) * 30);
      }
    }

    const contentForHash = await generateJSONContent(exportData, options.includeUserInfo, false);

    const forensicManifest = await generateForensicManifestSecure(contentForHash, imageFiles);

    const signingResult = await signForensicManifest(user, caseNumber, forensicManifest);
    manifestSignatureKeyId = signingResult.signature.keyId;
    manifestSigned = true;

    publicKeyFileName = addPublicSigningKeyPemToZip(zip, signingResult.signature.keyId);

    const signedForensicManifest = {
      ...forensicManifest,
      manifestVersion: signingResult.manifestVersion,
      signature: signingResult.signature,
    };

    zip.file('FORENSIC_MANIFEST.json', JSON.stringify(signedForensicManifest, null, 2));

    const encKeyDetails = getCurrentEncryptionPublicKeyDetails();

    if (!encKeyDetails.publicKeyPem || !encKeyDetails.keyId) {
      throw new Error(
        'Export encryption is mandatory. Your Striae instance does not have a configured encryption public key. ' +
        'Please contact your administrator to set up export encryption.'
      );
    }

    try {
      const filesToEncrypt = [
        ...Object.entries(imageFiles).map(([filename, blob]) => ({
          filename,
          blob,
        })),
      ];

      const encryptionResult = await encryptExportDataWithAllImages(
        contentForHash,
        filesToEncrypt,
        encKeyDetails.publicKeyPem,
        encKeyDetails.keyId
      );

      zip.file(`${caseNumber}_data.json`, encryptionResult.ciphertext);

      if (encryptionResult.encryptedImages.length > 0) {
        for (let i = 0; i < filesToEncrypt.length; i++) {
          const originalFilename = filesToEncrypt[i].filename;
          const encryptedContent = encryptionResult.encryptedImages[i];

          if (imageFolder) {
            imageFolder.file(originalFilename, encryptedContent);
          }
        }
      }

      zip.file('ENCRYPTION_MANIFEST.json', JSON.stringify(encryptionResult.encryptionManifest, null, 2));

      onProgress?.(80);
    } catch (error) {
      console.error('Export encryption failed:', error);
      throw new Error(`Failed to encrypt export: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error });
    }

    const instructionContent = `EVIDENCE ARCHIVE - READ ONLY

This ZIP archive contains evidence data exported from Striae.

IMPORTANT WARNINGS:
- This archive is intended for READ-ONLY access
- Do not modify, rename, or delete any files in this archive
- Any modifications may compromise evidence integrity
- Maintain proper chain of custody procedures
- This archive is encrypted. Only Striae can decrypt and re-import it.

Archive Contents:
- ${caseNumber}_data.json: Complete case data manifest (encrypted)
- images/: Image files with annotations (encrypted)
- FORENSIC_MANIFEST.json: File integrity validation manifest
- ENCRYPTION_MANIFEST.json: Encryption metadata and encrypted file hashes
- ${publicKeyFileName}: Public signing key PEM for verification
- README.txt: General information about this export

Case Information:
- Case Number: ${exportData.metadata.caseNumber}
- Export Date: ${new Date().toISOString()}
- Exported By: ${exportData.metadata.exportedBy || 'Unknown'}
- Total Files: ${exportData.metadata.totalFiles}
- Total Annotations: ${(exportData.summary?.filesWithAnnotations || 0) + (exportData.summary?.totalBoxAnnotations || 0)}
- Total Confirmations: ${exportData.summary?.filesWithConfirmations || 0}
- Confirmations Requested: ${exportData.summary?.filesWithConfirmationsRequested || 0}
- Encryption Status: ENCRYPTED (key ID: ${encKeyDetails.keyId})

For questions about this export, contact your Striae system administrator.
`;

    zip.file('READ_ONLY_INSTRUCTIONS.txt', instructionContent);

    const readme = generateZipReadme(
      exportData,
      protectForensicData,
      publicKeyFileName
    );
    zip.file('README.txt', readme);
    onProgress?.(85);

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    onProgress?.(95);

    const url = URL.createObjectURL(zipBlob);
    const exportFileName = `striae-case-${caseNumber}-encrypted-package-${formatDateForFilename(new Date())}.zip`;

    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.setAttribute('download', exportFileName);
    linkElement.setAttribute('title', 'Encrypted Striae case package');

    linkElement.click();

    URL.revokeObjectURL(url);
    onProgress?.(100);

    const endTime = Date.now();
    await auditService.logCaseExport(
      user,
      caseNumber,
      exportFileName,
      'success',
      [],
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: zipBlob.size,
        validationStepsCompleted: exportData.files?.length || 0,
        validationStepsFailed: 0,
      },
      'zip',
      protectForensicData,
      {
        present: true,
        valid: true,
        keyId: manifestSignatureKeyId,
      }
    );

    auditService.endWorkflow();
  } catch (error) {
    console.error('ZIP export failed:', error);

    const endTime = Date.now();
    await auditService.logCaseExport(
      user,
      caseNumber,
      `striae-case-${caseNumber}-export.zip`,
      'failure',
      [error instanceof Error ? error.message : 'Unknown error'],
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: 0,
        validationStepsCompleted: 0,
        validationStepsFailed: 1,
      },
      'zip',
      protectForensicData,
      {
        present: manifestSigned,
        valid: manifestSigned,
        keyId: manifestSignatureKeyId,
      }
    );

    auditService.endWorkflow();

    throw new Error('Failed to export encrypted case package', { cause: error });
  }
}

/**
 * Helper function to fetch image as blob
 */
async function fetchImageAsBlob(user: User, fileData: FileData, caseNumber: string): Promise<Blob | null> {
  try {
    const imageAccess = await getImageUrl(user, fileData, caseNumber, 'Export Package');
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
    console.error('Failed to fetch image blob:', error);
    return null;
  }
}

/**
 * Generate README content for ZIP export with optional forensic protection
 */
function generateZipReadme(
  exportData: CaseExportData,
  protectForensicData: boolean = true,
  publicKeyFileName: string = createPublicSigningKeyFileName()
): string {
  const totalFiles = exportData.files?.length || 0;
  const filesWithAnnotations = exportData.summary?.filesWithAnnotations || 0;
  const totalBoxAnnotations = exportData.summary?.totalBoxAnnotations || 0;
  const totalAnnotations = filesWithAnnotations + totalBoxAnnotations;
  const filesWithConfirmations = exportData.summary?.filesWithConfirmations || 0;
  const filesWithConfirmationsRequested = exportData.summary?.filesWithConfirmationsRequested || 0;

  const baseContent = `Striae Case Export
==================

Case Number: ${exportData.metadata.caseNumber}
Case Created Date: ${exportData.metadata.caseCreatedDate}
Export Date: ${exportData.metadata.exportDate}
Exported By (Email): ${exportData.metadata.exportedBy || 'N/A'}
Exported By (UID): ${exportData.metadata.exportedByUid || 'N/A'}
Exported By (Name): ${exportData.metadata.exportedByName || 'N/A'}
Exported By (Company): ${exportData.metadata.exportedByCompany || 'N/A'}
Exported By (Badge/ID): ${exportData.metadata.exportedByBadgeId || 'N/A'}
Striae Export Schema Version: ${exportData.metadata.striaeExportSchemaVersion}

Summary:
- Total Files: ${totalFiles}
- Files with Annotations: ${filesWithAnnotations}
- Files without Annotations: ${totalFiles - filesWithAnnotations}
- Total Box Annotations: ${totalBoxAnnotations}
- Total Annotations: ${totalAnnotations}
- Files with Confirmations: ${filesWithConfirmations}
- Files with Confirmations Requested: ${filesWithConfirmationsRequested}
- Earliest Annotation Date: ${exportData.summary?.earliestAnnotationDate || 'N/A'}
- Latest Annotation Date: ${exportData.summary?.latestAnnotationDate || 'N/A'}

Contents:
- ${exportData.metadata.caseNumber}_data.json: Encrypted case data and annotations
- images/: Encrypted uploaded images
- ${publicKeyFileName}: Public signing key PEM for verification
- README.txt: This file`;

  const forensicAddition = `
- FORENSIC_MANIFEST.json: File integrity validation manifest
- READ_ONLY_INSTRUCTIONS.txt: Important evidence handling guidelines

EVIDENCE NOTICE:
================
This export contains evidence data. Any modification may compromise 
evidence integrity and chain of custody. Handle according to your organization's 
forensic procedures and maintain proper documentation.`;

  const footer = `

Generated by Striae - A Firearms Examiner's Comparison Companion
https://striae.app`;

  return protectForensicData ? baseContent + forensicAddition + footer : baseContent + footer;
}

/**
 * Generate JSON content for case export with forensic protection options
 */
async function generateJSONContent(
  exportData: CaseExportData,
  includeUserInfo: boolean = true,
  protectForensicData: boolean = true
): Promise<string> {
  const jsonData = { ...exportData };

  if (!includeUserInfo) {
    if (jsonData.metadata.exportedBy) {
      jsonData.metadata.exportedBy = '[User Info Excluded]';
    }
    if (jsonData.metadata.exportedByUid) {
      jsonData.metadata.exportedByUid = '[User Info Excluded]';
    }
    if (jsonData.metadata.exportedByName) {
      jsonData.metadata.exportedByName = '[User Info Excluded]';
    }
    if (jsonData.metadata.exportedByCompany) {
      jsonData.metadata.exportedByCompany = '[User Info Excluded]';
    }
    if (jsonData.metadata.exportedByBadgeId) {
      jsonData.metadata.exportedByBadgeId = '[User Info Excluded]';
    }
  }

  const jsonString = JSON.stringify(jsonData, null, 2);
  const hash = await calculateSHA256Secure(jsonString);

  const finalJsonData = {
    ...jsonData,
    metadata: {
      ...jsonData.metadata,
      hash: hash.toUpperCase(),
      integrityNote: 'Verify by recalculating SHA256 of this entire JSON content',
    },
  };

  const finalJsonString = JSON.stringify(finalJsonData, null, 2);

  if (protectForensicData) {
    return addForensicDataWarning(finalJsonString);
  }

  return finalJsonString;
}
