import { User } from 'firebase/auth';
import { calculateSHA256Secure } from '~/utils/SHA256';
import { getUserData } from '~/utils/permissions';
import { getCaseData, updateCaseData } from '~/utils/data-operations';
import { ConfirmationData, CaseConfirmations, CaseDataWithConfirmations } from '~/types';
import { auditService } from '~/services/audit.service';

/**
 * Store a confirmation for a specific image, linked to the original image ID
 */
export async function storeConfirmation(
  user: User,
  caseNumber: string,
  currentImageId: string,
  confirmationData: ConfirmationData,
  originalImageFileName?: string
): Promise<boolean> {
  const startTime = Date.now();
  let originalImageId: string | undefined; // Declare at function level for error handling
  
  try {
    // Start workflow for confirmation creation
    auditService.startWorkflow(caseNumber);
    
    // Get the current case data using centralized function
    const caseData = await getCaseData(user, caseNumber) as CaseDataWithConfirmations;
    if (!caseData) {
      throw new Error('Case not found');
    }

    // Find the original image ID for the current image
    if (caseData.originalImageIds) {
      // Find the original ID by looking up the current image ID in the mapping
      for (const [origId, currentId] of Object.entries(caseData.originalImageIds)) {
        if (currentId === currentImageId) {
          originalImageId = origId;
          break;
        }
      }
    }

    if (!originalImageId) {
      throw new Error('Could not find original image ID for current image');
    }

    // Initialize confirmations object if it doesn't exist
    if (!caseData.confirmations) {
      caseData.confirmations = {};
    }

    // Initialize array for this original image if it doesn't exist
    if (!caseData.confirmations[originalImageId]) {
      caseData.confirmations[originalImageId] = [];
    }

    // Add the confirmation data directly (already complete from modal)
    caseData.confirmations[originalImageId].push(confirmationData);

    // Store the updated case data using centralized function
    await updateCaseData(user, caseNumber, caseData);

    console.log(`Confirmation stored for original image ${originalImageId}:`, confirmationData);
    
    // Log successful confirmation creation
    const endTime = Date.now();
    await auditService.logConfirmationCreation(
      user,
      caseNumber,
      confirmationData.confirmationId,
      'success',
      [],
      undefined, // Original examiner UID not available in this context
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: 0 // Not applicable for confirmation creation
      },
      originalImageId,
      originalImageFileName
    );
    
    auditService.endWorkflow();
    
    return true;

  } catch (error) {
    console.error('Failed to store confirmation:', error);
    
    // Log failed confirmation creation
    const endTime = Date.now();
    await auditService.logConfirmationCreation(
      user,
      caseNumber,
      confirmationData?.confirmationId || 'unknown',
      'failure',
      [error instanceof Error ? error.message : 'Unknown error'],
      undefined,
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: 0
      },
      originalImageId || currentImageId, // Use originalImageId if available, fallback to currentImageId
      originalImageFileName
    );
    
    auditService.endWorkflow();
    
    return false;
  }
}

/**
 * Get all confirmations for a case (useful for the original analyst)
 */
export async function getCaseConfirmations(
  user: User,
  caseNumber: string
): Promise<CaseConfirmations | null> {
  try {
    const caseData = await getCaseData(user, caseNumber) as CaseDataWithConfirmations;
    if (!caseData) {
      console.error('Case not found');
      return null;
    }

    return caseData.confirmations || null;

  } catch (error) {
    console.error('Failed to get case confirmations:', error);
    return null;
  }
}

/**
 * Get case data with forensic manifest information if available
 */
export async function getCaseDataWithManifest(
  user: User,
  caseNumber: string
): Promise<{ confirmations: CaseConfirmations | null; forensicManifestCreatedAt?: string }> {
  try {
    const caseData = await getCaseData(user, caseNumber) as CaseDataWithConfirmations & { forensicManifestCreatedAt?: string };
    if (!caseData) {
      console.error('Case not found');
      return { confirmations: null };
    }
    
    return {
      confirmations: caseData.confirmations || null,
      forensicManifestCreatedAt: caseData.forensicManifestCreatedAt
    };

  } catch (error) {
    console.error('Failed to get case data with manifest:', error);
    return { confirmations: null };
  }
}

