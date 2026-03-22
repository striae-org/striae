import type { User } from 'firebase/auth';

import { canModifyCase, validateUserSession } from '../permissions';
import { getCaseData, updateCaseData } from './case-operations';
import { getFileAnnotations, saveFileAnnotations } from './file-annotation-operations';
import type { BatchUpdateResult, DataOperationOptions, FileUpdate } from './types';

/**
 * Update multiple files with annotation data in a single operation.
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
    const sessionValidation = await validateUserSession(user);
    if (!sessionValidation.valid) {
      throw new Error(`Session validation failed: ${sessionValidation.reason}`);
    }

    const modifyCheck = await canModifyCase(user, caseNumber);
    if (!modifyCheck.allowed) {
      throw new Error(`Batch update denied: ${modifyCheck.reason}`);
    }

    const perFileOptions: DataOperationOptions = {
      ...options,
      skipValidation: true
    };

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
 * Duplicate case data from one case to another (for case renaming operations).
 */
export const duplicateCaseData = async (
  user: User,
  fromCaseNumber: string,
  toCaseNumber: string,
  options: { skipDestinationCheck?: boolean } = {}
): Promise<void> => {
  try {
    if (!options.skipDestinationCheck) {
      const accessResult = await canModifyCase(user, toCaseNumber);
      if (!accessResult.allowed) {
        throw new Error(`User does not have permission to create or modify case ${toCaseNumber}: ${accessResult.reason || 'Access denied'}`);
      }
    }

    const sourceCaseData = await getCaseData(user, fromCaseNumber);
    if (!sourceCaseData) {
      throw new Error(`Source case ${fromCaseNumber} not found`);
    }

    const newCaseData = {
      ...sourceCaseData,
      caseNumber: toCaseNumber,
      updatedAt: new Date().toISOString()
    };

    await updateCaseData(user, toCaseNumber, newCaseData);

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
        await batchUpdateFiles(user, toCaseNumber, updates);
      }
    }
  } catch (error) {
    console.error(`Error duplicating case data from ${fromCaseNumber} to ${toCaseNumber}:`, error);
    throw error;
  }
};
