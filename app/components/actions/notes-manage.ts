import type { User } from 'firebase/auth';
import { type AnnotationData } from '~/types/annotations';
import { saveFileAnnotations, getFileAnnotations, type DataOperationOptions } from '~/utils/data-operations';

export const saveNotes = async (
  user: User,
  caseNumber: string,
  imageId: string,
  annotationData: AnnotationData,
  options: DataOperationOptions = {}
): Promise<void> => {
  try {
    // Use centralized function with built-in validation and error handling
    await saveFileAnnotations(user, caseNumber, imageId, annotationData, options);
  } catch (error) {
    console.error('Error saving notes:', error);
    throw error;
  }
};

export const getNotes = async (
  user: User,
  caseNumber: string,
  imageId: string
): Promise<AnnotationData | null> => {
  try {
    // Use centralized function with built-in validation and error handling
    return await getFileAnnotations(user, caseNumber, imageId);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return null;
  }
};