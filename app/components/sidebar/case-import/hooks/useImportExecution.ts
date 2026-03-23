import { useCallback } from 'react';
import type { User } from 'firebase/auth';
import { importCaseForReview, importConfirmationData } from '~/components/actions/case-review';
import { type ImportResult, type ConfirmationImportResult } from '~/types';

interface ProgressState {
  stage: string;
  progress: number;
  details?: string;
}

interface UseImportExecutionProps {
  user: User | null;
  selectedFile: File | null;
  importType: 'case' | 'confirmation' | null;
  setImportProgress: (progress: ProgressState | null) => void;
  clearMessages: () => void;
  setError: (error: string) => void;
  setSuccess: (success: string) => void;
  setIsImporting: (importing: boolean) => void;
  onImportComplete?: (result: ImportResult | ConfirmationImportResult) => void;
  onUpdateExistingCase: (caseNumber: string) => void;
  onClose: () => void;
}

/**
 * Custom hook for handling import execution logic
 */
export const useImportExecution = ({
  user,
  selectedFile,
  importType,
  setImportProgress,
  clearMessages,
  setError,
  setSuccess,
  setIsImporting,
  onImportComplete,
  onUpdateExistingCase,
  onClose
}: UseImportExecutionProps) => {

  const executeImport = useCallback(async () => {
    if (!user || !selectedFile || !importType) return;
    
    // Clear any existing success and error messages when starting a new import
    clearMessages();
    setIsImporting(true);
    
    try {
      if (importType === 'case') {
        // Handle case import
        setImportProgress({ stage: 'Starting case import...', progress: 0 });
        
        // Track if we're in cleanup phase to trigger UI reset
        let hasTriggeredCleanupReset = false;
        
        const result = await importCaseForReview(
          user,
          selectedFile,
          { overwriteExisting: true },
          (stage: string, progress: number, details?: string) => {
            setImportProgress({ stage, progress, details });
            
            // Detect cleanup phase and trigger UI reset once
            if (!hasTriggeredCleanupReset && 
                (stage.toLowerCase().includes('checking existing read-only cases') || 
                 stage.toLowerCase().includes('cleaning up existing case') ||
                 details?.toLowerCase().includes('cleaning up previous imports') ||
                 details?.toLowerCase().includes('removing existing case data'))) {
              hasTriggeredCleanupReset = true;
              
              // Trigger immediate UI reset during cleanup phase
              onImportComplete?.({ 
                success: true,
                caseNumber: '',
                isReadOnly: false,
                filesImported: 0,
                annotationsImported: 0,
                errors: [],
                warnings: []
              });
            }
          }
        );
        
        if (result.success) {
          setSuccess(`Successfully imported case "${result.caseNumber}" for review`);
          
          // Update existing case status
          onUpdateExistingCase(result.caseNumber);
          
          // Call completion callback
          onImportComplete?.(result);
          
          // Auto-close after success
          setTimeout(() => {
            onClose();
          }, 2000);
          
        } else {
          setError(result.errors?.join(', ') || 'Case import failed');
        }
        
      } else if (importType === 'confirmation') {
        // Handle confirmation import
        setImportProgress({ stage: 'Validating confirmation data...', progress: 50 });
        
        const result = await importConfirmationData(user, selectedFile);
        
        if (result.success) {
          let message = `Successfully imported ${result.confirmationsImported} confirmation(s) for case "${result.caseNumber}"`;
          
          // If there were blocked confirmations, include that information
          if (result.errors && result.errors.length > 0) {
            message += `\n\n${result.errors.length} confirmation(s) were blocked:\n\n${result.errors.join('\n\n')}`;
          }
          
          setSuccess(message);

          onImportComplete?.(result);
          
          // No auto-close for confirmation imports - let user read the details and close manually
          
        } else {
          setError(result.errors?.join(', ') || 'Confirmation import failed');
        }
      }
      
    } catch (error) {
      console.error('Import failed:', error);
      setError(error instanceof Error ? error.message : 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  }, [
    user, 
    selectedFile, 
    importType, 
    setImportProgress, 
    clearMessages,
    setError, 
    setSuccess, 
    setIsImporting, 
    onImportComplete, 
    onUpdateExistingCase, 
    onClose
  ]);

  return {
    executeImport
  };
};