/**
 * Get confirmations for a specific original image ID
 */
export async function getImageConfirmations(
  user: User,
  caseNumber: string,
  originalImageId: string
): Promise<ConfirmationData[]> {
  try {
    const confirmations = await getCaseConfirmations(user, caseNumber);
    return confirmations?.[originalImageId] || [];
  } catch (error) {
    console.error('Failed to get image confirmations:', error);
    return [];
  }
}

/**
 * Exports confirmation data as a JSON file with CRC32 checksum for forensic integrity
 */
export async function exportConfirmationData(
  user: User, 
  caseNumber: string
): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Start audit workflow
    auditService.startWorkflow(caseNumber);
    
    // Get all confirmation data and forensic manifest info for the case
    const { confirmations: caseConfirmations, forensicManifestCreatedAt } = await getCaseDataWithManifest(user, caseNumber);
    
    if (!caseConfirmations || Object.keys(caseConfirmations).length === 0) {
      throw new Error('No confirmation data found for this case');
    }

    // Get user metadata for export (same as case exports)
    let userMetadata = {
      exportedBy: user.email || 'Unknown User',
      exportedByUid: user.uid,
      exportedByName: user.displayName || 'N/A',
      exportedByCompany: 'N/A'
    };

    try {
      const userData = await getUserData(user);
      if (userData) {
        userMetadata = {
          exportedBy: user.email || 'Unknown User',
          exportedByUid: userData.uid,
          exportedByName: `${userData.firstName} ${userData.lastName}`.trim(),
          exportedByCompany: userData.company
        };
      }
    } catch (error) {
      console.warn('Failed to fetch user data for confirmation export metadata:', error);
    }

    // Try to get the forensic manifest createdAt timestamp from the original case export
    let originalExportCreatedAt: string | undefined = forensicManifestCreatedAt;
    
    if (!originalExportCreatedAt) {
      console.warn(`No forensic manifest timestamp found for case ${caseNumber}. This case may have been imported before forensic linking was implemented, or the original export did not include a forensic manifest.`);
    }

    // Create export data with metadata
    const exportData = {
      metadata: {
        caseNumber,
        exportDate: new Date().toISOString(),
        ...userMetadata,
        totalConfirmations: Object.keys(caseConfirmations).length,
        version: '1.0',
        ...(originalExportCreatedAt && { originalExportCreatedAt })
      },
      confirmations: caseConfirmations
    };

    // Convert to JSON string for checksum calculation
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Calculate SHA-256 hash for data integrity using secure version for forensic data
    const checksum = await calculateSHA256Secure(jsonString);
    
    // Add checksum to final export data
    const finalExportData = {
      ...exportData,
      metadata: {
        ...exportData.metadata,
        checksum: checksum.toUpperCase()
      }
    };

    // Convert final data to JSON blob
    const finalJsonString = JSON.stringify(finalExportData, null, 2);
    const blob = new Blob([finalJsonString], { type: 'application/json' });
    
    // Create download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Use local timezone for filename timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestampString = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    
    a.download = `confirmation-data-${caseNumber}-${timestampString}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Confirmation data exported for case ${caseNumber} with checksum ${checksum.toUpperCase()}`);
    
    // Log successful confirmation export
    const endTime = Date.now();
    const confirmationCount = Object.keys(caseConfirmations).length;
    await auditService.logConfirmationExport(
      user,
      caseNumber,
      `confirmation-data-${caseNumber}-${timestampString}.json`,
      confirmationCount,
      'success',
      [],
      undefined, // Original examiner UID not available here
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: new Blob([jsonString]).size,
        validationStepsCompleted: confirmationCount,
        validationStepsFailed: 0
      }
    );
    
    auditService.endWorkflow();
    
  } catch (error) {
    console.error('Failed to export confirmation data:', error);
    
    // Log failed confirmation export
    const endTime = Date.now();
    await auditService.logConfirmationExport(
      user,
      caseNumber,
      `confirmation-data-${caseNumber}-error.json`,
      0,
      'failure',
      [error instanceof Error ? error.message : 'Unknown error'],
      undefined,
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: 0
      }
    );
    
    auditService.endWorkflow();
    
    throw error;
  }
}
