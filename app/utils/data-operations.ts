/**
 * Centralized data worker operations for case and file management
 * Provides consistent API key management, error handling, and validation
 * for all interactions with the data worker microservice
 */

import type { User } from 'firebase/auth';
import { type CaseData, type AnnotationData, type ConfirmationImportData } from '~/types';
import { fetchDataApi } from './data-api-client';
import { validateUserSession, canAccessCase, canModifyCase } from './permissions';
import {
  type ForensicManifestData,
  type ForensicManifestSignature,
  FORENSIC_MANIFEST_VERSION
} from './SHA256';
import { CONFIRMATION_SIGNATURE_VERSION } from './confirmation-signature';
import {
  AUDIT_EXPORT_SIGNATURE_VERSION,
  type AuditExportSigningPayload,
  isValidAuditExportSigningPayload
} from './audit-export-signature';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface DataAccessResult {
  allowed: boolean;
  reason?: string;
}

export interface FileUpdate {
  fileId: string;
  annotations: AnnotationData;
}

export interface BatchUpdateResult {
  successful: string[];
  failed: { fileId: string; error: string }[];
}

export interface DataOperationOptions {
  includeTimestamp?: boolean;
  retryCount?: number;
  skipValidation?: boolean;
}

export interface ManifestSigningResponse {
  manifestVersion: string;
  signature: ForensicManifestSignature;
}

export interface ConfirmationSigningResponse {
  signatureVersion: string;
  signature: ForensicManifestSignature;
}

export interface AuditExportSigningResponse {
  signatureVersion: string;
  signature: ForensicManifestSignature;
}

// Higher-order function type for data operations
export type DataOperation<T> = (user: User, ...args: unknown[]) => Promise<T>;

// ============================================================================
// CORE CASE DATA OPERATIONS
// ============================================================================

/**
 * Get case data from R2 storage with validation and error handling
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 * @param options - Optional configuration for the operation
 */
export const getCaseData = async (
  user: User, 
  caseNumber: string, 
  options: DataOperationOptions = {}
): Promise<CaseData | null> => {
  try {
    // Validate user session
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Validate case access unless explicitly skipped.
    if (options.skipValidation !== true) {
      const accessCheck = await canAccessCase(user, caseNumber);
      if (!accessCheck.allowed) {
        return null; // Case doesn't exist or user doesn't have access
      }
    }

    // Validate case number format
    if (!caseNumber || typeof caseNumber !== 'string' || caseNumber.trim() === '') {
      throw new Error('Invalid case number provided');
    }

    const response = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`,
      {
        method: 'GET'
      }
    );

    if (response.status === 404) {
      return null; // Case not found
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch case data: ${response.status} ${response.statusText}`);
    }

    const caseData = await response.json() as CaseData;
    return caseData;

  } catch (error) {
    console.error(`Error fetching case data for ${caseNumber}:`, error);
    throw error;
  }
};

/**
 * Update case data in R2 storage with validation and timestamps
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 * @param caseData - Case data to save
 * @param options - Optional configuration
 */
export const updateCaseData = async (
  user: User,
  caseNumber: string,
  caseData: CaseData,
  options: DataOperationOptions = {}
): Promise<void> => {
  try {
    // Validate user session
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Check modification permissions
    const modifyCheck = await canModifyCase(user, caseNumber);
    if (!modifyCheck.allowed) {
      throw new Error(`Modification denied: ${modifyCheck.reason}`);
    }

    // Validate inputs
    if (!caseNumber || typeof caseNumber !== 'string') {
      throw new Error('Invalid case number provided');
    }

    if (!caseData || typeof caseData !== 'object') {
      throw new Error('Invalid case data provided');
    }

    // Add timestamp if requested (default: true)
    const dataToSave = options.includeTimestamp !== false ? {
      ...caseData,
      updatedAt: new Date().toISOString()
    } : caseData;

    const response = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update case data: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    console.error(`Error updating case data for ${caseNumber}:`, error);
    throw error;
  }
};

