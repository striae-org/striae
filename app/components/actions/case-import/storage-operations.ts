import { User } from 'firebase/auth';
import paths from '~/config/config.json';
import { 
  getDataApiKey,
  getUserApiKey
} from '~/utils/auth';
import {
  getUserReadOnlyCases,
  updateUserData,
  validateUserSession
} from '~/utils/permissions';
import { 
  CaseExportData,   
  ExtendedUserData,
  FileData,
  CaseData,
  ReadOnlyCaseMetadata
} from '~/types';
import { deleteFile } from '../image-manage';

const USER_WORKER_URL = paths.user_worker_url;
const DATA_WORKER_URL = paths.data_worker_url;

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
  forensicManifestCreatedAt?: string
): Promise<void> {
  try {
    const apiKey = await getDataApiKey();
    
    // Convert the mapping to a plain object for JSON serialization
    const originalImageIds = originalImageIdMapping ? 
      Object.fromEntries(originalImageIdMapping) : undefined;
    
    // Create the case data structure that matches normal cases
    const r2CaseData = {
      createdAt: new Date().toISOString(),
      caseNumber: caseNumber,
      files: importedFiles,
      // Add read-only metadata
      isReadOnly: true,
      importedAt: new Date().toISOString(),
      // Add original image ID mapping for confirmation linking
      originalImageIds: originalImageIds,
      // Add forensic manifest timestamp if available for confirmation exports
      ...(forensicManifestCreatedAt && { forensicManifestCreatedAt })
    };
    
    // Store in R2
    const response = await fetch(`${DATA_WORKER_URL}/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Auth-Key': apiKey
      },
      body: JSON.stringify(r2CaseData)
    });

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
    const apiKey = await getUserApiKey();
    
    const response = await fetch(`${USER_WORKER_URL}/${encodeURIComponent(user.uid)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Auth-Key': apiKey
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch user data:', response.status);
      return [];
    }

    const userData: ExtendedUserData = await response.json();
    
    return userData.readOnlyCases || [];
    
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
    const apiKey = await getUserApiKey();
    
    // Get current user data
    const response = await fetch(`${USER_WORKER_URL}/${encodeURIComponent(user.uid)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Auth-Key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const userData: ExtendedUserData = await response.json();
    
    if (!userData.readOnlyCases) {
      return false; // Nothing to remove
    }
    
    // Remove the case from the list
    const initialLength = userData.readOnlyCases.length;
    userData.readOnlyCases = userData.readOnlyCases.filter(c => c.caseNumber !== caseNumber);
    
    if (userData.readOnlyCases.length === initialLength) {
      return false; // Case wasn't found
    }
    
    // Update user data
    const updateResponse = await fetch(`${USER_WORKER_URL}/${encodeURIComponent(user.uid)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Auth-Key': apiKey
      },
      body: JSON.stringify(userData)
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update user data: ${updateResponse.status}`);
    }
    
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
  try {
    const dataApiKey = await getDataApiKey();
    
    // Get case data first to get file IDs for deletion
    const caseResponse = await fetch(`${DATA_WORKER_URL}/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`, {
      headers: { 'X-Custom-Auth-Key': dataApiKey }
    });

    if (caseResponse.ok) {
      const caseData = await caseResponse.json() as CaseData;

      // Delete all files using data worker
      if (caseData.files && caseData.files.length > 0) {
        await Promise.all(
          caseData.files.map((file: FileData) => 
            deleteFile(user, caseNumber, file.id, 'Read-only case clearing - API operation')
          )
        );
      }

      // Delete case file using data worker
      await fetch(`${DATA_WORKER_URL}/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`, {
        method: 'DELETE',
        headers: { 'X-Custom-Auth-Key': dataApiKey }
      });
    }
    
    // Remove from user's read-only case list (separate from regular cases)
    await removeReadOnlyCase(user, caseNumber);
    
    return true;
    
  } catch (error) {
    console.error('Error deleting read-only case:', error);
    return false;
  }
}