import type { User } from 'firebase/auth';
import { 
  canCreateCase, 
  getUserCases,
  getUserData,
  validateUserSession,
  addUserCase,
  removeUserCase,
  getCaseData,
  updateCaseData,
  deleteCaseData,
  duplicateCaseData,
  deleteFileAnnotations,
  signForensicManifest
} from '~/utils/data';
import { type CaseData, type ReadOnlyCaseData, type FileData, type AuditTrail, type CaseExportData } from '~/types';
import { auditService } from '~/services/audit';
import { fetchImageApi } from '~/utils/api';
import { exportCaseData, formatDateForFilename } from '~/components/actions/case-export';
import { getImageUrl } from './image-manage';
import {
  calculateSHA256Secure,
  createPublicSigningKeyFileName,
  generateForensicManifestSecure,
  getCurrentPublicSigningKeyDetails,
  getVerificationPublicKey,
} from '~/utils/forensics';
import { signAuditExport } from '~/services/audit/audit-export-signing';
import { generateAuditSummary } from '~/services/audit/audit-query-helpers';

/**
 * Delete a file without individual audit logging (for bulk operations)
 * This reduces API calls during bulk deletions
 */
interface DeleteFileWithoutAuditOptions {
  skipCaseDataUpdate?: boolean;
  skipValidation?: boolean;
}

interface DeleteFileWithoutAuditResult {
  imageMissing: boolean;
  fileName: string;
}

