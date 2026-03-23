import type { User } from 'firebase/auth';
import type React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './cases.module.css';
import { FilesModal } from '../files/files-modal';
import { ImageUploadZone } from '../upload/image-upload-zone';
import {
  fetchFiles,
  deleteFile,
} from '../../actions/image-manage';
import { 
  canUploadFile, 
  ensureCaseConfirmationSummary,
  getCaseConfirmationSummary
} from '~/utils/data';
import { type FileData } from '~/types';

interface CaseSidebarProps {
  user: User;
  onImageSelect: (file: FileData) => void;
  onOpenCase: () => void;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  onNotesClick: () => void;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  currentCase: string | null;
  isReadOnly?: boolean;
  isArchivedCase?: boolean;
  isConfirmed?: boolean;
  confirmationSaveVersion?: number;
  selectedFileId?: string;
  isUploading?: boolean;
  onUploadStatusChange?: (isUploading: boolean) => void;
  onUploadComplete?: (result: { successCount: number; failedFiles: string[] }) => void;
  onOpenCaseExport?: () => void;
}

export const CaseSidebar = ({ 
  user, 
  onImageSelect, 
  onOpenCase,
  imageLoaded,
  setImageLoaded,
  onNotesClick,
  files,
  setFiles,
  currentCase,
  isReadOnly = false,
  isArchivedCase = false,
  isConfirmed = false,
  confirmationSaveVersion = 0,
  selectedFileId,
  isUploading = false,
  onUploadStatusChange,
  onUploadComplete,
  onOpenCaseExport
}: CaseSidebarProps) => {
  
  const [, setFileError] = useState('');
  const [canUploadNewFile, setCanUploadNewFile] = useState(true);
  const [uploadFileError, setUploadFileError] = useState('');
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [fileConfirmationStatus, setFileConfirmationStatus] = useState<{
    [fileId: string]: { includeConfirmation: boolean; isConfirmed: boolean }
  }>({});
  const [caseConfirmationStatus, setCaseConfirmationStatus] = useState<{
    includeConfirmation: boolean;
    isConfirmed: boolean;
  }>({ includeConfirmation: false, isConfirmed: false });

  const fileIdsKey = useMemo(
    () => files.map((file) => file.id).sort().join('|'),
    [files]
  );

  // Function to check file upload permissions (extracted for reuse)
  const checkFileUploadPermissions = useCallback(async (fileCount?: number) => {
    if (currentCase) {
      try {
        // Use provided fileCount or fall back to current files.length
        const currentFileCount = fileCount !== undefined ? fileCount : files.length;
        const permission = await canUploadFile(user, currentFileCount);
        setCanUploadNewFile(permission.canUpload);
        setUploadFileError(permission.reason || '');
      } catch (error) {
        console.error('Error checking file upload permission:', error);
        setCanUploadNewFile(false);
        setUploadFileError('Unable to verify upload permissions');
      }
    } else {
      setCanUploadNewFile(true);
      setUploadFileError('');
    }
  }, [currentCase, files.length, user]);

  // Check file upload permissions when currentCase or files change
  useEffect(() => {
    checkFileUploadPermissions();
  }, [checkFileUploadPermissions]);
   
  useEffect(() => {
    if (currentCase) {
      fetchFiles(user, currentCase, { skipValidation: true })
        .then(loadedFiles => {
          setFiles(loadedFiles);
        })
        .catch(err => {
          console.error('Failed to load files:', err);
          setFileError(err instanceof Error ? err.message : 'Failed to load files');
        });
    } else {
      setFiles([]);
    }
  }, [user, currentCase, setFiles]);

  // Fetch confirmation status for all files when case/files change
  useEffect(() => {
    let isCancelled = false;

    const fetchConfirmationStatuses = async () => {
      if (!currentCase || !user || files.length === 0) {
        if (!isCancelled) {
          setFileConfirmationStatus({});
          setCaseConfirmationStatus({ includeConfirmation: false, isConfirmed: false });
        }
        return;
      }

      const caseSummary = await ensureCaseConfirmationSummary(user, currentCase, files).catch((error) => {
        console.error(`Error fetching confirmation summary for case ${currentCase}:`, error);
        return null;
      });

      if (!caseSummary) {
        return;
      }

      if (isCancelled) {
        return;
      }

      setFileConfirmationStatus(caseSummary.filesById);
      setCaseConfirmationStatus({
        includeConfirmation: caseSummary.includeConfirmation,
        isConfirmed: caseSummary.isConfirmed
      });
    };

    fetchConfirmationStatuses();

    return () => {
      isCancelled = true;
    };
  }, [currentCase, fileIdsKey, user, files]);

  // Refresh only selected file confirmation status after confirmation-related data is persisted
  useEffect(() => {
    let isCancelled = false;

    const refreshSelectedFileConfirmationStatus = async () => {
      if (!currentCase || !user || !selectedFileId || files.length === 0) {
        return;
      }

      try {
        const caseSummary =
          await getCaseConfirmationSummary(user, currentCase) ||
          await ensureCaseConfirmationSummary(user, currentCase, files);

        if (isCancelled) {
          return;
        }

        setFileConfirmationStatus(caseSummary.filesById);
        setCaseConfirmationStatus({
          includeConfirmation: caseSummary.includeConfirmation,
          isConfirmed: caseSummary.isConfirmed
        });
      } catch (err) {
        console.error(`Error refreshing confirmation status for file ${selectedFileId}:`, err);
      }
    };

    refreshSelectedFileConfirmationStatus();

    return () => {
      isCancelled = true;
    };
  }, [currentCase, fileIdsKey, user, selectedFileId, confirmationSaveVersion, files]);

  const handleFileDelete = async (fileId: string) => {
    // Don't allow file deletion for read-only cases
    if (isReadOnly) {
      return;
    }

    if (!currentCase) return;
    
    setFileError('');
    setDeletingFileId(fileId);
    
    try {
      const deleteResult = await deleteFile(user, currentCase, fileId);
      const updatedFiles = files.filter(f => f.id !== fileId);
      setFiles(updatedFiles);      
      onImageSelect({ id: 'clear', originalFilename: '/clear.jpg', uploadedAt: '' });
      setImageLoaded(false);

      if (deleteResult.imageMissing) {
        setFileError(`File record deleted. Image asset "${deleteResult.fileName}" was not found and was skipped.`);
      }
      
      // Refresh file upload permissions after successful file deletion
      // Pass the new file count directly to avoid state update timing issues
      await checkFileUploadPermissions(updatedFiles.length);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingFileId(null);
    }
  };

const handleImageSelect = (file: FileData) => {
    onImageSelect(file);
    // Prevent notes from opening against stale image state while selection loads.
    setImageLoaded(false);
  };

  const selectedFileConfirmationState = selectedFileId
    ? fileConfirmationStatus[selectedFileId]
    : undefined;

  const isCheckingSelectedFileConfirmation = Boolean(
    selectedFileId && !selectedFileConfirmationState
  );

  const isSelectedFileConfirmed =
    isConfirmed || !!selectedFileConfirmationState?.isConfirmed;

  const isImageNotesDisabled =
    !imageLoaded ||
    isReadOnly ||
    isSelectedFileConfirmed ||
    isUploading ||
    isCheckingSelectedFileConfirmation;

  const imageNotesTitle = isUploading
    ? 'Cannot edit notes while uploading'
    : isCheckingSelectedFileConfirmation
    ? 'Checking confirmation status...'
    : isSelectedFileConfirmed
    ? 'Cannot edit notes for confirmed images'
    : isReadOnly
    ? 'Cannot edit notes for read-only cases'
    : !imageLoaded
    ? 'Select an image first'
    : undefined;

  const showCaseExportButton = Boolean(currentCase && isReadOnly && !isArchivedCase);

  const exportCaseTitle = isUploading
    ? 'Cannot export while uploading'
    : !currentCase
    ? 'Load a case first'
    : undefined;

return (
    <>
    <div className={styles.caseSection}>

      <FilesModal
        isOpen={isFilesModalOpen}
        onClose={() => setIsFilesModalOpen(false)}
        onFileSelect={handleImageSelect}
        currentCase={currentCase}
        files={files}
        setFiles={setFiles}
        isReadOnly={isReadOnly}
        selectedFileId={selectedFileId}
        confirmationSaveVersion={confirmationSaveVersion}
      />
      
        <div className={styles.filesSection}>
        <div className={currentCase ? (isReadOnly ? styles.readOnlyContainer : styles.caseHeader) : styles.emptyCaseHeader}>
        {currentCase ? (
          <h4 className={`${styles.caseNumber} ${
            caseConfirmationStatus.includeConfirmation 
              ? caseConfirmationStatus.isConfirmed 
                ? styles.caseConfirmed 
                : styles.caseNotConfirmed
              : ''
          }`}>
            {currentCase}
          </h4>
        ) : (
          <button
            type="button"
            className={styles.openCaseButton}
            onClick={onOpenCase}
          >
            Open Case
          </button>
        )}
      </div>
      {currentCase && (
        <ImageUploadZone
          user={user}
          currentCase={currentCase}
          isReadOnly={isReadOnly}
          canUploadNewFile={canUploadNewFile}
          uploadFileError={uploadFileError}
          onFilesChanged={setFiles}
          onUploadPermissionCheck={checkFileUploadPermissions}
          currentFiles={files}
          onUploadStatusChange={onUploadStatusChange}
          onUploadComplete={onUploadComplete}
        />
      )}
      
      {/* Files Modal Button - positioned between upload and file list */}
      {currentCase && (
        <div className={styles.filesModalSection}>
          <button
            className={styles.filesModalButton}
            onClick={() => setIsFilesModalOpen(true)}
            disabled={files.length === 0 || isUploading}
            title={isUploading ? "Cannot view files while uploading" : files.length === 0 ? "No files to view" : "View all files in modal"}
          >
            View All Files ({files.length})
          </button>
        </div>
      )}
      
      {currentCase ? (
        <ul className={styles.fileList}>
          {files.length === 0 ? (
            <li className={styles.fileListMessage}>No files found for {currentCase}</li>
          ) : (
            files.map((file) => {
              const confirmationStatus = fileConfirmationStatus[file.id];
              let confirmationClass = '';

              if (confirmationStatus?.includeConfirmation) {
                confirmationClass = confirmationStatus.isConfirmed
                  ? styles.fileItemConfirmed
                  : styles.fileItemNotConfirmed;
              }

              return (
                <li key={file.id}
                  className={`${styles.fileItem} ${selectedFileId === file.id ? styles.active : ''} ${confirmationClass}`}>
                    <button
                      className={styles.fileButton}
                      onClick={() => handleImageSelect(file)}
                      onKeyDown={(e) => e.key === 'Enter' && handleImageSelect(file)}
                      disabled={isUploading}
                      title={isUploading ? "Cannot select files while uploading" : undefined}
                    >
                    <span className={styles.fileName}>{file.originalFilename}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
                        handleFileDelete(file.id);
                      }
                    }}
                    className={styles.deleteButton}
                    aria-label="Delete file"
                    disabled={isReadOnly || deletingFileId === file.id || isUploading}
                    style={{ opacity: (isReadOnly || isUploading) ? 0.5 : 1, cursor: (isReadOnly || isUploading) ? 'not-allowed' : 'pointer' }}
                    title={isUploading ? "Cannot delete while uploading" : undefined}
                  >
                    {deletingFileId === file.id ? '⏳' : '×'}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : (
        <div className={styles.fileListPlaceholder}>Select a case to view files</div>
      )}
    </div>
    <div className={styles.sidebarToggle}>
      {showCaseExportButton ? (
        <button
          className={styles.confirmationExportButton}
          onClick={onOpenCaseExport}
          disabled={isUploading || !currentCase}
          title={exportCaseTitle}
        >
          Export Confirmations
        </button>
      ) : (
        <button
          onClick={onNotesClick}
          disabled={isImageNotesDisabled}
          title={imageNotesTitle}
        >
          Image Notes
        </button>
      )}
    </div>
      </div>
    </>
  );
};