import type { User } from 'firebase/auth';
import { type CaseExportData, type CaseImportPreview } from '~/types';
import type { EncryptionManifest } from '~/utils/forensics/export-encryption';
import { decryptExportBatch } from '~/utils/data/operations/signing-operations';
import { isArchivedExportData } from './validation';

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

async function extractVerificationPublicKeyFromZip(
  zip: {
    files: Record<string, { dir: boolean }>;
    file: (path: string) => { async: (type: 'text') => Promise<string> } | null;
  }
): Promise<string | undefined> {
  const filePaths = Object.keys(zip.files).filter((path) => !zip.files[path].dir);
  const pemPaths = filePaths.filter((path) => getLeafFileName(path).toLowerCase().endsWith('.pem'));
  const preferredPemPath = selectPreferredPemPath(pemPaths);

  if (!preferredPemPath) {
    return undefined;
  }

  return zip.file(preferredPemPath)?.async('text');
}

/**
 * Safe conversion of Uint8Array to base64url without spread operator stack overflow
 * For large arrays, uses chunking approach to avoid "Maximum call stack size exceeded"
 */
function uint8ArrayToBase64Url(data: Uint8Array): string {
  const chunkSize = 8192;
  let binaryString = '';

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.subarray(i, Math.min(i + chunkSize, data.length));
    for (let j = 0; j < chunk.length; j += 1) {
      binaryString += String.fromCharCode(chunk[j]);
    }
  }

  return btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Extract original image ID from export filename format
 * Format: {originalFilename}-{id}.{extension}
 * Example: "evidence-2b365c5e-0559-4d6a-564f-d40bf1770101.jpg" returns "2b365c5e-0559-4d6a-564f-d40bf1770101"
 * 
 * Since IDs can contain hyphens (like UUIDs), we need to find the hyphen that separates
 * the original filename from the ID. We do this by looking for UUID patterns or taking
 * a reasonable portion from the end.
 */