/**
 * Delete case data from R2 storage with validation
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 */
export const deleteCaseData = async (
  user: User,
  caseNumber: string,
  options: DataOperationOptions = {}
): Promise<void> => {
  try {
    // Validate user session
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Check modification permissions if validation is not explicitly disabled
    if (options.skipValidation !== true) {
      const modifyCheck = await canModifyCase(user, caseNumber);
      if (!modifyCheck.allowed) {
        throw new Error(`Delete denied: ${modifyCheck.reason}`);
      }
    }

    const response = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/data.json`,
      {
        method: 'DELETE'
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete case data: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    console.error(`Error deleting case data for ${caseNumber}:`, error);
    throw error;
  }
};

// ============================================================================
// FILE ANNOTATION OPERATIONS
// ============================================================================

/**
 * Get file annotation data from R2 storage
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 * @param fileId - File identifier
 */
export const getFileAnnotations = async (
  user: User,
  caseNumber: string,
  fileId: string
): Promise<AnnotationData | null> => {
  try {
    // Validate user session
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Check case access
    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      throw new Error(`Access denied: ${accessCheck.reason}`);
    }

    // Validate inputs
    if (!fileId || typeof fileId !== 'string') {
      throw new Error('Invalid file ID provided');
    }

    const response = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/${encodeURIComponent(fileId)}/data.json`,
      {
        method: 'GET'
      }
    );

    if (response.status === 404) {
      return null; // No annotations found
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch file annotations: ${response.status} ${response.statusText}`);
    }

    return await response.json() as AnnotationData;

  } catch (error) {
    console.error(`Error fetching annotations for ${caseNumber}/${fileId}:`, error);
    return null; // Return null for graceful handling
  }
};

/**
 * Save file annotation data to R2 storage
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 * @param fileId - File identifier
 * @param annotationData - Annotation data to save
 * @param options - Optional configuration
 */
export const saveFileAnnotations = async (
  user: User,
  caseNumber: string,
  fileId: string,
  annotationData: AnnotationData,
  options: DataOperationOptions = {}
): Promise<void> => {
  try {
    // Validate user session
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Check modification permissions if validation is not explicitly disabled
    if (options.skipValidation !== true) {
      const modifyCheck = await canModifyCase(user, caseNumber);
      if (!modifyCheck.allowed) {
        throw new Error(`Modification denied: ${modifyCheck.reason}`);
      }
    }

    // Validate inputs
    if (!fileId || typeof fileId !== 'string') {
      throw new Error('Invalid file ID provided');
    }

    if (!annotationData || typeof annotationData !== 'object') {
      throw new Error('Invalid annotation data provided');
    }

    // Enforce immutability once confirmation data exists on an image.
    const existingResponse = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/${encodeURIComponent(fileId)}/data.json`,
      {
        method: 'GET'
      }
    );

    if (existingResponse.ok) {
      const existingAnnotations = await existingResponse.json() as AnnotationData;
      if (existingAnnotations?.confirmationData) {
        throw new Error('Cannot modify annotations for a confirmed image');
      }
    } else if (existingResponse.status !== 404) {
      throw new Error(`Failed to verify existing annotations: ${existingResponse.status} ${existingResponse.statusText}`);
    }

    // Add timestamp to annotation data
    const dataToSave = {
      ...annotationData,
      updatedAt: new Date().toISOString()
    };

    const response = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/${encodeURIComponent(fileId)}/data.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to save file annotations: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    console.error(`Error saving annotations for ${caseNumber}/${fileId}:`, error);
    throw error;
  }
};

/**
 * Delete file annotation data from R2 storage
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 * @param fileId - File identifier
 * @param options - Additional options for the operation
 */
