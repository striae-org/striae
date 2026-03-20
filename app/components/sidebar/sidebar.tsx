import type { User } from 'firebase/auth';
import { useState, useCallback } from 'react';
import styles from './sidebar.module.css';
import { CaseSidebar } from './cases/case-sidebar';
import { NotesSidebar } from './notes/notes-sidebar';
import { CaseImport } from './case-import/case-import';
import { Toast } from '../toast/toast';
import { type FileData, type ImportResult, type ConfirmationImportResult } from '~/types';

interface SidebarProps {
  user: User;
  onImageSelect: (file: FileData) => void;
  imageId?: string;
  onCaseChange: (caseNumber: string) => void;
  currentCase: string;
  setCurrentCase: (caseNumber: string) => void;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  caseNumber: string;
  setCaseNumber: (caseNumber: string) => void;
  error: string;
  setError: (error: string) => void;
  successAction: 'loaded' | 'created' | 'deleted' | null;
  setSuccessAction: (action: 'loaded' | 'created' | 'deleted' | null) => void;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
  onAnnotationRefresh?: () => void;
  isReadOnly?: boolean;
  isConfirmed?: boolean;
  confirmationSaveVersion?: number;
  isUploading?: boolean;
  onUploadStatusChange?: (isUploading: boolean) => void;
}

export const Sidebar = ({ 
  user, 
  onImageSelect,
  imageId, 
  onCaseChange,
  currentCase,
  setCurrentCase,
  imageLoaded,
  setImageLoaded,
  files,
  setFiles,
  caseNumber,
  setCaseNumber,
  error,
  setError,
  successAction,
  setSuccessAction,
  showNotes,
  setShowNotes,
  onAnnotationRefresh,
  isReadOnly = false,
  isConfirmed = false,
  confirmationSaveVersion = 0,
  isUploading: initialIsUploading = false,
  onUploadStatusChange,
}: SidebarProps) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(initialIsUploading);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [isToastVisible, setIsToastVisible] = useState(false);

  const handleUploadStatusChange = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
    onUploadStatusChange?.(uploading);
  }, [onUploadStatusChange]);

  const handleImportComplete = useCallback((result: ImportResult | ConfirmationImportResult) => {
    if (result.success) {
      // For case imports, load the imported case automatically
      if ('isReadOnly' in result) {
        // This is an ImportResult (case import)
        if (result.caseNumber && result.isReadOnly) {
          // Successful read-only case import - load the case
          onCaseChange(result.caseNumber);
          setCurrentCase(result.caseNumber);
          setCaseNumber(result.caseNumber);
          setSuccessAction('loaded');
        } else if (!result.caseNumber && !result.isReadOnly) {
          // Read-only case cleared - reset all UI state
          setCurrentCase('');
          setCaseNumber('');
          setFiles([]);
          onImageSelect({ id: 'clear', originalFilename: '/clear.jpg', uploadedAt: '' });
          setImageLoaded(false);
          onCaseChange(''); // This will trigger canvas/annotation state reset in main component
          setShowNotes(false); // Close notes sidebar
          setSuccessAction(null);
        }
      }
      // For confirmation imports, no action needed - the confirmations are already loaded
    }
  }, [onCaseChange, setCurrentCase, setCaseNumber, setSuccessAction, setFiles, onImageSelect, setImageLoaded, setShowNotes]);

  const handleUploadComplete = useCallback((result: { successCount: number; failedFiles: string[] }) => {
    if (result.successCount === 0 && result.failedFiles.length > 0) {
      // All files failed
      setToastType('error');
      const errorList = result.failedFiles.map(fn => `${fn} was not uploaded`).join(', ');
      setToastMessage(`Errors: ${errorList}`);
    } else if (result.failedFiles.length > 0) {
      // Some files succeeded, some failed
      const errorList = result.failedFiles.map(fn => `${fn} was not uploaded`).join(', ');
      setToastType('warning');
      setToastMessage(`${result.successCount} file${result.successCount !== 1 ? 's' : ''} successfully uploaded! Errors: ${errorList}`);
    } else if (result.successCount > 0) {
      // All files succeeded
      setToastType('success');
      setToastMessage(`${result.successCount} file${result.successCount !== 1 ? 's' : ''} uploaded!`);
    }
    setIsToastVisible(true);
  }, []);  

  return (
    <div className={styles.sidebar}>
      <CaseImport 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
      {showNotes ? (
        <NotesSidebar 
          currentCase={currentCase}
          onReturn={() => setShowNotes(false)}
          user={user}
          imageId={imageId || ''}
          onAnnotationRefresh={onAnnotationRefresh}
          originalFileName={files.find(file => file.id === imageId)?.originalFilename}
          isUploading={isUploading}
        />
      ) : (
        <>
          <CaseSidebar 
            user={user} 
            onImageSelect={onImageSelect}
            onCaseChange={onCaseChange}
            currentCase={currentCase}
            setCurrentCase={setCurrentCase}
            imageLoaded={imageLoaded}
            setImageLoaded={setImageLoaded}
            files={files}
            setFiles={setFiles}
            caseNumber={caseNumber}
            setCaseNumber={setCaseNumber}
            error={error}
            setError={setError}
            successAction={successAction}
            setSuccessAction={setSuccessAction}
            onNotesClick={() => setShowNotes(true)}
            isReadOnly={isReadOnly}
            isConfirmed={isConfirmed}
            confirmationSaveVersion={confirmationSaveVersion}
            selectedFileId={imageId}
            isUploading={isUploading}
            onUploadStatusChange={handleUploadStatusChange}
            onUploadComplete={handleUploadComplete}
          />
          <div className={styles.importSection}>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className={styles.importButton}
              disabled={isUploading}
              title={isUploading ? 'Cannot import while uploading files' : undefined}
            >
              Import/Clear RO Case
            </button>
          </div>
        </>
      )}
      <Toast 
        message={toastMessage}
        type={toastType}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />
    </div>
  );
};