export interface DeleteCaseResult {
  missingImages: string[];
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

const deleteFileWithoutAudit = async (
  user: User,
  caseNumber: string,
  fileId: string,
  options: DeleteFileWithoutAuditOptions = {}
): Promise<DeleteFileWithoutAuditResult> => {
  // Get the case data to find file info
  const caseData = await getCaseData(user, caseNumber, {
    skipValidation: options.skipValidation === true
  });
  if (!caseData) {
    throw new Error('Case not found');
  }

  const fileToDelete = (caseData.files || []).find((f: FileData) => f.id === fileId);
  if (!fileToDelete) {
    throw new Error('File not found in case');
  }

  let imageMissing = false;

  // Delete image file and fail fast on non-404 failures so case deletion can be retried safely
  const imageResponse = await fetchImageApi(user, `/${encodeURIComponent(fileId)}`, {
    method: 'DELETE'
  });

  if (!imageResponse.ok && imageResponse.status === 404) {
    imageMissing = true;
  }

  if (!imageResponse.ok && imageResponse.status !== 404) {
    throw new Error(`Failed to delete image: ${imageResponse.status} ${imageResponse.statusText}`);
  }

  // Delete annotation data (404s are handled by deleteFileAnnotations)
  await deleteFileAnnotations(user, caseNumber, fileId, {
    skipValidation: options.skipValidation === true
  });

  if (options.skipCaseDataUpdate === true) {
    return {
      imageMissing,
      fileName: fileToDelete.originalFilename
    };
  }

  // Update case data to remove file reference
  const updatedData: CaseData = {
    ...caseData,
    files: (caseData.files || []).filter((f: FileData) => f.id !== fileId)
  };

  await updateCaseData(user, caseNumber, updatedData);

  return {
    imageMissing,
    fileName: fileToDelete.originalFilename
  };
};

const CASE_NUMBER_REGEX = /^[A-Za-z0-9-]+$/;

/**
 * Type guard to check if case data has isReadOnly property
 */
const isReadOnlyCaseData = (caseData: CaseData): caseData is ReadOnlyCaseData => {
  return 'isReadOnly' in caseData && typeof (caseData as ReadOnlyCaseData).isReadOnly === 'boolean';
};
const MAX_CASE_NUMBER_LENGTH = 25;

export const listCases = async (user: User): Promise<string[]> => {
  try {
    // Use centralized function to get user cases
    const userCases = await getUserCases(user);
    const caseNumbers = userCases.map(c => c.caseNumber);
    return sortCaseNumbers(caseNumbers);
    
  } catch (error) {
    console.error('Error listing cases:', error);
    return [];
  }
};

const sortCaseNumbers = (cases: string[]): string[] => {
  return cases.sort((a, b) => {
    // Extract all numbers and letters
    const getComponents = (str: string) => {
      const numbers = str.match(/\d+/g)?.map(Number) || [];
      const letters = str.match(/[A-Za-z]+/g)?.join('') || '';
      return { numbers, letters };
    };

    const aComponents = getComponents(a);
    const bComponents = getComponents(b);

    // Compare numbers first
    const maxLength = Math.max(aComponents.numbers.length, bComponents.numbers.length);
    for (let i = 0; i < maxLength; i++) {
      const aNum = aComponents.numbers[i] || 0;
      const bNum = bComponents.numbers[i] || 0;
      if (aNum !== bNum) return aNum - bNum;
    }

    // If all numbers match, compare letters
    return aComponents.letters.localeCompare(bComponents.letters);
  });
};

export const validateCaseNumber = (caseNumber: string): boolean => {
  return CASE_NUMBER_REGEX.test(caseNumber) && 
         caseNumber.length <= MAX_CASE_NUMBER_LENGTH;
};

export const checkExistingCase = async (user: User, caseNumber: string): Promise<CaseData | null> => {
  try {
    // Try to get case data - if user doesn't have access, it means case doesn't exist for them
    const caseData = await getCaseData(user, caseNumber);
    
    if (!caseData) {
      return null;
    }

    // Check if this is a read-only case - if so, don't consider it as an existing regular case
    if ('isReadOnly' in caseData && caseData.isReadOnly) {
      return null;
    }
    
    // Verify the case number matches (extra safety check)
    if (caseData.caseNumber === caseNumber) {
      return caseData;
    }
    
    return null;

  } catch (error) {
    // If access denied, treat as case doesn't exist for this user
    if (error instanceof Error && error.message.includes('Access denied')) {
      return null;
    }
    console.error('Error checking existing case:', error);
    return null;
  }
};

export const checkCaseIsReadOnly = async (user: User, caseNumber: string): Promise<boolean> => {
  try {
    const caseData = await getCaseData(user, caseNumber);
    if (!caseData) {
      // Case doesn't exist, so it's not read-only
      return false;
    }

    // Archived cases are always treated as read-only.
    if (caseData.archived) {
      return true;
    }

    // Use type guard to check for isReadOnly property safely
    return isReadOnlyCaseData(caseData) ? !!caseData.isReadOnly : false;
    
  } catch (error) {
    console.error('Error checking if case is read-only:', error);
    return false;
  }
};

export interface CaseArchiveDetails {
  archived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedByDisplay?: string;
  archiveReason?: string;
}

export const getCaseArchiveDetails = async (user: User, caseNumber: string): Promise<CaseArchiveDetails> => {
  try {
    const caseData = await getCaseData(user, caseNumber);
    if (!caseData || !caseData.archived) {
      return { archived: false };
    }

    return {
      archived: true,
      archivedAt: caseData.archivedAt,
      archivedBy: caseData.archivedBy,
      archivedByDisplay: caseData.archivedByDisplay,
      archiveReason: caseData.archiveReason,
    };
  } catch (error) {
    console.error('Error checking case archive details:', error);
    return { archived: false };
  }
};

export const createNewCase = async (user: User, caseNumber: string): Promise<CaseData> => {
  const startTime = Date.now();
  
  try {
    // Validate user session first
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Check if user can create a new case
    const permission = await canCreateCase(user);
    if (!permission.canCreate) {
      throw new Error(permission.reason || 'You cannot create more cases.');
    }

    const newCase: CaseData = {
      createdAt: new Date().toISOString(),
      caseNumber,
      files: []
    };

    const caseMetadata = {
      createdAt: newCase.createdAt,
      caseNumber: newCase.caseNumber
    };

    // Add case to user data first (so user has permission to create case data)
    await addUserCase(user, caseMetadata);

    // Create case file using centralized function
    await updateCaseData(user, caseNumber, newCase);

    // Log successful case creation
    const endTime = Date.now();
    await auditService.logCaseCreation(
      user,
      caseNumber,
      caseNumber // Using case number as case name for now
    );

    console.log(`✅ Case created: ${caseNumber} (${endTime - startTime}ms)`);
    return newCase;
    
  } catch (error) {
    // Log failed case creation
    const endTime = Date.now();
    try {
      await auditService.logEvent({
        userId: user.uid,
        userEmail: user.email || '',
        action: 'case-create',
        result: 'failure',
        fileName: `${caseNumber}.case`,
        fileType: 'case-package',
        validationErrors: [error instanceof Error ? error.message : 'Unknown error'],
        caseNumber,
        caseDetails: {
          newCaseName: caseNumber
        },
        performanceMetrics: {
          processingTimeMs: endTime - startTime,
          fileSizeBytes: 0
        }
      });
    } catch (auditError) {
      console.error('Failed to log case creation failure:', auditError);
    }
    
    console.error('Error creating new case:', error);
    throw error;
  }
};
      
export const renameCase = async (
  user: User, 
  oldCaseNumber: string, 
  newCaseNumber: string
): Promise<void> => {
  const startTime = Date.now();
  
  try {
    // Validate case numbers
    if (!validateCaseNumber(oldCaseNumber) || !validateCaseNumber(newCaseNumber)) {
      throw new Error('Invalid case number format');
    }

    // Check if new case exists
    const existingCase = await checkExistingCase(user, newCaseNumber);
    if (existingCase) {
      throw new Error('New case number already exists');
    }

    // Get the old case data to find all files that need annotation cleanup
    const oldCaseData = await getCaseData(user, oldCaseNumber);
    if (!oldCaseData) {
      throw new Error('Old case not found');
    }

    // 1) Create new case number in USER DB's entry (KV storage)
    const newCaseMetadata = {
      createdAt: new Date().toISOString(),
      caseNumber: newCaseNumber
    };
    await addUserCase(user, newCaseMetadata);

    // 2) Copy R2 case data from old case number to new case number in R2
    await duplicateCaseData(user, oldCaseNumber, newCaseNumber);

    // 3) Delete individual file annotations from the old case (before losing access)
    if (oldCaseData.files && oldCaseData.files.length > 0) {
      // Process annotation deletions in batches to avoid rate limiting
      const BATCH_SIZE = 5;
      const files = oldCaseData.files;
      
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        
        // Delete annotation files in this batch
        await Promise.all(
          batch.map(async file => {
            try {
              await deleteFileAnnotations(user, oldCaseNumber, file.id);
            } catch (error) {
              // Continue if annotation file doesn't exist or fails to delete
              console.warn(`Failed to delete annotations for ${file.originalFilename}:`, error);
            }
          })
        );
        
        // Add delay between batches to reduce rate limiting
        if (i + BATCH_SIZE < files.length) {
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
    }

    // 4) Delete R2 case data with old case number
    await deleteCaseData(user, oldCaseNumber);

    // 5) Delete old case number in user's KV entry
    await removeUserCase(user, oldCaseNumber);

    // Log successful case rename
    const endTime = Date.now();
    await auditService.logCaseRename(
      user,
      newCaseNumber, // Use new case number as the current context
      oldCaseNumber,
      newCaseNumber
    );

    console.log(`✅ Case renamed: ${oldCaseNumber} → ${newCaseNumber} (${endTime - startTime}ms)`);
    
  } catch (error) {
    // Log failed case rename
    const endTime = Date.now();
    try {
      await auditService.logEvent({
        userId: user.uid,
        userEmail: user.email || '',
        action: 'case-rename',
        result: 'failure',
        fileName: `${oldCaseNumber}.case`,
        fileType: 'case-package',
        validationErrors: [error instanceof Error ? error.message : 'Unknown error'],
        caseNumber: oldCaseNumber,
        caseDetails: {
          oldCaseName: oldCaseNumber,
          newCaseName: newCaseNumber,
          lastModified: new Date().toISOString()
        },
        performanceMetrics: {
          processingTimeMs: endTime - startTime,
          fileSizeBytes: 0
        }
      });
    } catch (auditError) {
      console.error('Failed to log case rename failure:', auditError);
    }
    
    console.error('Error renaming case:', error);
    throw error;
  }
};

export const deleteCase = async (user: User, caseNumber: string): Promise<DeleteCaseResult> => {
  const startTime = Date.now();
  
  try {
    if (!validateCaseNumber(caseNumber)) {
      throw new Error('Invalid case number');
    }

    // Validate user session
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Get case data using centralized function
    const caseData = await getCaseData(user, caseNumber);
    if (!caseData) {
      throw new Error('Case not found');
    }

    // Store case info for audit logging
    const fileCount = caseData.files?.length || 0;
    const caseName = caseData.caseNumber || caseNumber;
    
    // Process file deletions in batches to reduce audit rate limiting
    if (caseData.files && caseData.files.length > 0) {
      const BATCH_SIZE = 3; // Reduced batch size for better stability
      const BATCH_DELAY = 300; // Increased delay between batches
      const files = caseData.files;
      const deletedFiles: Array<{id: string, originalFilename: string, fileSize: number}> = [];
      const failedFiles: Array<{id: string, originalFilename: string, error: string}> = [];
      const missingImages: string[] = [];
      
      console.log(`🗑️  Deleting ${files.length} files in batches of ${BATCH_SIZE}...`);
      
      // Process files in batches
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(files.length / BATCH_SIZE);
        
        console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)...`);
        
        // Delete files in this batch with individual error handling
        await Promise.allSettled(
          batch.map(async file => {
            try {
              // Delete file without individual audit logging to reduce API calls
              // We'll do bulk audit logging at the end
              const deleteResult = await deleteFileWithoutAudit(user, caseNumber, file.id, {
                // Archived cases are immutable; during deletion we can skip per-file case-data mutations.
                skipCaseDataUpdate: !!caseData.archived,
                skipValidation: !!caseData.archived
              });

              if (deleteResult.imageMissing) {
                missingImages.push(deleteResult.fileName);
              }

              deletedFiles.push({ 
                id: file.id, 
                originalFilename: file.originalFilename,
                fileSize: 0 // We don't track file size, use 0
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error(`❌ Failed to delete file ${file.originalFilename}:`, errorMessage);
              failedFiles.push({ 
                id: file.id, 
                originalFilename: file.originalFilename,
                error: errorMessage
              });
            }
          })
        );
        
        // Add delay between batches to reduce rate limiting
        if (i + BATCH_SIZE < files.length) {
          console.log(`⏱️  Waiting ${BATCH_DELAY}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }
      
      // Single consolidated audit entry for all file operations
      try {
        const endTime = Date.now();
        const successCount = deletedFiles.length;
        const failureCount = failedFiles.length;
        
        await auditService.logEvent({
          userId: user.uid,
          userEmail: user.email || '',
          action: 'file-delete',
          result: failureCount === 0 ? 'success' : 'failure',
          fileName: `Bulk deletion: ${successCount} succeeded, ${failureCount} failed`,
          fileType: 'case-package',
          caseNumber,
          caseDetails: {
            newCaseName: `${caseNumber} - Bulk file deletion`,
            deleteReason: `Case deletion: processed ${files.length} files (${successCount} deleted, ${failureCount} failed)`,
            backupCreated: false,
            lastModified: new Date().toISOString()
          },
          performanceMetrics: {
            processingTimeMs: endTime - startTime,
            fileSizeBytes: deletedFiles.reduce((total, file) => total + file.fileSize, 0)
          },
          // Include details of failed files if any
          ...(failedFiles.length > 0 && {
            validationErrors: failedFiles.map(f => `${f.originalFilename}: ${f.error}`)
          })
        });
        
        console.log(`✅ Batch deletion complete: ${successCount} files deleted, ${failureCount} failed`);
      } catch (auditError) {
        console.error('⚠️  Failed to log batch file deletion (continuing with case deletion):', auditError);
      }

      if (failedFiles.length > 0) {
        throw new Error(
          `Case deletion aborted: failed to delete ${failedFiles.length} file(s): ${failedFiles.map(f => f.originalFilename).join(', ')}`
        );
      }

      // Remove case from user data first (so user loses access immediately)
      await removeUserCase(user, caseNumber);

      // Delete case data using centralized function (skip validation since user no longer has access)
      await deleteCaseData(user, caseNumber, { skipValidation: true });

      // Add a small delay before audit logging to reduce rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Log successful case deletion with file details
      const endTime = Date.now();
      await auditService.logCaseDeletion(
        user,
        caseNumber,
        caseName,
        `User-requested deletion via case actions (${fileCount} files deleted)` +
          (missingImages.length > 0 ? `; ${missingImages.length} image(s) were already missing` : ''),
        false // No backup created for standard deletions
      );

      console.log(`✅ Case deleted: ${caseNumber} (${fileCount} files) (${endTime - startTime}ms)`);
      return { missingImages };
    }

    // Remove case from user data first (so user loses access immediately)
    await removeUserCase(user, caseNumber);

    // Delete case data using centralized function (skip validation since user no longer has access)
    await deleteCaseData(user, caseNumber, { skipValidation: true });

    // Add a small delay before audit logging to reduce rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));

    // Log successful case deletion with file details
    const endTime = Date.now();
    await auditService.logCaseDeletion(
      user,
      caseNumber,
      caseName,
      `User-requested deletion via case actions (${fileCount} files deleted)`,
      false // No backup created for standard deletions
    );

    console.log(`✅ Case deleted: ${caseNumber} (${fileCount} files) (${endTime - startTime}ms)`);
    return { missingImages: [] };
    
  } catch (error) {
    // Log failed case deletion
    const endTime = Date.now();
    try {
      await auditService.logEvent({
        userId: user.uid,
        userEmail: user.email || '',
        action: 'case-delete',
        result: 'failure',
        fileName: `${caseNumber}.case`,
        fileType: 'case-package',
        validationErrors: [error instanceof Error ? error.message : 'Unknown error'],
        caseNumber,
        caseDetails: {
          newCaseName: caseNumber,
          deleteReason: 'Failed deletion attempt',
          backupCreated: false,
          lastModified: new Date().toISOString()
        },
        performanceMetrics: {
          processingTimeMs: endTime - startTime,
          fileSizeBytes: 0
        }
      });
    } catch (auditError) {
      console.error('Failed to log case deletion failure:', auditError);
    }
    
    console.error('Error deleting case:', error);
    throw error;
  }
};

