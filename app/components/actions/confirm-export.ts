import type { User } from 'firebase/auth';
import {
  calculateSHA256Secure,
  createPublicSigningKeyFileName,
  getCurrentPublicSigningKeyDetails,
  getVerificationPublicKey
} from '~/utils/forensics';
import { getUserData, getCaseData, updateCaseData, signConfirmationData } from '~/utils/data';
import { type ConfirmationData, type CaseConfirmations, type CaseDataWithConfirmations, type ConfirmationImportData } from '~/types';
import { auditService } from '~/services/audit';

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
 * Exports confirmation data as a JSON file with SHA256 hash for forensic integrity
 */
export async function exportConfirmationData(
  user: User, 
  caseNumber: string
): Promise<void> {
  const startTime = Date.now();
  let signatureKeyId: string | undefined;
  let signaturePresent = false;
  let signatureValid = false;
  
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
    const originalExportCreatedAt: string | undefined = forensicManifestCreatedAt;
    
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
        version: '2.0',
        ...(originalExportCreatedAt && { originalExportCreatedAt })
      },
      confirmations: caseConfirmations
    };

    // Convert to JSON string for hash calculation
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Calculate SHA-256 hash for data integrity using secure version for forensic data
    const hash = await calculateSHA256Secure(jsonString);
    
    // Add hash prior to signing
    const unsignedExportData: ConfirmationImportData = {
      ...exportData,
      metadata: {
        ...exportData.metadata,
        hash: hash.toUpperCase()
      }
    };

    // Request server-side signature to prevent tamper-by-rehash attacks
    const signingResult = await signConfirmationData(user, caseNumber, unsignedExportData);
    signaturePresent = true;
    signatureValid = true;
    signatureKeyId = signingResult.signature.keyId;

    const finalExportData: ConfirmationImportData = {
      ...unsignedExportData,
      metadata: {
        ...unsignedExportData.metadata,
        signatureVersion: signingResult.signatureVersion,
        signature: signingResult.signature
      }
    };

    const finalJsonString = JSON.stringify(finalExportData, null, 2);

    // Use local timezone for filename timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestampString = `${year}${month}${day}-${hours}${minutes}${seconds}`;

    const confirmationFileName = `confirmation-data-${caseNumber}-${timestampString}.json`;

    const keyFromSignature = getVerificationPublicKey(signingResult.signature.keyId);
    const currentKey = getCurrentPublicSigningKeyDetails();
    const publicKeyPem = keyFromSignature ?? currentKey.publicKeyPem;
    const publicKeyFileName = createPublicSigningKeyFileName(
      keyFromSignature ? signingResult.signature.keyId : currentKey.keyId
    );

    if (!publicKeyPem || publicKeyPem.trim().length === 0) {
      throw new Error('No public signing key is configured for confirmation export packaging.');
    }

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const normalizedPem = publicKeyPem.endsWith('\n') ? publicKeyPem : `${publicKeyPem}\n`;

    zip.file(confirmationFileName, finalJsonString);
    zip.file(publicKeyFileName, normalizedPem);

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const exportFileName = `confirmation-export-${caseNumber}-${timestampString}.zip`;

    // Create download
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    
    a.download = exportFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Confirmation export ZIP generated for case ${caseNumber}`);
    
    // Log successful confirmation export
    const endTime = Date.now();
    const confirmationCount = Object.keys(caseConfirmations).length;
    await auditService.logConfirmationExport(
      user,
      caseNumber,
      exportFileName,
      confirmationCount,
      'success',
      [],
      undefined, // Original examiner UID not available here
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: zipBlob.size,
        validationStepsCompleted: confirmationCount,
        validationStepsFailed: 0
      },
      {
        present: signaturePresent,
        valid: signatureValid,
        keyId: signatureKeyId
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
      `confirmation-export-${caseNumber}-error.zip`,
      0,
      'failure',
      [error instanceof Error ? error.message : 'Unknown error'],
      undefined,
      {
        processingTimeMs: endTime - startTime,
        fileSizeBytes: 0
      },
      {
        present: signaturePresent,
        valid: signatureValid,
        keyId: signatureKeyId
      }
    );
    
    auditService.endWorkflow();
    
    throw error;
  }
}