function extractImageIdFromFilename(exportFilename: string): string | null {
  const leafFilename = getLeafFileName(exportFilename);

  // Remove extension first
  const lastDotIndex = leafFilename.lastIndexOf('.');
  const filenameWithoutExt = lastDotIndex === -1 ? leafFilename : leafFilename.substring(0, lastDotIndex);
  
  // UUID pattern: 8-4-4-4-12 (36 chars including hyphens)
  // Look for a pattern that matches this at the end
  const uuidPattern = /^(.+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
  const match = filenameWithoutExt.match(uuidPattern);
  
  if (match) {
    return match[2]; // Return the UUID part
  }
  
  // Fallback: if not a UUID, assume the ID is everything after the last hyphen
  // This maintains backward compatibility with non-UUID IDs
  const lastHyphenIndex = filenameWithoutExt.lastIndexOf('-');
  
  if (lastHyphenIndex === -1 || lastHyphenIndex === filenameWithoutExt.length - 1) {
    return null; // No hyphen found or hyphen is at the end
  }
  
  return filenameWithoutExt.substring(lastHyphenIndex + 1);
}

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

/**
 * Preview case information from ZIP file without importing
 */
export async function previewCaseImport(zipFile: File, currentUser: User): Promise<CaseImportPreview> {
  const JSZip = (await import('jszip')).default;
  
  try {
    const zip = await JSZip.loadAsync(zipFile);

    // Check if export is encrypted
    const encryptionManifestFile = zip.file('ENCRYPTION_MANIFEST.json');
    if (encryptionManifestFile) {
      let parsedManifest: unknown;
      try {
        const manifestContent = await encryptionManifestFile.async('text');
        parsedManifest = JSON.parse(manifestContent);
      } catch (error) {
        throw new Error(
          `Encrypted export detected but encryption manifest is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { cause: error }
        );
      }

      if (!isEncryptionManifest(parsedManifest)) {
        throw new Error('Encrypted export manifest is missing required fields.');
      }

      const encryptionManifest = parsedManifest;

      // Find the encrypted data file
      const encDataFiles = Object.keys(zip.files).filter(name => /_data\.json$/i.test(name));
      if (encDataFiles.length === 0) {
        throw new Error('No data file found in encrypted case ZIP archive.');
      }
      if (encDataFiles.length > 1) {
        throw new Error('Multiple data files found in encrypted case ZIP archive. The archive may be corrupt or tampered.');
      }

      const encDataFileName = encDataFiles[0];
      const encryptedDataBytes = await zip.file(encDataFileName)?.async('uint8array');
      if (!encryptedDataBytes) {
        throw new Error('Failed to read encrypted data file from ZIP archive.');
      }

      const encryptedDataBase64 = uint8ArrayToBase64Url(encryptedDataBytes);

      // Decrypt data only (no images) to obtain preview metadata
      let decryptedCaseData: CaseExportData;
      try {
        const decryptResult = await decryptExportBatch(
          currentUser,
          encryptionManifest,
          encryptedDataBase64,
          {}
        );
        decryptedCaseData = JSON.parse(decryptResult.plaintext) as CaseExportData;
      } catch (error) {
        throw new Error(
          `Failed to decrypt export for preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { cause: error }
        );
      }

      if (!decryptedCaseData.metadata?.caseNumber) {
        throw new Error('Decrypted export data is missing required case number.');
      }

      // Validate that the data file name matches the decrypted case number
      const encDataFileLeaf = encDataFileName.split('/').filter(Boolean).pop()?.toLowerCase() ?? '';
      const expectedEncDataFile = `${decryptedCaseData.metadata.caseNumber.toLowerCase()}_data.json`;
      if (encDataFileLeaf !== expectedEncDataFile) {
        throw new Error(
          `Data file name does not match case number. ` +
          `Expected "${expectedEncDataFile}", found "${encDataFileLeaf}". ` +
          'The archive may be corrupt or tampered.'
        );
      }

      // Prefer totalFiles from decrypted metadata; fall back to counting image entries
      let totalFiles = decryptedCaseData.metadata.totalFiles ?? 0;
      if (!totalFiles) {
        const imagesFolder = zip.folder('images');
        if (imagesFolder) {
          for (const [, file] of Object.entries(imagesFolder.files)) {
            if (!file.dir && file.name.includes('/')) {
              totalFiles++;
            }
          }
        }
      }

      const hasForensicManifest = zip.file('FORENSIC_MANIFEST.json') !== null;
      const isArchivedExport = isArchivedExportData(decryptedCaseData);
      const hasAnnotations = decryptedCaseData.files.some(f => f.hasAnnotations);

      // Designated reviewer check — must run before returning preview data
      const designatedReviewerEmail = decryptedCaseData.metadata.designatedReviewerEmail;
      if (designatedReviewerEmail) {
        if (!currentUser.email) {
          throw new Error(
            'Unable to verify reviewer designation: your account email is unavailable.'
          );
        }
        if (designatedReviewerEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
          throw new Error(
            'This case package is designated for a specific reviewer. You are not authorized to import this case.'
          );
        }
      }

      return {
        caseNumber: decryptedCaseData.metadata.caseNumber,
        archived: isArchivedExport,
        exportedBy: decryptedCaseData.metadata.exportedBy,
        exportedByName: decryptedCaseData.metadata.exportedByName || null,
        exportedByCompany: decryptedCaseData.metadata.exportedByCompany || null,
        exportedByBadgeId: decryptedCaseData.metadata.exportedByBadgeId ?? null,
        exportDate: decryptedCaseData.metadata.exportDate,
        totalFiles,
        caseCreatedDate: decryptedCaseData.metadata.caseCreatedDate ?? undefined,
        hasAnnotations,
        validationSummary: 'Export decrypted successfully. Full integrity validation will occur during import.',
        hashValid: undefined,
        hashError: undefined,
        validationDetails: {
          hasForensicManifest,
          dataValid: undefined,
          manifestValid: undefined,
          signatureValid: undefined,
          validationSummary: 'Encrypted export — integrity validation deferred to import stage',
          integrityErrors: []
        }
      };
    }

    throw new Error(
      'This case package is not encrypted. Only encrypted case packages exported from Striae can be imported.'
    );

  } catch (error) {
    console.error('Error previewing case import:', error);
    throw new Error(`Failed to preview case: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error });
  }
}

/**
 * Parse and validate ZIP file contents for case import
 */
export async function parseImportZip(zipFile: File): Promise<{
  caseData: CaseExportData;
  imageIdMapping: { [exportFilename: string]: string }; // exportFilename -> originalImageId
  isArchivedExport: boolean;
  bundledAuditFiles?: {
    auditTrailContent?: string;
    auditSignatureContent?: string;
  };
  metadata?: Record<string, unknown>;
  cleanedContent?: string; // Add cleaned content for hash validation
  verificationPublicKeyPem?: string;
  encryptionManifest?: Record<string, unknown>; // Optional: decryption metadata
  encryptedDataBase64?: string; // Optional: encrypted data file content (base64url)
  encryptedImages?: { [filename: string]: string }; // Optional: encrypted image files (filename -> base64url)
  isEncrypted?: boolean;
  dataFileName?: string; // The encrypted data file name (leaf), for post-decrypt case number validation
}> {
  // Dynamic import of JSZip to avoid bundle size issues
  const JSZip = (await import('jszip')).default;
  
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const verificationPublicKeyPem = await extractVerificationPublicKeyFromZip(zip);
    
    // Find the main data file (JSON)
    const dataFiles = Object.keys(zip.files).filter(name => 
      name.endsWith('_data.json')
    );
    
    if (dataFiles.length === 0) {
      throw new Error('No valid JSON data file found in ZIP archive');
    }
    
    if (dataFiles.length > 1) {
      throw new Error('Multiple data files found in ZIP archive');
    }
    
    const dataFileName = dataFiles[0];

    // Only encrypted case packages are supported
    const encryptionManifestFile = zip.file('ENCRYPTION_MANIFEST.json');
    if (!encryptionManifestFile) {
      throw new Error(
        'This case package is not encrypted. Only encrypted case packages exported from Striae can be imported.'
      );
    }

    let encryptionManifest: Record<string, unknown>;
    let encryptedDataBase64: string;
    const encryptedImages: { [filename: string]: string } = {};
    const imageIdMapping: { [exportFilename: string]: string } = {};
    const isEncrypted = true;

    let caseData: CaseExportData;
    let parsedCaseData: unknown;
    const cleanedContent = '';

    try {
      const manifestContent = await encryptionManifestFile.async('text');
      encryptionManifest = JSON.parse(manifestContent) as Record<string, unknown>;

        // Extract the encrypted data file
        const dataContent = await zip.file(dataFileName)?.async('uint8array');
        if (!dataContent) {
          throw new Error('Failed to read encrypted data file from ZIP');
        }
        // Convert to base64url for transmission to worker (chunked to avoid stack overflow)
        encryptedDataBase64 = uint8ArrayToBase64Url(dataContent);

        // Extract encrypted files referenced by encrypted export payloads
        const encryptedImagePromises: Promise<[string, string]>[] = [];
        
        const fileList = Object.keys(zip.files);
        for (const filePath of fileList) {
          const isImageFile = filePath.startsWith('images/') && filePath !== 'images/';
          const isBundledAuditFile =
            filePath === 'audit/case-audit-trail.json' ||
            filePath === 'audit/case-audit-signature.json';

          if ((!isImageFile && !isBundledAuditFile) || filePath.endsWith('/')) {
            continue;
          }
          
          const file = zip.files[filePath];
          if (!file || file.dir) {
            continue;
          }
          
          const filename = isImageFile ? filePath.replace(/^images\//, '') : filePath;

          if (isImageFile) {
            const originalImageId = extractImageIdFromFilename(filename);
            if (originalImageId) {
              imageIdMapping[filename] = originalImageId;
            }
          }

          encryptedImagePromises.push((async () => {
            try {
              const encryptedBlob = await file.async('uint8array');
              // Convert to base64url (chunked to avoid stack overflow)
              const encryptedBase64Url = uint8ArrayToBase64Url(encryptedBlob);
              return [filename, encryptedBase64Url] as [string, string];
            } catch (err) {
              throw new Error(`Failed to extract encrypted image ${filename}: ${err instanceof Error ? err.message : 'Unknown error'}`, { cause: err });
            }
          })());
        }
        
        // Wait for all image conversions
        const encryptedImageResults = await Promise.all(encryptedImagePromises);
        for (const [filename, data] of encryptedImageResults) {
          encryptedImages[filename] = data;
        }

        // For encrypted exports, data file will be processed after decryption
        // Set placeholder values that will be replaced after decryption
      caseData = { metadata: { caseNumber: 'ENCRYPTED' } } as CaseExportData;
      parsedCaseData = caseData;
    } catch (error) {
      throw new Error(`Failed to process encrypted export: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error });
    }

    const isArchivedExport = isArchivedExportData(parsedCaseData);

    // Extract forensic manifest if present
    let metadata: Record<string, unknown> | undefined;
    const manifestFile = zip.file('FORENSIC_MANIFEST.json');
    // Audit trail files are encrypted — decrypted by the orchestrator
    const auditTrailContent: string | undefined = undefined;
    const auditSignatureContent: string | undefined = undefined;
    
    if (manifestFile) {
      const manifestContent = await manifestFile.async('text');
      metadata = { forensicManifest: JSON.parse(manifestContent) as unknown };
    }
    
    return {
      caseData,
      imageIdMapping,
      isArchivedExport,
      bundledAuditFiles: {
        auditTrailContent,
        auditSignatureContent
      },
      metadata,
      cleanedContent,
      verificationPublicKeyPem,
      encryptionManifest,
      encryptedDataBase64,
      encryptedImages: Object.keys(encryptedImages).length > 0 ? encryptedImages : undefined,
      isEncrypted,
      dataFileName
    };
    
  } catch (error) {
    console.error('Error parsing ZIP file:', error);
    throw new Error(`Failed to parse ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error });
  }
}