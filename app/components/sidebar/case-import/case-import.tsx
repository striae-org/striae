import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '~/contexts/auth.context';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { 
  listReadOnlyCases, 
  deleteReadOnlyCase
} from '~/components/actions/case-review';
import {
  type ImportResult,  
  type ConfirmationImportResult
} from '~/types';
import {
  FileSelector,
  CasePreviewSection,
  ConfirmationPreviewSection,
  ProgressSection,
  ExistingCaseSection,
  ConfirmationDialog,
  useImportState,
  useFilePreview,
  useImportExecution,
  isValidImportFile,
  resolveImportType,
  resetFileInput
} from './index';
import styles from './case-import.module.css';

interface CaseImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: ImportResult | ConfirmationImportResult) => void;
}

export const CaseImport = ({ 
  isOpen, 
  onClose, 
  onImportComplete 
}: CaseImportProps) => {
  const { user } = useContext(AuthContext);
  
  // Use our custom hooks
  const {
    importState,
    messages,
    importProgress,
    clearMessages,
    setError,
    setSuccess,
    updateImportState,
    resetImportState,
    setImportProgress
  } = useImportState();
  const canDismissOverlay = !importState.isImporting && !importState.isClearing;
  const {
    handleOverlayMouseDown,
    handleOverlayKeyDown
  } = useOverlayDismiss({
    isOpen,
    onClose,
    canDismiss: canDismissOverlay
  });
  
  const [existingReadOnlyCase, setExistingReadOnlyCase] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Clear import selection state (used by preview hook on validation failure)
  const clearImportSelection = useCallback(() => {
    updateImportState({ selectedFile: null, importType: null });
    resetFileInput(fileInputRef);
  }, [updateImportState]);

  // File preview hook
  const {
    casePreview,
    confirmationPreview,
    loadCasePreview,
    loadConfirmationPreview,
    clearPreviews
  } = useFilePreview(
    user,
    setError,
    (loading) => updateImportState({ isLoadingPreview: loading }),
    clearImportSelection
  );

  // Clear import data helper used by UI actions.
  const clearImportData = useCallback(() => {
    clearImportSelection();
    clearPreviews();
  }, [clearImportSelection, clearPreviews]);

  // Import execution hook
  const { executeImport } = useImportExecution({
    user,
    selectedFile: importState.selectedFile,
    importType: importState.importType,
    setImportProgress,
    clearMessages,
    setError,
    setSuccess,
    setIsImporting: (importing) => updateImportState({ isImporting: importing }),
    onImportComplete,
    onUpdateExistingCase: setExistingReadOnlyCase,
    onClose
  });

  // Check for existing read-only cases
  const checkForExistingReadOnlyCase = useCallback(async () => {
    if (!user) return;
    
    try {
      const readOnlyCases = await listReadOnlyCases(user);
      setExistingReadOnlyCase(readOnlyCases.length > 0 ? readOnlyCases[0].caseNumber : null);
    } catch (error) {
      console.error('Error checking existing read-only cases:', error);
    }
  }, [user]);

  // Clear existing read-only case
  const clearExistingReadOnlyCase = useCallback(async () => {
    if (!user || !existingReadOnlyCase) return;
    
    updateImportState({ isClearing: true });
    
    try {
      await deleteReadOnlyCase(user, existingReadOnlyCase);
      
      const clearedCaseName = existingReadOnlyCase;
      setExistingReadOnlyCase(null);
      setSuccess(`Removed read-only case "${clearedCaseName}"`);
      
      onImportComplete?.({ 
        success: true,
        caseNumber: '',
        isReadOnly: false,
        filesImported: 0,
        annotationsImported: 0,
        errors: [],
        warnings: []
      });
      
    } catch (error) {
      console.error('Error clearing existing read-only case:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear existing case');
    } finally {
      updateImportState({ isClearing: false });
    }
  }, [user, existingReadOnlyCase, updateImportState, setSuccess, setError, onImportComplete]);

  // Handle file selection
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear any existing messages when selecting a new file
    clearMessages();

    if (!isValidImportFile(file)) {
      setError('Only Striae case ZIP files, confirmation ZIP files, or confirmation JSON files are allowed.');
      clearImportData();
      return;
    }

    const importType = await resolveImportType(file);
    if (!importType) {
      setError('The selected file is not a supported Striae case or confirmation import package.');
      clearImportData();
      return;
    }

    updateImportState({ 
      selectedFile: file, 
      importType 
    });
    clearPreviews();
    
    // Load preview based on import type
    if (importType === 'case') {
      await loadCasePreview(file);
    } else if (importType === 'confirmation') {
      await loadConfirmationPreview(file);
    }
  }, [clearMessages, clearImportData, setError, updateImportState, clearPreviews, loadCasePreview, loadConfirmationPreview]);

  // Handle direct file selection (for drag and drop)
  const handleFileSelectDirect = useCallback(async (file: File) => {
    // Clear any existing messages when selecting a new file
    clearMessages();

    if (!isValidImportFile(file)) {
      setError('Only Striae case ZIP files, confirmation ZIP files, or confirmation JSON files are allowed.');
      clearImportData();
      return;
    }

    const importType = await resolveImportType(file);
    if (!importType) {
      setError('The selected file is not a supported Striae case or confirmation import package.');
      clearImportData();
      return;
    }

    updateImportState({ 
      selectedFile: file, 
      importType 
    });
    clearPreviews();
    
    // Load preview based on import type
    if (importType === 'case') {
      await loadCasePreview(file);
    } else if (importType === 'confirmation') {
      await loadConfirmationPreview(file);
    }
  }, [clearMessages, clearImportData, setError, updateImportState, clearPreviews, loadCasePreview, loadConfirmationPreview]);

  // Handle import action
  const handleImport = useCallback(() => {
    if (!user || !importState.selectedFile || !importState.importType) return;
    
    // For case imports, show confirmation dialog with preview
    // For confirmation imports, proceed directly to import
    if (importState.importType === 'case') {
      if (!casePreview) return;
      updateImportState({ showConfirmation: true });
    } else {
      // Direct import for confirmations
      executeImport();
    }
  }, [user, importState.selectedFile, importState.importType, casePreview, updateImportState, executeImport]);

  const handleCancelImport = useCallback(() => {
    updateImportState({ showConfirmation: false });
    clearImportData();
  }, [updateImportState, clearImportData]);

  const handleModalCancel = useCallback(() => {
    clearImportData();
    onClose();
  }, [clearImportData, onClose]);

  // Effects
  useEffect(() => {
    if (user && isOpen) {
      checkForExistingReadOnlyCase();
    }
  }, [user, isOpen, checkForExistingReadOnlyCase]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetImportState();
    }
  }, [isOpen, resetImportState]);

  // Handle confirmation import
  const handleConfirmImport = useCallback(() => {
    executeImport();
    updateImportState({ showConfirmation: false });
  }, [executeImport, updateImportState]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className={styles.overlay}
        onMouseDown={handleOverlayMouseDown}
        onKeyDown={handleOverlayKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Close case import dialog"
      >
        <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Import RO Case or Confirmations</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
            disabled={importState.isImporting || importState.isClearing}
          >
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.fieldGroup}>
            
            {/* Existing read-only case section */}
            <ExistingCaseSection 
              existingReadOnlyCase={existingReadOnlyCase}
              selectedFile={importState.selectedFile}
              onClear={clearExistingReadOnlyCase}
              isClearing={importState.isClearing}
              isImporting={importState.isImporting}
            />
            
            {/* File selector */}
            <FileSelector
              selectedFile={importState.selectedFile}
              onFileSelect={handleFileSelect}
              onFileSelectDirect={handleFileSelectDirect}
              isDisabled={importState.isImporting || importState.isClearing}
              onClear={clearImportData}
            />

            {/* Import type indicator and preview */}
            {importState.selectedFile && importState.importType && (
              <div className={styles.importTypeSection}>
                <div className={styles.importTypeIndicator}>
                  <strong>Import Type:</strong> {importState.importType === 'case' ? 'Case Import' : 'Confirmation Import'}
                </div>
                
                {importState.importType === 'case' && (
                  <CasePreviewSection 
                    casePreview={casePreview} 
                    isLoadingPreview={importState.isLoadingPreview} 
                  />
                )}
                
                {importState.importType === 'confirmation' && (
                  <ConfirmationPreviewSection 
                    confirmationPreview={confirmationPreview} 
                    isLoadingPreview={importState.isLoadingPreview} 
                  />
                )}
              </div>
            )}

            {/* Import progress */}
            <ProgressSection importProgress={importProgress} />

            {/* Hash validation warning */}
            {casePreview?.hashValid === false && (
              <div className={styles.hashWarning}>
                <strong>⚠️ Import Blocked:</strong> Data hash validation failed. 
                This file may have been tampered with or corrupted and cannot be imported.
              </div>
            )}

            {/* Success message */}
            {messages.success && (
              <div className={styles.success}>
                {messages.success}
              </div>
            )}

            {/* Error message */}
            {messages.error && (
              <div className={styles.error}>
                {messages.error}
              </div>
            )}

            {/* Action buttons */}
            <div className={styles.buttonGroup}>
              <button
                className={styles.importButton}
                onClick={handleImport}
                disabled={
                  !importState.selectedFile || 
                  !importState.importType ||
                  importState.isImporting || 
                  importState.isClearing || 
                  importState.isLoadingPreview ||
                  (importState.importType === 'case' && (!casePreview || casePreview.hashValid !== true))
                }
              >
                {importState.isImporting ? 'Importing...' : 
                 importState.importType === 'confirmation' ? 'Import Confirmations' : 'Import Case'}
              </button>
              
              <button
                className={styles.cancelButton}
                onClick={handleModalCancel}
                disabled={importState.isImporting || importState.isClearing}
              >
                Cancel
              </button>
            </div>

            {/* Instructions */}
            <div className={styles.instructions}>
              <h3 className={styles.instructionsTitle}>Case Review Instructions:</h3>
              <ul className={styles.instructionsList}>
                <li>Only ZIP files (.zip) exported with the JSON data format from Striae are accepted</li>
                <li>Only one case can be reviewed at a time</li>
                <li>Imported cases are read-only and cannot be modified</li>
                <li>Importing will automatically replace any existing review case</li>
              </ul>
              <br />
              <h3 className={styles.instructionsTitle}>Confirmation Import Instructions:</h3>
              <ul className={styles.instructionsList}>
                <li>Confirmation imports accept either confirmation JSON files or confirmation ZIP packages exported from Striae</li>
                <li>Only one confirmation file can be imported at a time</li>
                <li>Confirmed images will become read-only and cannot be modified</li>
                <li>If an image has a pre-existing confirmation, it will be skipped</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Confirmation Dialog */}
    <ConfirmationDialog 
      showConfirmation={importState.showConfirmation}
      casePreview={casePreview}
      onConfirm={handleConfirmImport}
      onCancel={handleCancelImport}
    />
    </>
  );
};