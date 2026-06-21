import type { User } from 'firebase/auth';
import { fetchDataApi } from '~/utils/api';
import { upsertFileConfirmationSummary, decryptExportBatch } from '~/utils/data';
import { type AnnotationData, type ConfirmationImportResult, type ConfirmationImportData } from '~/types';
import type { EncryptionManifest } from '~/utils/forensics/export-encryption';
import { checkExistingCase } from '../case-manage';
import { extractConfirmationImportPackage } from './confirmation-package';
import { validateExporterUid, validateConfirmationHash, validateConfirmationSignatureFile } from './validation';
import { auditService } from '~/services/audit';

interface CaseDataFile {
  id: string;
  originalFilename?: string;
}

interface CaseDataResponse {
  files?: CaseDataFile[];
  originalImageIds?: Record<string, string>;
  archived?: boolean;
}

type AnnotationImportData = Record<string, unknown> & {
  confirmationData?: unknown;
  updatedAt?: string;
};

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
    typeof candidate.dataIv === 'string'
  );
}

/**
 * Validates that an encryption manifest is well-formed for a confirmation import.
 * Confirmation packages must not contain encrypted images — this is a structural
 * invariant. Fails closed with a clear message before decryptExportBatch is called.
 */
function validateConfirmationEncryptionManifest(manifest: EncryptionManifest): void {
  if (
    !manifest.encryptionVersion ||
    !manifest.algorithm ||
    !manifest.keyId ||
    !manifest.wrappedKey ||
    !manifest.dataIv
  ) {
    throw new Error(
      'Malformed encryption manifest: one or more required fields (encryptionVersion, algorithm, keyId, wrappedKey, dataIv) are missing.'
    );
  }

  // Confirmation packages must never carry image payloads. Reject any manifest
  // that references encrypted images — this indicates a wrong package type or
  // a tampered/malformed file.
  const candidate = manifest as unknown as Record<string, unknown>;
  const encryptedImages = candidate['encryptedImages'];
  if (
    encryptedImages !== undefined &&
    (typeof encryptedImages !== 'object' ||
      Object.keys(encryptedImages as object).length > 0)
  ) {
    throw new Error(
      'Invalid confirmation package: this manifest contains encrypted image references. ' +
      'Confirmation packages must not include image data. The file may be a case export or may have been tampered with.'
    );
  }
}

/**
 * Import confirmation data from JSON file
 */
