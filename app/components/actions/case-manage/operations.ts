import type { User } from 'firebase/auth';
import type * as CaseExportActions from '~/components/actions/case-export';
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
  moveCaseConfirmationSummary,
  removeCaseConfirmationSummary
} from '~/utils/data';
import { type CaseData, type CaseExportData, type ValidationAuditEntry } from '~/types';
import { auditService } from '~/services/audit';
import { buildArchivePackage } from './archive-package-builder';
import { deleteFileWithoutAudit } from './delete-helpers';
import { isReadOnlyCaseData, sortCaseNumbers, validateCaseNumber } from './utils';
import { type CaseArchiveDetails, type DeleteCaseResult } from './types';

type CaseExportActionsModule = typeof CaseExportActions;

let caseExportActionsPromise: Promise<CaseExportActionsModule> | null = null;

const loadCaseExportActions = (): Promise<CaseExportActionsModule> => {
  if (!caseExportActionsPromise) {
    caseExportActionsPromise = import('~/components/actions/case-export').catch((error: unknown) => {
      caseExportActionsPromise = null;
      throw error;
    });
  }

  return caseExportActionsPromise;
};

/**
 * Delete a file without individual audit logging (for bulk operations)
 * This reduces API calls during bulk deletions
 */
export type { DeleteCaseResult, CaseArchiveDetails };
export { validateCaseNumber };

/**
 * Derive archive details from already-fetched case data without making an additional
 * network request. Use this when CaseData is already available to avoid a redundant fetch.
 */
export const deriveCaseArchiveDetails = (caseData: CaseData | null): CaseArchiveDetails => {
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
};

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

export const checkExistingCase = async (user: User, caseNumber: string): Promise<CaseData | null> => {
  try {
    // Try to get case data - if user doesn't have access, it means case doesn't exist for them
    const caseData = await getCaseData(user, caseNumber);
    
    if (!caseData) {
      return null;
    }

    // Imported review cases are read-only and should not be treated as regular cases.
    // Archived cases remain regular case records even if legacy data includes isReadOnly.
    if ('isReadOnly' in caseData && caseData.isReadOnly && !caseData.archived) {
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

    // Use type guard to check for isReadOnly property safely
    return isReadOnlyCaseData(caseData) ? !!caseData.isReadOnly : false;
    
  } catch (error) {
    console.error('Error checking if case is read-only:', error);
    return false;
  }
};

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

    // 5) Move confirmation summary metadata to the new case number
    await moveCaseConfirmationSummary(user, oldCaseNumber, newCaseNumber);

    // 6) Delete old case number in user's KV entry
    await removeUserCase(user, oldCaseNumber);

    // Log successful case rename under the original case number context
    const endTime = Date.now();
    await auditService.logCaseRename(
      user,
      oldCaseNumber,
      oldCaseNumber,
      newCaseNumber
    );

    // Log creation of the new case number as a rename-derived case
    await auditService.logCaseCreation(
      user,
      newCaseNumber,
      newCaseNumber,
      oldCaseNumber
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

      // Clean up confirmation status metadata for this case
      try {
        await removeCaseConfirmationSummary(user, caseNumber);
      } catch (summaryError) {
        console.warn(`Failed to remove confirmation summary for case ${caseNumber}:`, summaryError);
      }

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

    // Clean up confirmation status metadata for this case
    try {
      await removeCaseConfirmationSummary(user, caseNumber);
    } catch (summaryError) {
      console.warn(`Failed to remove confirmation summary for case ${caseNumber}:`, summaryError);
    }

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
      isReadOnly: false,
    } as CaseData;

    const { exportCaseData, formatDateForFilename } = await loadCaseExportActions();
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
    const archiveAuditEntry: ValidationAuditEntry = {
      timestamp: archivedAt,
      userId: user.uid,
      userEmail: user.email || '',
      action: 'case-archive',
      result: 'success',
      details: {
        fileName: `${caseNumber}.case`,
        fileType: 'case-package',
        validationErrors: [],
        caseNumber,
        workflowPhase: 'casework',
        caseDetails: {
          newCaseName: caseNumber,
          archiveReason: archiveReason?.trim() || 'No reason provided',
          totalFiles: archiveData.files?.length || 0,
          lastModified: archivedAt,
        },
        performanceMetrics: {
          processingTimeMs: Date.now() - startTime,
          fileSizeBytes: 0,
        },
      },
    };

    const archivePackage = await buildArchivePackage({
      user,
      caseNumber,
      caseJsonContent,
      files: exportData.files,
      auditConfig: {
        startDate: caseData.createdAt,
        endDate: archivedAt,
        additionalEntries: [archiveAuditEntry],
      },
      readmeConfig: {
        archivedAt,
        archivedByDisplay,
        archiveReason: archiveReason?.trim() || undefined,
      },
    });

    await updateCaseData(user, caseNumber, archiveData);

    // Clean up confirmation status metadata for this archived case
    try {
      await removeCaseConfirmationSummary(user, caseNumber);
    } catch (summaryError) {
      console.warn(`Failed to remove confirmation summary for case ${caseNumber}:`, summaryError);
    }

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

    const downloadUrl = URL.createObjectURL(archivePackage.zipBlob);
    const archiveFileName = `striae-case-${caseNumber}-archive-${formatDateForFilename(new Date())}-encrypted.zip`;
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
        manifestSignatureKeyId: archivePackage.manifestSignatureKeyId,
      },
      performanceMetrics: {
        processingTimeMs: Date.now() - startTime,
        fileSizeBytes: archivePackage.zipBlob.size,
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