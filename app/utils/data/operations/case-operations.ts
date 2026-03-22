import type { User } from 'firebase/auth';
import type { CaseData } from '~/types';

import { fetchDataApi } from '../../api';
import { canAccessCase, canModifyCase, validateUserSession } from '../permissions';
import type { DataOperationOptions } from './types';

/**
 * Get case data from R2 storage with validation and error handling.
 */
export const getCaseData = async (
  user: User,
  caseNumber: string,
  options: DataOperationOptions = {}
): Promise<CaseData | null> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    if (options.skipValidation !== true) {
      const accessCheck = await canAccessCase(user, caseNumber);
      if (!accessCheck.allowed) {
        return null;
      }
    }

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
      return null;
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
 * Update case data in R2 storage with validation and timestamps.
 */
export const updateCaseData = async (
  user: User,
  caseNumber: string,
  caseData: CaseData,
  options: DataOperationOptions = {}
): Promise<void> => {
  try {
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    const modifyCheck = await canModifyCase(user, caseNumber);
    if (!modifyCheck.allowed) {
      throw new Error(`Modification denied: ${modifyCheck.reason}`);
    }

    if (!caseNumber || typeof caseNumber !== 'string') {
      throw new Error('Invalid case number provided');
    }

    if (!caseData || typeof caseData !== 'object') {
      throw new Error('Invalid case data provided');
    }

    const dataToSave = options.includeTimestamp !== false
      ? {
          ...caseData,
          updatedAt: new Date().toISOString()
        }
      : caseData;

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
 * Delete case data from R2 storage with validation.
 */
export const deleteCaseData = async (
  user: User,
  caseNumber: string,
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

/**
 * Check if a case exists in storage.
 */
export const caseExists = async (
  user: User,
  caseNumber: string
): Promise<boolean> => {
  try {
    const caseData = await getCaseData(user, caseNumber);
    return caseData !== null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return false;
    }
    console.error(`Error checking case existence for ${caseNumber}:`, error);
    return false;
  }
};
