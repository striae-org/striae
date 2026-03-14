import type { User } from 'firebase/auth';
import { 
  canCreateCase, 
  getUserCases,
  validateUserSession,
  addUserCase,
  removeUserCase
} from '~/utils/permissions';
import { 
  getCaseData,
  updateCaseData,
  deleteCaseData,
  duplicateCaseData,
  deleteFileAnnotations
} from '~/utils/data-operations';
import { type CaseData, type ReadOnlyCaseData, type FileData } from '~/types';
import { auditService } from '~/services/audit';
import { getImageApiKey } from '~/utils/auth';
import paths from '~/config/config.json';

/**
 * Delete a file without individual audit logging (for bulk operations)
 * This reduces API calls during bulk deletions
 */
const deleteFileWithoutAudit = async (user: User, caseNumber: string, fileId: string): Promise<void> => {
  // Get the case data to find file info
  const caseData = await getCaseData(user, caseNumber);
  if (!caseData) {
    throw new Error('Case not found');
  }
  
  const fileToDelete = (caseData.files || []).find((f: FileData) => f.id === fileId);
  if (!fileToDelete) {
    throw new Error('File not found in case');
  }

  // Delete the image file from Cloudflare Images (but don't audit this individual operation)
  try {
    const IMAGE_URL = paths.image_worker_url;
    
    const imagesApiToken = await getImageApiKey();
    const imageResponse = await fetch(`${IMAGE_URL}/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${imagesApiToken}`
      }
    });

    // Only fail if it's not a 404 (file might already be deleted)
    if (!imageResponse.ok && imageResponse.status !== 404) {
      throw new Error(`Failed to delete image: ${imageResponse.statusText}`);
    }
  } catch (error) {
    console.warn(`Image deletion warning for ${fileToDelete.originalFilename}:`, error);
    // Continue with data cleanup even if image deletion fails
  }

  // Delete annotation data
  try {
    await deleteFileAnnotations(user, caseNumber, fileId);
  } catch (error) {
    // Annotation file might not exist, continue
    console.warn(`Annotation deletion warning for ${fileToDelete.originalFilename}:`, error);
  }

  // Update case data to remove file reference
  const updatedData: CaseData = {
    ...caseData,
    files: (caseData.files || []).filter((f: FileData) => f.id !== fileId)
  };

  await updateCaseData(user, caseNumber, updatedData);
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

    // Use type guard to check for isReadOnly property safely
    return isReadOnlyCaseData(caseData) ? !!caseData.isReadOnly : false;
    
  } catch (error) {
    console.error('Error checking if case is read-only:', error);
    return false;
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

export const deleteCase = async (user: User, caseNumber: string): Promise<void> => {
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
              await deleteFileWithoutAudit(user, caseNumber, file.id);
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