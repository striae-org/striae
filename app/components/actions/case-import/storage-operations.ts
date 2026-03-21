import type { User } from 'firebase/auth';
import { fetchDataApi } from '~/utils/api';
import {
  getUserReadOnlyCases,
  updateUserData,
  validateUserSession
} from '~/utils/data';
import { 
  type CaseExportData,   
  type FileData,
  type CaseData,
  type ReadOnlyCaseMetadata,
  type BundledAuditTrailData
} from '~/types';
import { deleteFile } from '../image-manage';
import { type SignedForensicManifest } from '~/utils/forensics';

/**
 * Check if user already has a read-only case with the same number
 */
export async function checkReadOnlyCaseExists(
  user: User, 
  caseNumber: string
): Promise<ReadOnlyCaseMetadata | null> {
  try {
    // Use centralized function to get read-only cases
    const readOnlyCases = await getUserReadOnlyCases(user);
    return readOnlyCases.find(c => c.caseNumber === caseNumber) || null;
    
  } catch (error) {
    console.error('Error checking read-only case existence:', error);
    return null;
  }
}

/**
 * Create read-only case entry in user database
 * Note: Only one read-only case is allowed at a time. This function will clear any existing 
 * read-only cases before adding the new one to prevent accumulation of multiple read-only cases.
 */
export async function addReadOnlyCaseToUser(
  user: User, 
  caseMetadata: ReadOnlyCaseMetadata
): Promise<void> {
  try {
    // Validate user session
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Get current read-only cases
    const currentReadOnlyCases = await getUserReadOnlyCases(user);
    
    // IMPORTANT: Only allow one read-only case at a time
    // Clear any existing read-only cases before adding the new one
    if (currentReadOnlyCases.length > 0) {
      const existingCaseNumbers = currentReadOnlyCases.map(c => c.caseNumber).join(', ');
      console.log(`Clearing ${currentReadOnlyCases.length} existing read-only case(s) (${existingCaseNumbers}) before importing new case: ${caseMetadata.caseNumber}`);
    }
    
    // Update user data with the new read-only case (replacing any existing ones)
    await updateUserData(user, { 
      readOnlyCases: [caseMetadata] // Only the new case
    });
    
    console.log(`Added new read-only case to user profile: ${caseMetadata.caseNumber}`);
    
  } catch (error) {
    console.error('Error adding read-only case to user:', error);
    throw error;
  }
}

/**
 * Store case data in R2 storage
 */
export async function storeCaseDataInR2(
  user: User,
  caseNumber: string,
  caseData: CaseExportData,
  importedFiles: FileData[],
  originalImageIdMapping?: Map<string, string>,
  forensicManifest?: SignedForensicManifest,
  isArchivedExport?: boolean,
  bundledAuditTrail?: BundledAuditTrailData
): Promise<void> {
  try {
    // Convert the mapping to a plain object for JSON serialization
    const originalImageIds = originalImageIdMapping ? 
      Object.fromEntries(originalImageIdMapping) : undefined;

    const forensicManifestMetadata = forensicManifest ? {
      manifestVersion: forensicManifest.manifestVersion,
      createdAt: forensicManifest.createdAt,
      dataHash: forensicManifest.dataHash,
      manifestHash: forensicManifest.manifestHash,
      signature: forensicManifest.signature
    } : undefined;

    const archived = isArchivedExport === true || caseData.metadata.archived === true;
    
    // Create the case data structure that matches normal cases
    const r2CaseData = {
      createdAt: new Date().toISOString(),
      caseNumber: caseNumber,
      files: importedFiles,
      // Add read-only metadata
      isReadOnly: true,
      ...(archived && {
        archived: true,
        archivedAt: caseData.metadata.archivedAt,
        archivedBy: caseData.metadata.archivedBy,
        archivedByDisplay: caseData.metadata.archivedByDisplay,
        archiveReason: caseData.metadata.archiveReason,
      }),
      importedAt: new Date().toISOString(),
      ...(bundledAuditTrail && { bundledAuditTrail }),
      // Add original image ID mapping for confirmation linking
      originalImageIds: originalImageIds,
      // Add forensic manifest timestamp if available for confirmation exports
      ...(forensicManifest?.createdAt && { forensicManifestCreatedAt: forensicManifest.createdAt }),
      // Store full forensic manifest metadata for chain-of-custody validation
      ...(forensicManifestMetadata && { forensicManifest: forensicManifestMetadata })
    };
    
    // Store in R2
    const response = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(r2CaseData)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to store case data: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error storing case data in R2:', error);
    throw error;
  }
}

/**
 * List all read-only cases for a user
 */
