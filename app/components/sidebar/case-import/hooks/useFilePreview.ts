import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { previewCaseImport } from '~/components/actions/case-review';
import { CaseImportPreview } from '~/types';
import { ConfirmationPreview } from '../components/ConfirmationPreviewSection';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

interface UseFilePreviewReturn {
  casePreview: CaseImportPreview | null;
  confirmationPreview: ConfirmationPreview | null;
  loadCasePreview: (file: File) => Promise<void>;
  loadConfirmationPreview: (file: File) => Promise<void>;
  clearPreviews: () => void;
}

/**
 * Custom hook for handling file preview loading
 */
export const useFilePreview = (
  user: User | null,
  setError: (error: string) => void,
  setIsLoadingPreview: (loading: boolean) => void,
  clearImportData: () => void
): UseFilePreviewReturn => {
  const [casePreview, setCasePreview] = useState<CaseImportPreview | null>(null);
  const [confirmationPreview, setConfirmationPreview] = useState<ConfirmationPreview | null>(null);

  const loadCasePreview = useCallback(async (file: File) => {
    if (!user) {
      setError('User authentication required');
      return;
    }

    setIsLoadingPreview(true);
    try {
      const preview = await previewCaseImport(file, user);
      setCasePreview(preview);
    } catch (error) {
      console.error('Error loading case preview:', error);
      setError(`Failed to read case information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      clearImportData();
    } finally {
      setIsLoadingPreview(false);
    }
  }, [user, setError, setIsLoadingPreview, clearImportData]);

  const loadConfirmationPreview = useCallback(async (file: File) => {
    if (!user) {
      setError('User authentication required');
      return;
    }

    setIsLoadingPreview(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!isRecord(parsed)) {
        throw new Error('Invalid confirmation data format');
      }

      const metadata = isRecord(parsed.metadata) ? parsed.metadata : undefined;
      const confirmations = isRecord(parsed.confirmations) ? parsed.confirmations : undefined;
      
      // Extract confirmation IDs from the confirmations object
      const confirmationIds: string[] = [];
      if (confirmations) {
        Object.values(confirmations).forEach((imageConfirmations) => {
          if (Array.isArray(imageConfirmations)) {
            imageConfirmations.forEach((confirmation) => {
              if (isRecord(confirmation) && typeof confirmation.confirmationId === 'string') {
                confirmationIds.push(confirmation.confirmationId);
              }
            });
          }
        });
      }

      const caseNumber =
        metadata && typeof metadata.caseNumber === 'string' ? metadata.caseNumber : 'Unknown';
      const fullName =
        metadata && typeof metadata.exportedByName === 'string' ? metadata.exportedByName : 'Unknown';
      const exportDate =
        metadata && typeof metadata.exportDate === 'string'
          ? metadata.exportDate
          : new Date().toISOString();
      const totalConfirmations =
        metadata && typeof metadata.totalConfirmations === 'number'
          ? metadata.totalConfirmations
          : confirmationIds.length;

      const preview: ConfirmationPreview = {
        caseNumber,
        fullName,
        exportDate,
        totalConfirmations,
        confirmationIds
      };
      
      setConfirmationPreview(preview);
    } catch (error) {
      console.error('Error loading confirmation preview:', error);
      setError(`Failed to read confirmation data: ${error instanceof Error ? error.message : 'Invalid JSON format'}`);
      clearImportData();
    } finally {
      setIsLoadingPreview(false);
    }
  }, [user, setError, setIsLoadingPreview, clearImportData]);

  const clearPreviews = useCallback(() => {
    setCasePreview(null);
    setConfirmationPreview(null);
  }, []);

  return {
    casePreview,
    confirmationPreview,
    loadCasePreview,
    loadConfirmationPreview,
    clearPreviews
  };
};