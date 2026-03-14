import type { User } from 'firebase/auth';
import { CaseExportData } from '~/types';
import { saveNotes } from '../notes-manage';

/**
 * Import annotations for all files in the case
 */
export async function importAnnotations(
  user: User,
  caseNumber: string,
  caseData: CaseExportData,
  originalImageIdMapping: Map<string, string> // originalImageId -> newFileId
): Promise<number> {
  let annotationsImported = 0;
  
  try {
    for (const fileEntry of caseData.files) {
      if (fileEntry.annotations && fileEntry.hasAnnotations) {
        const originalImageId = fileEntry.fileData.id;
        const newFileId = originalImageIdMapping.get(originalImageId);
        if (newFileId) {
          // Save annotations using the existing notes management system
          // Bypass access validation for read-only case imports
          await saveNotes(user, caseNumber, newFileId, fileEntry.annotations, { skipValidation: true });
          annotationsImported++;
        }
      }
    }
  } catch (error) {
    console.error('Error importing annotations:', error);
    throw error;
  }
  
  return annotationsImported;
}