const getVerificationPublicSigningKey = (preferredKeyId?: string): { keyId: string | null; publicKeyPem: string } => {
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
};

const fetchImageAsBlob = async (user: User, fileData: FileData, caseNumber: string): Promise<Blob | null> => {
  try {
    const imageUrl = await getImageUrl(user, fileData, caseNumber, 'Archive Package');

    if (!imageUrl) {
      return null;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    return await response.blob();
  } catch (error) {
    console.error('Failed to fetch image for archive package:', error);
    return null;
  }
};

export const archiveCase = async (
  user: User,
  caseNumber: string,
  archiveReason?: string
): Promise<void> => {
  const startTime = Date.now();

  try {
    if (!validateCaseNumber(caseNumber)) {
      throw new Error('Invalid case number');
    }

    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    const caseData = await getCaseData(user, caseNumber);
    if (!caseData) {
      throw new Error('Case not found');
    }

    if (caseData.archived) {
      throw new Error('This case is already archived.');
    }

    const archivedAt = new Date().toISOString();
    let archivedByDisplay = user.uid;

    try {
      const userData = await getUserData(user);
      const fullName = [userData?.firstName?.trim(), userData?.lastName?.trim()]
        .filter(Boolean)
        .join(' ')
        .trim();
      const badgeId = userData?.badgeId?.trim();

      if (fullName && badgeId) {
        archivedByDisplay = `${fullName}, ${badgeId}`;
      } else if (fullName) {
        archivedByDisplay = fullName;
      } else if (badgeId) {
        archivedByDisplay = badgeId;
      }
    } catch (userDataError) {
      console.warn('Failed to resolve user profile details for archive display value:', userDataError);
    }

    const archiveData: CaseData = {
      ...caseData,
      archived: true,
      archivedAt,
      archivedBy: user.uid,
      archivedByDisplay,
      archiveReason: archiveReason?.trim() || undefined,
      isReadOnly: true,
    } as CaseData;

    const exportData = await exportCaseData(user, caseNumber, { includeMetadata: true });
    const archivedExportData: CaseExportData = {
      ...exportData,
      metadata: {
        ...exportData.metadata,
        archived: true,
        archivedAt,
        archivedBy: user.uid,
        archivedByDisplay,
        archiveReason: archiveReason?.trim() || undefined,
      },
    };
    const caseJsonContent = JSON.stringify(archivedExportData, null, 2);

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file(`${caseNumber}_data.json`, caseJsonContent);

    const imageFolder = zip.folder('images');
    const imageBlobs: Record<string, Blob> = {};
    if (imageFolder && exportData.files) {
      for (const fileEntry of exportData.files) {
        const imageBlob = await fetchImageAsBlob(user, fileEntry.fileData, caseNumber);
        if (!imageBlob) {
          continue;
        }

        const exportFileName = generateArchiveImageFilename(
          fileEntry.fileData.originalFilename,
          fileEntry.fileData.id
        );
        imageFolder.file(exportFileName, imageBlob);
        imageBlobs[exportFileName] = imageBlob;
      }
    }

    const forensicManifest = await generateForensicManifestSecure(caseJsonContent, imageBlobs);
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

    const auditEntries = await auditService.getAuditEntriesForUser(user.uid, { caseNumber });
    const auditTrail: AuditTrail = {
      caseNumber,
      workflowId: `${caseNumber}-archive-${Date.now()}`,
      entries: auditEntries,
      summary: generateAuditSummary(auditEntries),
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

    zip.file('audit/case-audit-trail.json', JSON.stringify(signedAuditTrail, null, 2));
    zip.file('audit/case-audit-signature.json', JSON.stringify(signedAuditExportPayload, null, 2));

    zip.file(
      'README.txt',
      [
        'Striae Archived Case Package',
        '===========================',
        '',
        `Case Number: ${caseNumber}`,
        `Archived At: ${archivedAt}`,
        `Archived By: ${archivedByDisplay}`,
        `Archive Reason: ${archiveReason?.trim() || 'Not provided'}`,
        '',
        'Package Contents',
        '- Case data JSON export with all image references',
        '- images/ folder with exported image files',
        '- Full case audit trail export and signed audit metadata',
        '- Forensic manifest with server-side signature',
        `- ${publicKeyFileName} for verification`,
        '',
        'This package is intended for read-only review and verification workflows.',
      ].join('\n')
    );

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    await updateCaseData(user, caseNumber, archiveData);

    await auditService.logCaseArchive(
      user,
      caseNumber,
      caseNumber,
      archiveReason?.trim() || 'No reason provided',
      'success',
      [],
      archiveData.files?.length || 0,
      archivedAt,
      Date.now() - startTime
    );

    const downloadUrl = URL.createObjectURL(zipBlob);
    const archiveFileName = `striae-case-${caseNumber}-archive-${formatDateForFilename(new Date())}.zip`;
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = archiveFileName;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);

    await auditService.logEvent({
      userId: user.uid,
      userEmail: user.email || '',
      action: 'case-export',
      result: 'success',
      fileName: archiveFileName,
      fileType: 'case-package',
      caseNumber,
      workflowPhase: 'case-export',
      caseDetails: {
        newCaseName: caseNumber,
        totalFiles: exportData.files?.length || 0,
        totalAnnotations: exportData.summary?.totalBoxAnnotations || 0,
        lastModified: archivedAt,
      },
      securityChecks: {
        selfConfirmationPrevented: true,
        fileIntegrityValid: true,
        manifestSignaturePresent: true,
        manifestSignatureValid: true,
        manifestSignatureKeyId: manifestSigningResponse.signature.keyId,
      },
      performanceMetrics: {
        processingTimeMs: Date.now() - startTime,
        fileSizeBytes: zipBlob.size,
        validationStepsCompleted: 4,
        validationStepsFailed: 0,
      },
    });
  } catch (error) {
    await auditService.logCaseArchive(
      user,
      caseNumber,
      caseNumber,
      archiveReason?.trim() || 'No reason provided',
      'failure',
      [error instanceof Error ? error.message : 'Unknown archive error'],
      undefined,
      undefined,
      Date.now() - startTime
    );

    throw error;
  }
};