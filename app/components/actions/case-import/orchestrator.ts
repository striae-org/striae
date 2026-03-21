import type { User } from 'firebase/auth';
import { type ImportOptions, type ImportResult, type ReadOnlyCaseMetadata, type FileData } from '~/types';
import { checkExistingCase } from '../case-manage';
import {
  extractForensicManifestData,
  type SignedForensicManifest,
  validateCaseIntegritySecure as validateForensicIntegrity,
  verifyForensicManifestSignature
} from '~/utils/forensics';
import { deleteFile } from '../image-manage';
import { parseImportZip } from './zip-processing';
import { 
  checkReadOnlyCaseExists, 
  deleteReadOnlyCase, 
  storeCaseDataInR2, 
  addReadOnlyCaseToUser,
  removeReadOnlyCase,
  listReadOnlyCases
} from './storage-operations';
import { uploadImageBlob } from './image-operations';
import { importAnnotations } from './annotation-import';
import { auditService } from '~/services/audit';

/**
 * Track the state of an import operation for cleanup purposes
 */
interface ImportState {
  uploadedFiles: FileData[];
  caseDataStored: boolean;
  userProfileUpdated: boolean;
  caseNumber: string;
}

/**
 * Clean up partially imported data when an import fails
 */
async function cleanupPartialImport(
  user: User, 
  state: ImportState,
  onProgress?: (stage: string, progress: number, details?: string) => void
): Promise<string[]> {
  const cleanupWarnings: string[] = [];
  
  try {
    onProgress?.('Cleaning up partial import', 0, 'Starting cleanup...');
    
    // Step 1: Remove user profile entry if it was added
    if (state.userProfileUpdated) {
      try {
        onProgress?.('Cleaning up partial import', 25, 'Removing user profile entry...');
        const removeSuccess = await removeReadOnlyCase(user, state.caseNumber);
        if (!removeSuccess) {
          cleanupWarnings.push('Failed to remove case from user profile during cleanup');
        }
      } catch (error) {
        cleanupWarnings.push(`Error removing user profile entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Step 2: Delete case data from R2 if it was stored
    if (state.caseDataStored) {
      try {
        onProgress?.('Cleaning up partial import', 50, 'Removing case data...');
        // Use the full deleteReadOnlyCase function to remove all R2 data
        const deleteSuccess = await deleteReadOnlyCase(user, state.caseNumber);
        if (!deleteSuccess) {
          cleanupWarnings.push('Failed to remove case data during cleanup');
        }
      } catch (error) {
        cleanupWarnings.push(`Error removing case data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Step 3: Delete uploaded images
    if (state.uploadedFiles.length > 0) {
      onProgress?.('Cleaning up partial import', 75, `Deleting ${state.uploadedFiles.length} uploaded images...`);
      
      const deletePromises = state.uploadedFiles.map(async (file, index) => {
        try {
          await deleteFile(user, state.caseNumber, file.id);
        } catch (error) {
          cleanupWarnings.push(`Failed to delete image ${file.originalFilename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Update progress for image deletion
        const progress = 75 + (index / state.uploadedFiles.length) * 25;
        onProgress?.('Cleaning up partial import', progress, `Deleted ${index + 1}/${state.uploadedFiles.length} images`);
      });
      
      await Promise.all(deletePromises);
    }
    
    onProgress?.('Cleaning up partial import', 100, 'Cleanup completed');
    
  } catch (error) {
    cleanupWarnings.push(`Cleanup process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return cleanupWarnings;
}

/**
 * Main function to import a case for read-only viewing
 */
export async function importCaseForReview(
  user: User,
  zipFile: File,
  options: ImportOptions = {},
  onProgress?: (stage: string, progress: number, details?: string) => void
): Promise<ImportResult> {
  const startTime = Date.now();
  
  const result: ImportResult = {
    success: false,
    caseNumber: '',
    isReadOnly: true,
    filesImported: 0,
    annotationsImported: 0,
    errors: [],
    warnings: []
  };
  
  // Track import state for cleanup purposes
  const importState: ImportState = {
    uploadedFiles: [],
    caseDataStored: false,
    userProfileUpdated: false,
    caseNumber: ''
  };
  
  let hashValidationPassed = false;
  let signatureValidationPassed = false;
  let signatureKeyId: string | undefined;
  let parsedForensicManifest: SignedForensicManifest | undefined;
  
  try {
    onProgress?.('Parsing ZIP file', 10, 'Extracting archive contents...');
    
    // Step 1: Parse ZIP file
    const {
      caseData,
      imageFiles,
      imageIdMapping,
      metadata,
      cleanedContent,
      verificationPublicKeyPem
    } = await parseImportZip(zipFile, user);
    const isArchivedExport = caseData.metadata.archived === true;
    parsedForensicManifest = metadata?.forensicManifest as SignedForensicManifest | undefined;
    result.caseNumber = caseData.metadata.caseNumber;
    importState.caseNumber = result.caseNumber;
    
    // Start audit workflow
    auditService.startWorkflow(result.caseNumber);
    
    // Step 1.1: Clean up any existing read-only cases (only one allowed at a time)
    onProgress?.('Checking existing read-only cases', 12, 'Cleaning up previous imports...');
    try {
      const existingReadOnlyCases = await listReadOnlyCases(user);
      if (existingReadOnlyCases.length > 0) {
        console.log(`Found ${existingReadOnlyCases.length} existing read-only case(s). Cleaning up before new import.`);
        
        // Delete all existing read-only cases (data and user references)
        const deletePromises = existingReadOnlyCases.map(async (existingCase: ReadOnlyCaseMetadata) => {
          try {
            await deleteReadOnlyCase(user, existingCase.caseNumber);
            console.log(`Cleaned up existing read-only case: ${existingCase.caseNumber}`);
          } catch (error) {
            console.warn(`Failed to clean up existing read-only case ${existingCase.caseNumber}:`, error);
            // Don't throw here - just warn, as we want to proceed with the new import
          }
        });
        
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.warn('Error during pre-import cleanup of existing read-only cases:', error);
      // Don't fail the import due to cleanup issues
    }
    
    // Step 1.5: Validate hash if forensic metadata exists
    if (parsedForensicManifest && cleanedContent) {
      onProgress?.('Validating comprehensive integrity', 15, 'Checking all file hashes...');

      const manifestForValidation = extractForensicManifestData(parsedForensicManifest);
      if (!manifestForValidation) {
        throw new Error(
          'Forensic manifest structure is invalid. Import cannot proceed.'
        );
      }

      const signatureResult = await verifyForensicManifestSignature(
        parsedForensicManifest,
        verificationPublicKeyPem
      );
      signatureValidationPassed = signatureResult.isValid;
      signatureKeyId = signatureResult.keyId;

      if (!signatureResult.isValid) {
        throw new Error(
          'Manifest signature validation failed. Import cannot proceed.'
        );
      }
      
      // Extract image files for comprehensive validation
      const imageBlobs: { [filename: string]: Blob } = {};
      for (const [filename, blob] of Object.entries(imageFiles)) {
        imageBlobs[filename] = blob;
      }
      
      // Perform comprehensive validation
      const validation = await validateForensicIntegrity(
        cleanedContent, 
        imageBlobs, 
        manifestForValidation
      );
      
      if (!validation.isValid) {
        throw new Error(
          'Comprehensive integrity validation failed. Import cannot proceed.'
        );
      }
      
      hashValidationPassed = true;
      onProgress?.(
        'Complete integrity verified',
        18,
        `Integrity validation passed. Signature verified${signatureKeyId ? ` (${signatureKeyId})` : ''}`
      );
      
    } else {
      // No forensic manifest found - cannot import
      throw new Error(
        'No forensic manifest found in case export. This case export does not support comprehensive ' +
        'integrity validation and cannot be imported. Please re-export the case with forensic protection enabled.'
      );
    }
    
    onProgress?.('Validating case data', 20, `Case: ${result.caseNumber}`);
    
    // Step 2a: Check if case already exists in user's regular cases (original analyst)
    const existingRegularCase = await checkExistingCase(user, result.caseNumber);
    if (existingRegularCase && !isArchivedExport) {
      throw new Error(`Case "${result.caseNumber}" already exists in your case list. You cannot import a case for review if you were the original analyst.`);
    }
    
    // Step 2b: Check if read-only case already exists
    const existingCase = await checkReadOnlyCaseExists(user, result.caseNumber);
    if (existingCase && !options.overwriteExisting) {
      throw new Error(`Read-only case "${result.caseNumber}" already exists. Use overwriteExisting option to replace it.`);
    }
    
    if (existingCase) {
      result.warnings?.push('Overwriting existing read-only case');
      
      // Step 2c: Clean up existing read-only case data before importing new data
      onProgress?.('Cleaning up existing case', 25, 'Removing existing case data...');
      const cleanupSuccess = await deleteReadOnlyCase(user, result.caseNumber);
      if (!cleanupSuccess) {
        result.warnings?.push('Some existing case data may not have been fully cleaned up');
      }
    }
    
    onProgress?.('Uploading images', 30, 'Processing image files...');
    
    // Step 3: Upload all image files and create original image ID to new file ID mapping
    const originalImageIdMapping = new Map<string, string>(); // originalImageId -> newFileId
    const importedFiles = [];
    
    let uploadedCount = 0;
    const totalImages = Object.keys(imageFiles).length;
    
    for (const [exportFilename, blob] of Object.entries(imageFiles)) {
      try {
        // Get the original image ID from the filename
        const originalImageId = imageIdMapping[exportFilename];
        
        if (!originalImageId) {
          console.warn(`Could not extract image ID from filename: ${exportFilename}`);
          continue;
        }
        
        // Find the original file entry to get the actual original filename
        const originalFileEntry = caseData.files.find(f => f.fileData.id === originalImageId);
        const originalFilename = originalFileEntry?.fileData.originalFilename || exportFilename;
        
        const fileData = await uploadImageBlob(user, blob, originalFilename, (fname, progress) => {
          const overallProgress = 30 + (uploadedCount / totalImages) * 40 + (progress / totalImages) * 0.4;
          onProgress?.('Uploading images', overallProgress, `Uploading ${fname}...`);
        });
        
        // Map original image ID to new file ID
        originalImageIdMapping.set(originalImageId, fileData.id);
        
        importedFiles.push(fileData);
        importState.uploadedFiles.push(fileData);
        uploadedCount++;
        
        const overallProgress = 30 + (uploadedCount / totalImages) * 40;
        onProgress?.('Uploading images', overallProgress, `Uploaded ${uploadedCount}/${totalImages} files`);
        
      } catch (error) {
        result.errors?.push(`Failed to upload ${exportFilename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    result.filesImported = importedFiles.length;
    
    if (importedFiles.length === 0) {
      throw new Error('No images were successfully uploaded');
    }
    
    onProgress?.('Storing case data', 75, 'Creating case structure...');
    
    // Step 4: Store case data in R2
    await storeCaseDataInR2(
      user,
      result.caseNumber,
      caseData,
      importedFiles,
      originalImageIdMapping,
      parsedForensicManifest
    );
    importState.caseDataStored = true;
    
    onProgress?.('Importing annotations', 85, 'Processing annotations...');
    
    // Step 5: Import annotations
    result.annotationsImported = await importAnnotations(user, result.caseNumber, caseData, originalImageIdMapping);
    
    onProgress?.('Updating user profile', 95, 'Finalizing import...');
    
    // Step 6: Add read-only case to user profile
    const caseMetadata: ReadOnlyCaseMetadata = {
      caseNumber: result.caseNumber,
      importedAt: new Date().toISOString(),
      originalExportDate: caseData.metadata.exportDate,
      originalExportedBy: caseData.metadata.exportedBy || 'Unknown',
      sourceHash: parsedForensicManifest?.manifestHash,
      sourceManifestVersion: parsedForensicManifest?.manifestVersion,
      sourceSignatureKeyId: parsedForensicManifest?.signature?.keyId,
      sourceSignatureValid: signatureValidationPassed,
      isReadOnly: true
    };
    
    await addReadOnlyCaseToUser(user, caseMetadata);
    importState.userProfileUpdated = true;
    
    onProgress?.('Import complete', 100, 'Case successfully imported for review');
    
    result.success = true;
    
    // Log successful case import
    const endTime = Date.now();
    await auditService.logCaseImport(
      user,
      result.caseNumber,
      zipFile.name,
      'success',
      hashValidationPassed,
      [],
      undefined, // Don't use for self-confirmation prevention for read-only imports
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: zipFile.size,
        validationStepsCompleted: result.filesImported + result.annotationsImported,
        validationStepsFailed: 0
      },
      true, // Exporter UID was validated during zip parsing
      {
        present: !!parsedForensicManifest,
        valid: signatureValidationPassed,
        keyId: signatureKeyId
      }
    );
    
    auditService.endWorkflow();
    
    return result;
    
  } catch (error) {
    console.error('Case import failed:', error);
    result.success = false;
    result.errors?.push(error instanceof Error ? error.message : 'Unknown error occurred during import');
    
    // Log failed case import
    const endTime = Date.now();
    await auditService.logCaseImport(
      user,
      result.caseNumber || 'unknown',
      zipFile.name,
      'failure',
      hashValidationPassed, // Use actual hash validation result even for failures
      result.errors || [],
      undefined, // Don't use for self-confirmation prevention for read-only imports
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: zipFile.size
      },
      false, // If import failed, exporter UID validation may not have completed
      {
        present: !!parsedForensicManifest,
        valid: signatureValidationPassed,
        keyId: signatureKeyId
      }
    );
    
    auditService.endWorkflow();
    
    // Cleanup any partially imported data
    if (importState.uploadedFiles.length > 0 || importState.caseDataStored || importState.userProfileUpdated) {
      console.log('Import failed, cleaning up partial data...');
      try {
        const cleanupWarnings = await cleanupPartialImport(user, importState, onProgress);
        if (cleanupWarnings.length > 0) {
          result.warnings?.push(...cleanupWarnings);
          console.warn('Cleanup completed with warnings:', cleanupWarnings);
        } else {
          console.log('Cleanup completed successfully');
        }
      } catch (cleanupError) {
        const cleanupErrorMsg = `Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'}`;
        result.warnings?.push(cleanupErrorMsg);
        console.error('Cleanup failed:', cleanupError);
      }
    }
    
    return result;
  }
}