export async function importConfirmationData(
  user: User,
  confirmationFile: File,
  onProgress?: (stage: string, progress: number, details?: string) => void
): Promise<ConfirmationImportResult> {
  const startTime = Date.now();
  let hashValid = false;
  let signatureValid = false;
  let signaturePresent = false;
  let signatureKeyId: string | undefined;
  let confirmationDataForAudit: ConfirmationImportData | null = null;
  let confirmationJsonFileNameForAudit = confirmationFile.name;
  const confirmedFileNames = new Set<string>();
  
  const result: ConfirmationImportResult = {
    success: false,
    caseNumber: '',
    confirmationsImported: 0,
    imagesUpdated: 0,
    errors: [],
    warnings: []
  };

  try {
    onProgress?.('Reading confirmation file', 10, 'Loading confirmation package...');

    const packageData = await extractConfirmationImportPackage(confirmationFile);

    let confirmationData = packageData.confirmationData;
    let confirmationJsonContent = packageData.confirmationJsonContent;
    const verificationPublicKeyPem = packageData.verificationPublicKeyPem;
    const confirmationFileName = packageData.confirmationFileName;

    // All confirmation imports are encrypted — fail closed if manifest is missing
    if (!packageData.encryptionManifest || !packageData.encryptedDataBase64) {
      throw new Error(
        'This confirmation package is not encrypted. Only encrypted confirmation packages exported from Striae can be imported.'
      );
    }

    if (!isEncryptionManifest(packageData.encryptionManifest)) {
      throw new Error('Invalid encryption manifest format.');
    }

    // Enforce confirmation-specific manifest shape before attempting decryption
    validateConfirmationEncryptionManifest(packageData.encryptionManifest);

    onProgress?.('Decrypting confirmation data', 15, 'Decrypting exported confirmation...');
    try {
      const decryptResult = await decryptExportBatch(
        user,
        packageData.encryptionManifest,
        packageData.encryptedDataBase64,
        {}
      );

      const decryptedJsonString = decryptResult.plaintext;
      confirmationData = JSON.parse(decryptedJsonString) as ConfirmationImportData;
      confirmationJsonContent = decryptedJsonString;
    } catch (error) {
      throw new Error(
        `Failed to decrypt confirmation data: ${error instanceof Error ? error.message : 'Unknown decryption error'}`,
        { cause: error }
      );
    }

    confirmationDataForAudit = confirmationData;
    confirmationJsonFileNameForAudit = confirmationFileName;
    result.caseNumber = confirmationData.metadata.caseNumber;
    
    // Start audit workflow
    auditService.startWorkflow(result.caseNumber);

    onProgress?.('Validating hash', 20, 'Verifying data integrity...');

    // Validate hash
    hashValid = await validateConfirmationHash(confirmationJsonContent, confirmationData.metadata.hash);
    if (!hashValid) {
      throw new Error('Confirmation data hash validation failed. The file may have been tampered with or corrupted.');
    }

    onProgress?.('Validating signature', 30, 'Verifying signed confirmation metadata...');

    const signatureResult = await validateConfirmationSignatureFile(
      confirmationData,
      verificationPublicKeyPem
    );
    signaturePresent = !!confirmationData.metadata.signature;
    signatureValid = signatureResult.isValid;
    signatureKeyId = signatureResult.keyId;
    if (!signatureResult.isValid) {
      throw new Error(
        `Confirmation signature validation failed: ${signatureResult.error || 'Unknown signature error'}`
      );
    }

    onProgress?.('Validating exporter', 40, 'Checking exporter credentials...');

    // Validate exporter UID exists and is not current user
    const validation = await validateExporterUid(confirmationData.metadata.exportedByUid, user);
    
    if (!validation.exists) {
      throw new Error(`Reviewer does not exist in the user database.`);
    }
    
    if (validation.isSelf) {
      throw new Error('You cannot import confirmation data that you exported yourself.');
    }

    // Validate that this confirmation package was intended for the current user.
    // originalCaseOwnerUid is embedded at export time and covered by the package signature.
    if (
      confirmationData.metadata.originalCaseOwnerUid &&
      confirmationData.metadata.originalCaseOwnerUid !== user.uid
    ) {
      throw new Error(
        'This confirmation package was not exported for your case. It can only be imported by the original case owner.'
      );
    }

    onProgress?.('Validating case', 50, 'Checking case exists...');

    // Check if case exists in user's regular cases
    const caseExists = await checkExistingCase(user, result.caseNumber);
    if (!caseExists) {
      throw new Error(`Case "${result.caseNumber}" does not exist in your case list. You can only import confirmations for your own cases.`);
    }

    onProgress?.('Processing confirmations', 60, 'Validating timestamps and updating annotations...');

    // Get case data to find image IDs
    const caseResponse = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(result.caseNumber)}/data.json`,
      {
        method: 'GET'
      }
    );

    if (!caseResponse.ok) {
      throw new Error(`Failed to fetch case data: ${caseResponse.status}`);
    }

    const caseData = await caseResponse.json() as CaseDataResponse;

    if (caseData.archived) {
      throw new Error('Cannot import confirmations into an archived case.');
    }
    
    // Build mapping from original image IDs to current image IDs
    const imageIdMapping = new Map<string, string>();
    
    // If the case has originalImageIds mapping (from read-only import), use that
    if (caseData.originalImageIds) {
      for (const [originalId, currentId] of Object.entries(caseData.originalImageIds)) {
        imageIdMapping.set(originalId, currentId as string);
      }
    } else {
      // For regular cases, assume original IDs match current IDs
      for (const file of caseData.files || []) {
        imageIdMapping.set(file.id, file.id);
      }
    }

    let processedCount = 0;
    const totalConfirmations = Object.keys(confirmationData.confirmations).length;

    // Process each confirmation
    for (const [originalImageId, confirmations] of Object.entries(confirmationData.confirmations)) {
      const currentImageId = imageIdMapping.get(originalImageId);
      
      if (!currentImageId) {
        result.warnings?.push(`Could not find image with original ID: ${originalImageId}`);
        continue;
      }

      // Get the original filename for user-friendly messages
      const currentFile = (caseData.files || []).find((file) => file.id === currentImageId);
      const displayFilename = currentFile?.originalFilename || currentImageId;

      // Get current annotation data for this image
      const annotationResponse = await fetchDataApi(
        user,
        `/${encodeURIComponent(user.uid)}/${encodeURIComponent(result.caseNumber)}/${encodeURIComponent(currentImageId)}/data.json`,
        {
          method: 'GET'
        }
      );

      let annotationData: AnnotationImportData = {};
      if (annotationResponse.ok) {
        annotationData = await annotationResponse.json() as AnnotationImportData;
      }

      // Check if confirmation data already exists
      if (annotationData.confirmationData) {
        result.warnings?.push(`Image ${displayFilename} already has confirmation data - skipping`);
        continue;
      }

      // Validate that annotations haven't been modified after original export
      const importedConfirmationData = confirmations.length > 0 ? confirmations[0] : null;
      if (importedConfirmationData && confirmationData.metadata.originalExportCreatedAt && annotationData.updatedAt) {
        const originalExportDate = new Date(confirmationData.metadata.originalExportCreatedAt);
        const annotationUpdatedAt = new Date(annotationData.updatedAt);
        
        if (annotationUpdatedAt > originalExportDate) {
          // Format timestamps in user's timezone
          const formattedExportDate = originalExportDate.toLocaleString();
          const formattedUpdatedDate = annotationUpdatedAt.toLocaleString();
          
          result.errors?.push(
            `Cannot import confirmation for image "${displayFilename}" (${importedConfirmationData.confirmationId}). ` +
            `The annotations were last modified at ${formattedUpdatedDate} which is after ` +
            `the original case export date of ${formattedExportDate}. ` +
            `Confirmations can only be imported for images that haven't been modified since the original export.`
          );
          continue; // Skip this image and continue with others
        }
      } else if (importedConfirmationData && !confirmationData.metadata.originalExportCreatedAt) {
        // Block legacy confirmation data without forensic linking
        result.errors?.push(
          `Cannot import confirmation for image "${displayFilename}" (${importedConfirmationData.confirmationId}). ` +
          `This confirmation data lacks forensic timestamp linking and cannot be validated. ` +
          `Only confirmation exports with complete forensic metadata are accepted.`
        );
        continue; // Skip this image and continue with others
      }

      // Set confirmationData from the imported confirmations (use the first/most recent one)
      const updatedAnnotationData = {
        ...annotationData,
        // Ensure includeConfirmation remains true (original analyst requested confirmation)
        includeConfirmation: true,
        // Set the confirmation data from import (single object, no array needed)
        confirmationData: importedConfirmationData
      };

      // Save updated annotation data
      const saveResponse = await fetchDataApi(
        user,
        `/${encodeURIComponent(user.uid)}/${encodeURIComponent(result.caseNumber)}/${encodeURIComponent(currentImageId)}/data.json`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedAnnotationData)
        }
      );

      if (saveResponse.ok) {
        result.imagesUpdated++;
        result.confirmationsImported += confirmations.length;
        confirmedFileNames.add(displayFilename);

        try {
          await upsertFileConfirmationSummary(
            user,
            result.caseNumber,
            currentImageId,
            updatedAnnotationData as AnnotationData
          );
        } catch (summaryError) {
          console.warn(
            `Failed to update confirmation summary for imported confirmation ${result.caseNumber}/${currentImageId}:`,
            summaryError
          );
        }
        
        // Audit log successful confirmation import
        try {
          await auditService.logConfirmationImport(
            user,
            result.caseNumber,
            displayFilename,
            'success',
            true,
            confirmations.length,
            [displayFilename]
          );
        } catch (auditError) {
          console.error('Failed to log confirmation import audit:', auditError);
        }
      } else {
        result.warnings?.push(`Failed to update image ${displayFilename}: ${saveResponse.status}`);
        
        // Audit log failed confirmation import
        try {
          await auditService.logConfirmationImport(
            user,
            result.caseNumber,
            displayFilename,
            'failure',
            false,
            0,
            [],
            [`Failed to update image ${displayFilename}: ${saveResponse.status}`]
          );
        } catch (auditError) {
          console.error('Failed to log failed confirmation import audit:', auditError);
        }
      }

      processedCount++;
      const progress = 60 + (processedCount / totalConfirmations) * 35;
      onProgress?.('Processing confirmations', progress, `Updated ${result.imagesUpdated} images...`);
    }

    const blockedCount = (result.errors?.length || 0);
    const successMessage = blockedCount > 0 
      ? `Imported ${result.confirmationsImported} confirmations, ${blockedCount} blocked`
      : `Successfully imported ${result.confirmationsImported} confirmations`;
    
    onProgress?.('Import complete', 100, successMessage);

    // If there were errors (blocked confirmations), include that in the result message
    if (result.errors && result.errors.length > 0) {
      result.success = result.confirmationsImported > 0; // Success if at least one confirmation was imported
    } else {
      result.success = true;
    }
    
    // Log confirmation import audit event
    const endTime = Date.now();
    await auditService.logConfirmationImport(
      user,
      result.caseNumber,
      confirmationJsonFileNameForAudit,
      result.success ? (result.errors && result.errors.length > 0 ? 'warning' : 'success') : 'failure',
      hashValid,
      result.confirmationsImported, // Successfully imported confirmations
      Array.from(confirmedFileNames).sort((left, right) => left.localeCompare(right)),
      result.errors || [],
      confirmationData.metadata.exportedByUid,
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: confirmationFile.size,
        validationStepsCompleted: result.confirmationsImported, // Successfully imported
        validationStepsFailed: result.errors ? result.errors.length : 0
      },
      true, // exporterUidValidated - true for successful imports
      confirmationData.metadata.totalConfirmations, // Total confirmations in file
      {
        present: signaturePresent,
        valid: signatureValid,
        keyId: signatureKeyId
      },
      confirmationData.metadata.exportedByBadgeId // Reviewer's badge/ID number
    );
    
    auditService.endWorkflow();
    
    return result;

  } catch (error) {
    console.error('Confirmation import failed:', error);
    result.success = false;
    result.errors?.push(error instanceof Error ? error.message : 'Unknown error occurred during confirmation import');
    
    // Log failed confirmation import
    const endTime = Date.now();
    
    // Determine what validation failed based on error message - each check is independent
    let hashValidForAudit = hashValid;
    let exporterUidValidatedForAudit = true;
    let reviewingExaminerUidForAudit: string | undefined = undefined;
    let reviewerBadgeIdForAudit: string | undefined = undefined;
    let totalConfirmationsForAudit = 0; // Default to 0 for failed imports
    let signaturePresentForAudit = signaturePresent;
    let signatureValidForAudit = signatureValid;
    let signatureKeyIdForAudit = signatureKeyId;
    
    const auditConfirmationData = confirmationDataForAudit;

    // First, try to extract basic metadata for audit purposes (if file is parseable)
    if (auditConfirmationData) {
      reviewingExaminerUidForAudit = auditConfirmationData.metadata?.exportedByUid;
      reviewerBadgeIdForAudit = auditConfirmationData.metadata?.exportedByBadgeId;
      totalConfirmationsForAudit = auditConfirmationData.metadata?.totalConfirmations || 0;
      if (auditConfirmationData.metadata?.signature) {
        signaturePresentForAudit = true;
        signatureKeyIdForAudit = auditConfirmationData.metadata.signature.keyId;
      }
    } else {
      try {
        const extracted = await extractConfirmationImportPackage(confirmationFile);
        reviewingExaminerUidForAudit = extracted.confirmationData.metadata?.exportedByUid;
        reviewerBadgeIdForAudit = extracted.confirmationData.metadata?.exportedByBadgeId;
        totalConfirmationsForAudit = extracted.confirmationData.metadata?.totalConfirmations || 0;
        confirmationJsonFileNameForAudit = extracted.confirmationFileName;
        if (extracted.confirmationData.metadata?.signature) {
          signaturePresentForAudit = true;
          signatureKeyIdForAudit = extracted.confirmationData.metadata.signature.keyId;
        }
      } catch {
        // If we can't parse the file, keep undefined/default values
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('hash validation failed')) {
      // Hash failed - only flag file integrity, don't affect other validations
      hashValidForAudit = false;
      // We still pass reviewingExaminerUid if we could extract it for audit purposes
      // exporterUidValidatedForAudit stays true - we didn't test this validation
    } else if (errorMessage.includes('signature validation failed') || errorMessage.includes('Missing confirmation signature')) {
      signatureValidForAudit = false;
    } else if (errorMessage.includes('does not exist in the user database')) {
      // Exporter UID validation failed - only flag this check
      exporterUidValidatedForAudit = false;
      // Hash validation would have passed to get this far, so hashValidForAudit stays true
      // We still pass reviewingExaminerUid even though validation failed (for audit trail)
    } else if (errorMessage.includes('cannot import confirmation data that you exported yourself')) {
      // Self-confirmation attempt - all validations technically passed except the self-check
      // reviewingExaminerUidForAudit already extracted above
    }
    
    await auditService.logConfirmationImport(
      user,
      result.caseNumber || 'unknown',
      confirmationJsonFileNameForAudit,
      'failure',
      hashValidForAudit,
      0, // No confirmations successfully imported for failures
      [],
      result.errors || [],
      reviewingExaminerUidForAudit,
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: confirmationFile.size
      },
      exporterUidValidatedForAudit,
      totalConfirmationsForAudit, // Total confirmations in file (when extractable)
      {
        present: signaturePresentForAudit,
        valid: signatureValidForAudit,
        keyId: signatureKeyIdForAudit
      },
      reviewerBadgeIdForAudit // Reviewer's badge/ID number (when extractable)
    );
    
    auditService.endWorkflow();
    
    return result;
  }
}