export async function listReadOnlyCases(user: User): Promise<ReadOnlyCaseMetadata[]> {
  try {
    return await getUserReadOnlyCases(user);
    
  } catch (error) {
    console.error('Error listing read-only cases:', error);
    return [];
  }
}

/**
 * Remove a read-only case (does not delete the actual case data, just removes from user's read-only list)
 */
export async function removeReadOnlyCase(user: User, caseNumber: string): Promise<boolean> {
  try {
    const currentReadOnlyCases = await getUserReadOnlyCases(user);
    if (!currentReadOnlyCases.length) {
      return false; // Nothing to remove
    }
    
    // Remove the case from the list
    const nextReadOnlyCases = currentReadOnlyCases.filter(c => c.caseNumber !== caseNumber);
    
    if (nextReadOnlyCases.length === currentReadOnlyCases.length) {
      return false; // Case wasn't found
    }
    
    // Update user data
    await updateUserData(user, { readOnlyCases: nextReadOnlyCases });
    
    return true;
    
  } catch (error) {
    console.error('Error removing read-only case:', error);
    return false;
  }
}

/**
 * Completely delete a read-only case including all associated data (R2, Images, user references)
 */
export async function deleteReadOnlyCase(user: User, caseNumber: string): Promise<boolean> {
  const isBenignCleanupError = (reason: unknown): boolean => {
    if (!(reason instanceof Error)) {
      return false;
    }

    const normalizedMessage = reason.message.toLowerCase();
    return (
      normalizedMessage.includes('404') ||
      normalizedMessage.includes('not found')
    );
  };

  let caseDataDeleteHadFailure = false;

  try {
    // Get case data first to get file IDs for deletion
    const caseResponse = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`,
      {
        method: 'GET'
      }
    );

    if (caseResponse.status === 404) {
      // No backing data object exists; only remove the case reference from user metadata.
      await removeReadOnlyCase(user, caseNumber);
      return true;
    }

    if (!caseResponse.ok) {
      throw new Error(`Failed to fetch read-only case data for deletion: ${caseResponse.status}`);
    }

    const caseData = await caseResponse.json() as CaseData;

    // Delete all files using data worker (best-effort, keep going on individual failures)
    if (caseData.files && caseData.files.length > 0) {
      const deleteResults = await Promise.allSettled(
        caseData.files.map((file: FileData) => 
          deleteFile(user, caseNumber, file.id, 'Read-only case clearing - API operation')
        )
      );

      const failedDeletes = deleteResults.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected' && !isBenignCleanupError(result.reason)
      );

      const benignNotFoundDeletes = deleteResults.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected' && isBenignCleanupError(result.reason)
      );

      if (failedDeletes.length > 0) {
        caseDataDeleteHadFailure = true;
        console.warn(
          `Partial read-only file cleanup for case ${caseNumber}: ` +
          `${failedDeletes.length}/${caseData.files.length} file deletions failed.`
        );
      }

      if (benignNotFoundDeletes.length > 0) {
        console.info(
          `Read-only cleanup for case ${caseNumber}: ` +
          `${benignNotFoundDeletes.length} file deletions were already missing (404/not found) and treated as successful cleanup.`
        );
      }
    }

    // Delete case file using data worker
    const deleteCaseResponse = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`,
      {
        method: 'DELETE'
      }
    );

    if (!deleteCaseResponse.ok && deleteCaseResponse.status !== 404) {
      caseDataDeleteHadFailure = true;
      console.error(`Failed to delete read-only case data: ${deleteCaseResponse.status}`);
    }
    
    // Remove from user's read-only case list (separate from regular cases).
    // This is the source of truth for import modal visibility and should be attempted even when storage cleanup is partial.
    const removedFromMetadata = await removeReadOnlyCase(user, caseNumber);

    if (!removedFromMetadata) {
      return false;
    }

    if (caseDataDeleteHadFailure) {
      console.warn(
        `Read-only case ${caseNumber} removed from metadata with partial storage cleanup failures.`
      );
    }
    
    return true;
    
  } catch (error) {
    console.error('Error deleting read-only case:', error);

    // Fallback: still try to clear read-only metadata so stale entries do not persist in the UI.
    try {
      const removedFromMetadata = await removeReadOnlyCase(user, caseNumber);
      if (removedFromMetadata) {
        console.warn(
          `Read-only case ${caseNumber} removed from metadata during error fallback. ` +
          'Some backing storage may require manual cleanup.'
        );
        return true;
      }
    } catch (removeError) {
      console.error('Error removing read-only case metadata during fallback cleanup:', removeError);
    }

    return false;
  }
}