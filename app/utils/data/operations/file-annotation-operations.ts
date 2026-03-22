import type { User } from 'firebase/auth';
import type { AnnotationData } from '~/types';

import { fetchDataApi } from '../../api';
import { canAccessCase, canModifyCase, validateUserSession } from '../permissions';
import { removeFileConfirmationSummary, upsertFileConfirmationSummary } from './confirmation-summary-operations';
import type { DataOperationOptions } from './types';

/**
 * Get file annotation data from R2 storage.
 */
export const getFileAnnotations = async (
  user: User,
  caseNumber: string,
  fileId: string
): Promise<AnnotationData | null> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    const accessCheck = await canAccessCase(user, caseNumber);
    if (!accessCheck.allowed) {
      throw new Error(`Access denied: ${accessCheck.reason}`);
    }

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
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch file annotations: ${response.status} ${response.statusText}`);
    }

    return await response.json() as AnnotationData;
  } catch (error) {
    console.error(`Error fetching annotations for ${caseNumber}/${fileId}:`, error);
    return null;
  }
};

/**
 * Save file annotation data to R2 storage.
 */
export const saveFileAnnotations = async (
  user: User,
  caseNumber: string,
  fileId: string,
  annotationData: AnnotationData,
  options: DataOperationOptions = {}
): Promise<void> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    if (options.skipValidation !== true) {
      const modifyCheck = await canModifyCase(user, caseNumber);
      if (!modifyCheck.allowed) {
        throw new Error(`Modification denied: ${modifyCheck.reason}`);
      }
    }

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

    try {
      await upsertFileConfirmationSummary(user, caseNumber, fileId, dataToSave);
    } catch (summaryError) {
      console.warn(`Failed to update confirmation summary for ${caseNumber}/${fileId}:`, summaryError);
    }
  } catch (error) {
    console.error(`Error saving annotations for ${caseNumber}/${fileId}:`, error);
    throw error;
  }
};

/**
 * Delete file annotation data from R2 storage.
 */
export const deleteFileAnnotations = async (
  user: User,
  caseNumber: string,
  fileId: string,
  options: { skipValidation?: boolean } = {}
): Promise<void> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

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

    try {
      await removeFileConfirmationSummary(user, caseNumber, fileId);
    } catch (summaryError) {
      console.warn(`Failed to update confirmation summary after delete for ${caseNumber}/${fileId}:`, summaryError);
    }
  } catch (error) {
    console.error(`Error deleting annotations for ${caseNumber}/${fileId}:`, error);
    throw error;
  }
};

/**
 * Check if a file has annotations.
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