export const deleteFileAnnotations = async (
  user: User,
  caseNumber: string,
  fileId: string,
  options: { skipValidation?: boolean } = {}
): Promise<void> => {
  try {
    // Validate user session
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Check modification permissions if validation is not explicitly disabled
    if (options.skipValidation !== true) {
      const modifyCheck = await canModifyCase(user, caseNumber);
      if (!modifyCheck.allowed) {
        throw new Error(`Delete denied: ${modifyCheck.reason}`);
      }
    }

    const response = await fetchDataApi(
      user,
      `/${encodeURIComponent(user.uid)}/${encodeURIComponent(caseNumber)}/${encodeURIComponent(fileId)}/data.json`,
      {
        method: 'DELETE'
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete file annotations: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    console.error(`Error deleting annotations for ${caseNumber}/${fileId}:`, error);
    throw error;
  }
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Update multiple files with annotation data in a single operation
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 * @param updates - Array of file updates to apply
 */
export const batchUpdateFiles = async (
  user: User,
  caseNumber: string,
  updates: FileUpdate[],
  options: DataOperationOptions = {}
): Promise<BatchUpdateResult> => {
  const result: BatchUpdateResult = {
    successful: [],
    failed: []
  };

  try {
    // Validate session and permissions once for the batch
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    // Check modification permissions
    const modifyCheck = await canModifyCase(user, caseNumber);
    if (!modifyCheck.allowed) {
      throw new Error(`Batch update denied: ${modifyCheck.reason}`);
    }

    const perFileOptions: DataOperationOptions = {
      ...options,
      skipValidation: true
    };

    // Process each file update
    for (const update of updates) {
      try {
        await saveFileAnnotations(user, caseNumber, update.fileId, update.annotations, perFileOptions);
        result.successful.push(update.fileId);
      } catch (error) {
        result.failed.push({
          fileId: update.fileId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;

  } catch (error) {
    // If validation fails, mark all as failed
    for (const update of updates) {
      result.failed.push({
        fileId: update.fileId,
        error: error instanceof Error ? error.message : 'Batch operation failed'
      });
    }
    return result;
  }
};

/**
 * Duplicate case data from one case to another (for case renaming operations)
 * @param user - Authenticated user
 * @param fromCaseNumber - Source case number
 * @param toCaseNumber - Destination case number
 */
export const duplicateCaseData = async (
  user: User,
  fromCaseNumber: string,
  toCaseNumber: string,
  options: { skipDestinationCheck?: boolean } = {}
): Promise<void> => {
  try {
    // For rename operations, we skip the destination check since the case doesn't exist yet
    if (!options.skipDestinationCheck) {
      // Check if user has permission to create/modify the destination case
      const accessResult = await canModifyCase(user, toCaseNumber);
      if (!accessResult.allowed) {
        throw new Error(`User does not have permission to create or modify case ${toCaseNumber}: ${accessResult.reason || 'Access denied'}`);
      }
    }

    // Get source case data
    const sourceCaseData = await getCaseData(user, fromCaseNumber);
    if (!sourceCaseData) {
      throw new Error(`Source case ${fromCaseNumber} not found`);
    }

    // Update case number in the data
    const newCaseData = {
      ...sourceCaseData,
      caseNumber: toCaseNumber,
      updatedAt: new Date().toISOString()
    };

    // Save to new location
    await updateCaseData(
      user, 
      toCaseNumber, 
      newCaseData
    );

    // Copy file annotations if they exist
    if (sourceCaseData.files && sourceCaseData.files.length > 0) {
      const updates: FileUpdate[] = [];
      
      for (const file of sourceCaseData.files) {
        const annotations = await getFileAnnotations(user, fromCaseNumber, file.id);
        if (annotations) {
          updates.push({
            fileId: file.id,
            annotations
          });
        }
      }

      if (updates.length > 0) {
        await batchUpdateFiles(
          user, 
          toCaseNumber, 
          updates
        );
      }
    }

  } catch (error) {
    console.error(`Error duplicating case data from ${fromCaseNumber} to ${toCaseNumber}:`, error);
    throw error;
  }
};

// ============================================================================
// VALIDATION AND UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate data access permissions for a user and case
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 */
export const validateDataAccess = async (
  user: User,
  caseNumber: string
): Promise<DataAccessResult> => {
  try {
    // Session validation
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      return { allowed: false, reason: sessionValidation.reason };
    }

    // Case access validation
    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      return { allowed: false, reason: accessCheck.reason };
    }

    return { allowed: true };

  } catch (error) {
    console.error('Error validating data access:', error);
    return { allowed: false, reason: 'Access validation failed' };
  }
};

/**
 * Higher-order function for consistent data operation patterns
 * Wraps operations with standard validation and error handling
 * @param operation - The data operation to wrap
 */
export const withDataOperation = <T>(
  operation: DataOperation<T>
) => async (user: User, ...args: unknown[]): Promise<T> => {
  try {
    // Standard session validation
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Operation failed: ${sessionValidation.reason}`);
    }

    // Execute the operation
    return await operation(user, ...args);

  } catch (error) {
    console.error('Data operation failed:', error);
    throw error;
  }
};

/**
 * Check if a case exists in storage
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 */
export const caseExists = async (
  user: User,
  caseNumber: string
): Promise<boolean> => {
  try {
    const caseData = await getCaseData(user, caseNumber);
    return caseData !== null;
  } catch (error) {
    // If we get an access denied error, the case might exist but user can't access it
    if (error instanceof Error && error.message.includes('Access denied')) {
      return false; // For existence checking, treat access denied as "doesn't exist for this user"
    }
    console.error(`Error checking case existence for ${caseNumber}:`, error);
    return false;
  }
};

/**
 * Check if a file has annotations
 * @param user - Authenticated user
 * @param caseNumber - Case identifier
 * @param fileId - File identifier
 */
export const fileHasAnnotations = async (
  user: User,
  caseNumber: string,
  fileId: string
): Promise<boolean> => {
  try {
    const annotations = await getFileAnnotations(user, caseNumber, fileId);
    return annotations !== null;
  } catch (error) {
    console.error(`Error checking annotations for ${caseNumber}/${fileId}:`, error);
    return false;
  }
};

/**
 * Request a server-side signature for a forensic manifest.
 * The signature is generated by the data worker using a private key secret.
 */
export const signForensicManifest = async (
  user: User,
  caseNumber: string,
  manifest: ForensicManifestData
): Promise<ManifestSigningResponse> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      throw new Error(`Manifest signing denied: ${accessCheck.reason}`);
    }

    const response = await fetchDataApi(user, '/api/forensic/sign-manifest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        caseNumber,
        manifest
      })
    });

    const responseData = await response.json().catch(() => null) as {
      success?: boolean;
      error?: string;
      manifestVersion?: string;
      signature?: ForensicManifestSignature;
    } | null;

    if (!response.ok) {
      throw new Error(
        responseData?.error ||
        `Failed to sign forensic manifest: ${response.status} ${response.statusText}`
      );
    }

    if (!responseData?.success || !responseData.signature || !responseData.manifestVersion) {
      throw new Error('Invalid manifest signing response from data worker');
    }

    if (responseData.manifestVersion !== FORENSIC_MANIFEST_VERSION) {
      throw new Error(
        `Unexpected manifest version from signer: ${responseData.manifestVersion}`
      );
    }

    return {
      manifestVersion: responseData.manifestVersion,
      signature: responseData.signature
    };
  } catch (error) {
    console.error(`Error signing forensic manifest for ${caseNumber}:`, error);
    throw error;
  }
};

/**
 * Request a server-side signature for confirmation export data.
 * The signature is generated by the data worker using a private key secret.
 */
export const signConfirmationData = async (
  user: User,
  caseNumber: string,
  confirmationData: ConfirmationImportData
): Promise<ConfirmationSigningResponse> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      throw new Error(`Confirmation signing denied: ${accessCheck.reason}`);
    }

    const response = await fetchDataApi(user, '/api/forensic/sign-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        caseNumber,
        confirmationData,
        signatureVersion: CONFIRMATION_SIGNATURE_VERSION
      })
    });

    const responseData = await response.json().catch(() => null) as {
      success?: boolean;
      error?: string;
      signatureVersion?: string;
      signature?: ForensicManifestSignature;
    } | null;

    if (!response.ok) {
      throw new Error(
        responseData?.error ||
        `Failed to sign confirmation data: ${response.status} ${response.statusText}`
      );
    }

    if (!responseData?.success || !responseData.signature || !responseData.signatureVersion) {
      throw new Error('Invalid confirmation signing response from data worker');
    }

    if (responseData.signatureVersion !== CONFIRMATION_SIGNATURE_VERSION) {
      throw new Error(
        `Unexpected confirmation signature version from signer: ${responseData.signatureVersion}`
      );
    }

    return {
      signatureVersion: responseData.signatureVersion,
      signature: responseData.signature
    };
  } catch (error) {
    console.error(`Error signing confirmation data for ${caseNumber}:`, error);
    throw error;
  }
};

/**
 * Request a server-side signature for audit export metadata.
 * The signature is generated by the data worker using a private key secret.
 */
export const signAuditExportData = async (
  user: User,
  auditExport: AuditExportSigningPayload,
  options: { caseNumber?: string } = {}
): Promise<AuditExportSigningResponse> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    if (!isValidAuditExportSigningPayload(auditExport)) {
      throw new Error('Invalid audit export payload for signing');
    }

    const caseNumber = options.caseNumber;
    if (caseNumber) {
      const accessCheck = await canAccessCase(user, caseNumber);
      if (!accessCheck.allowed) {
        throw new Error(`Audit export signing denied: ${accessCheck.reason}`);
      }
    }

    const response = await fetchDataApi(user, '/api/forensic/sign-audit-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        caseNumber,
        auditExport,
        signatureVersion: AUDIT_EXPORT_SIGNATURE_VERSION
      })
    });

    const responseData = await response.json().catch(() => null) as {
      success?: boolean;
      error?: string;
      signatureVersion?: string;
      signature?: ForensicManifestSignature;
    } | null;

    if (!response.ok) {
      throw new Error(
        responseData?.error ||
        `Failed to sign audit export data: ${response.status} ${response.statusText}`
      );
    }

    if (!responseData?.success || !responseData.signature || !responseData.signatureVersion) {
      throw new Error('Invalid audit export signing response from data worker');
    }

    if (responseData.signatureVersion !== AUDIT_EXPORT_SIGNATURE_VERSION) {
      throw new Error(
        `Unexpected audit export signature version from signer: ${responseData.signatureVersion}`
      );
    }

    return {
      signatureVersion: responseData.signatureVersion,
      signature: responseData.signature
    };
  } catch (error) {
    console.error('Error signing audit export data:', error);
    throw error;
  }
};
