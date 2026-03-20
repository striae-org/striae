import type { User } from 'firebase/auth';
import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './cases.module.css';
import { Toast } from '~/components/toast/toast';
import { CasesModal } from './cases-modal';
import { FilesModal } from '../files/files-modal';
import { ImageUploadZone } from '../upload/image-upload-zone';
import {
  validateCaseNumber,
  checkExistingCase,
  createNewCase,
} from '../../actions/case-manage';
import {
  fetchFiles,
  deleteFile,
} from '../../actions/image-manage';
import { 
  checkReadOnlyCaseExists 
} from '../../actions/case-review';
import { 
  canCreateCase, 
  canUploadFile, 
  getLimitsDescription,
  getUserData,
  getFileAnnotations
} from '~/utils/data';
import { type FileData, type CaseActionType } from '~/types';

interface CaseSidebarProps {
  user: User;
  onImageSelect: (file: FileData) => void;
  onCaseChange: (caseNumber: string) => void;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  onNotesClick: () => void;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  caseNumber: string;
  setCaseNumber: (caseNumber: string) => void;
  currentCase: string | null;
  setCurrentCase: (caseNumber: string) => void;
  error: string;
  setError: (error: string) => void;
  successAction: CaseActionType;
  setSuccessAction: (action: CaseActionType) => void;
  isReadOnly?: boolean;
  isConfirmed?: boolean;
  confirmationSaveVersion?: number;
  selectedFileId?: string;
  isUploading?: boolean;
  onUploadStatusChange?: (isUploading: boolean) => void;
  onUploadComplete?: (result: { successCount: number; failedFiles: string[] }) => void;
}

const SUCCESS_MESSAGE_TIMEOUT = 3000;

export const CaseSidebar = ({ 
  user, 
  onImageSelect, 
  onCaseChange,
  imageLoaded,
  setImageLoaded,
  onNotesClick,
  files,
  setFiles,
  caseNumber,
  setCaseNumber,
  currentCase,
  setCurrentCase,
  error,
  setError,
  successAction,
  setSuccessAction,
  isReadOnly = false,
  isConfirmed = false,
  confirmationSaveVersion = 0,
  selectedFileId,
  isUploading = false,
  onUploadStatusChange,
  onUploadComplete
}: CaseSidebarProps) => {
  
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setFileError] = useState('');
  const [showCaseManagement, setShowCaseManagement] = useState(false);
  const [canCreateNewCase, setCanCreateNewCase] = useState(true);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [canUploadNewFile, setCanUploadNewFile] = useState(true);
  const [createCaseError, setCreateCaseError] = useState('');
  const [uploadFileError, setUploadFileError] = useState('');
  const [limitsDescription, setLimitsDescription] = useState('');
  const [permissionChecking, setPermissionChecking] = useState(false);
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

  const calculateCaseConfirmationStatus = useCallback((
    statuses: { [fileId: string]: { includeConfirmation: boolean; isConfirmed: boolean } }
  ) => {
    const filesRequiringConfirmation = files
      .map((file) => statuses[file.id] || { includeConfirmation: false, isConfirmed: false })
      .filter((status) => status.includeConfirmation);

    const allConfirmedFiles = filesRequiringConfirmation.every((status) => status.isConfirmed);

    return {
      includeConfirmation: filesRequiringConfirmation.length > 0,
      isConfirmed: filesRequiringConfirmation.length > 0 ? allConfirmedFiles : false,
    };
  }, [files]);

  // Function to check user permissions (extracted for reuse)
  const checkUserPermissions = useCallback(async () => {
    setPermissionChecking(true);
    try {
      const casePermission = await canCreateCase(user);
      setCanCreateNewCase(casePermission.canCreate);
      setCreateCaseError(casePermission.reason || '');

      // Only show limits description for restricted accounts
      const userData = await getUserData(user);
      if (userData && !userData.permitted) {
        const description = await getLimitsDescription(user);
        setLimitsDescription(description);
      } else {
        setLimitsDescription(''); // Clear the description for permitted users
      }
    } catch (error) {
      console.error('Error checking user permissions:', error);
      setCreateCaseError('Unable to verify account permissions');
    } finally {
      setPermissionChecking(false);
    }
  }, [user]);

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

  // Check user permissions on mount and when user changes
  useEffect(() => {
    checkUserPermissions();
  }, [checkUserPermissions]);

  // Check file upload permissions when currentCase or files change
  useEffect(() => {
    checkFileUploadPermissions();
  }, [checkFileUploadPermissions]);
   
  useEffect(() => {
    if (currentCase) {
      setIsLoading(true);
      fetchFiles(user, currentCase, { skipValidation: true })
        .then(loadedFiles => {
          setFiles(loadedFiles);
        })
        .catch(err => {
          console.error('Failed to load files:', err);
          setFileError(err instanceof Error ? err.message : 'Failed to load files');
        })
        .finally(() => {
          setIsLoading(false);
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

      // Fetch all annotations in parallel
      const annotationPromises = files.map(async (file) => {
        try {
          const annotations = await getFileAnnotations(user, currentCase, file.id);
          return {
            fileId: file.id,
            includeConfirmation: annotations?.includeConfirmation ?? false,
            isConfirmed: !!annotations?.confirmationData,
          };
        } catch (err) {
          console.error(`Error fetching annotations for file ${file.id}:`, err);
          return {
            fileId: file.id,
            includeConfirmation: false,
            isConfirmed: false,
          };
        }
      });

      // Wait for all fetches to complete
      const results = await Promise.all(annotationPromises);

      // Build the statuses map from results
      const statuses: { [fileId: string]: { includeConfirmation: boolean; isConfirmed: boolean } } = {};
      results.forEach((result) => {
        statuses[result.fileId] = {
          includeConfirmation: result.includeConfirmation,
          isConfirmed: result.isConfirmed,
        };
      });

      if (isCancelled) {
        return;
      }

      setFileConfirmationStatus(statuses);
      setCaseConfirmationStatus(calculateCaseConfirmationStatus(statuses));
    };

    fetchConfirmationStatuses();

    return () => {
      isCancelled = true;
    };
  }, [currentCase, fileIdsKey, user, files, calculateCaseConfirmationStatus]);

  // Refresh only selected file confirmation status after confirmation-related data is persisted
  useEffect(() => {
    let isCancelled = false;

    const refreshSelectedFileConfirmationStatus = async () => {
      if (!currentCase || !user || !selectedFileId || files.length === 0) {
        return;
      }

      try {
        const annotations = await getFileAnnotations(user, currentCase, selectedFileId);
        const selectedStatus = {
          includeConfirmation: annotations?.includeConfirmation ?? false,
          isConfirmed: !!annotations?.confirmationData,
        };

        if (isCancelled) {
          return;
        }

        setFileConfirmationStatus((previous) => {
          const next = {
            ...previous,
            [selectedFileId]: selectedStatus,
          };

          setCaseConfirmationStatus(calculateCaseConfirmationStatus(next));
          return next;
        });
      } catch (err) {
        console.error(`Error refreshing confirmation status for file ${selectedFileId}:`, err);
      }
    };

    refreshSelectedFileConfirmationStatus();

    return () => {
      isCancelled = true;
    };
  }, [currentCase, fileIdsKey, user, selectedFileId, confirmationSaveVersion, files.length, calculateCaseConfirmationStatus]);

  useEffect(() => {
    if (error) {
      setToastMessage(error);
      setToastType('error');
      setIsToastVisible(true);
    }
  }, [error]);

  useEffect(() => {
    if (successAction) {
      setToastMessage(`Case ${currentCase} ${successAction} successfully!`);
      setToastType('success');
      setIsToastVisible(true);
    }
    // currentCase intentionally omitted: we capture its value at the time successAction changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successAction]);
  
  const handleCase = async () => {
    setIsLoading(true);
    setError('');
    setCreateCaseError(''); // Clear permission errors when starting new operation
    
    if (!validateCaseNumber(caseNumber)) {
      setError('Invalid case number format');
      setIsLoading(false);
      return;
    }

    try {
      const existingCase = await checkExistingCase(user, caseNumber);
      
      if (existingCase) {
        // Loading existing case - always allowed
        setCurrentCase(caseNumber);
        onCaseChange(caseNumber);
        const files = await fetchFiles(user, caseNumber, { skipValidation: true });
        setFiles(files);
        setCaseNumber('');
        setSuccessAction('loaded');
        setShowCaseManagement(false);
        setTimeout(() => setSuccessAction(null), SUCCESS_MESSAGE_TIMEOUT);
        return;
      }

      // Check if a read-only case with this number exists
      const existingReadOnlyCase = await checkReadOnlyCaseExists(user, caseNumber);
      if (existingReadOnlyCase) {
        setError(`Case "${caseNumber}" already exists as a read-only review case. You cannot create a case with the same number.`);
        setIsLoading(false);
        return;
      }

      // Creating new case - check permissions
      if (!canCreateNewCase) {
        setError(createCaseError || 'You cannot create more cases.');
        setCreateCaseError(''); // Clear duplicate error
        setIsLoading(false);
        return;
      }

      const newCase = await createNewCase(user, caseNumber);
      setCurrentCase(newCase.caseNumber);
      onCaseChange(newCase.caseNumber);
      setFiles([]);
      setCaseNumber('');
      setSuccessAction('created');
      setShowCaseManagement(false);
      setTimeout(() => setSuccessAction(null), SUCCESS_MESSAGE_TIMEOUT);
      
      // Refresh permissions after successful case creation
      // This updates the UI for users with limited permissions
      await checkUserPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load/create case');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };



  const handleFileDelete = async (fileId: string) => {
    // Don't allow file deletion for read-only cases
    if (isReadOnly) {
      return;
    }

    if (!currentCase) return;
    
    setFileError('');
    setDeletingFileId(fileId);
    
    try {
      await deleteFile(user, currentCase, fileId);
      const updatedFiles = files.filter(f => f.id !== fileId);
      setFiles(updatedFiles);      
      onImageSelect({ id: 'clear', originalFilename: '/clear.jpg', uploadedAt: '' });
      setImageLoaded(false);
      
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

return (
    <>
    <div className={styles.caseSection}>
        {currentCase && !showCaseManagement ? (
          <div className={`${styles.caseLoad} mb-4`}>
            <button
              className={styles.switchCaseButton}
              onClick={() => setShowCaseManagement(true)}
              disabled={isUploading}
              title={isUploading ? "Cannot switch cases while uploading files" : undefined}
            >
              Switch Case
            </button>
          </div>
        ) : (
          <>
            <h4>Load/Create Case</h4>
            {limitsDescription && (
              <p className={styles.limitsInfo}>
                {limitsDescription}
              </p>
            )}
            <div className={`${styles.caseInput} mb-4`}>
              <input
                type="text"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="Case #"
              />
            </div>
            <div className={`${styles.caseLoad} mb-4`}>
              <button
                onClick={handleCase}
                disabled={isLoading || !caseNumber || permissionChecking || (isReadOnly && !!currentCase) || isUploading}
                title={
                  isUploading
                    ? "Cannot load/create cases while uploading files"
                    : (isReadOnly && currentCase)
                    ? "Cannot load/create cases while reviewing a read-only case. Clear the current case first."
                    : (!canCreateNewCase ? createCaseError : undefined)
                }
              >
                {isLoading ? 'Loading...' : permissionChecking ? 'Checking permissions...' : 'Load/Create Case'}
              </button>
            </div>
            <div className={styles.caseInput}>
              <button
                onClick={() => setIsModalOpen(true)}
                className={styles.listButton}
                disabled={isUploading}
                title={isUploading ? "Cannot list cases while uploading files" : undefined}
              >
                List All Cases
              </button>
            </div>
            {currentCase && (
              <div className="mb-4">
                <button
                  className={styles.cancelSwitchButton}
                  onClick={() => setShowCaseManagement(false)}
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
    <CasesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectCase={setCaseNumber}
        currentCase={currentCase || ''}
        user={user}
      />
      
      <FilesModal
        isOpen={isFilesModalOpen}
        onClose={() => setIsFilesModalOpen(false)}
        onFileSelect={handleImageSelect}
        currentCase={currentCase}
        files={files}
        setFiles={setFiles}
        isReadOnly={isReadOnly}
        selectedFileId={selectedFileId}
      />
      
        <div className={styles.filesSection}>
      <div className={isReadOnly && currentCase ? styles.readOnlyContainer : styles.caseHeader}>
        <h4 className={`${styles.caseNumber} ${
          currentCase && caseConfirmationStatus.includeConfirmation 
            ? caseConfirmationStatus.isConfirmed 
              ? styles.caseConfirmed 
              : styles.caseNotConfirmed
            : ''
        }`}>
          {currentCase || 'No Case Selected'}
        </h4>
        {isReadOnly && currentCase && (
          <div className={styles.readOnlyBadge}>(Read-Only)</div>
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
      
      {!currentCase ? (
        <p className={styles.emptyState}>Create or select a case to view files</p>
      ) : files.length === 0 ? (
        <p className={styles.emptyState}>No files found for {currentCase}</p>
      ) : (
        <>
          {!canUploadNewFile && (
            <div className={styles.limitReached}>
              <p>Upload limit reached for this case</p>
            </div>
          )}
          <ul className={styles.fileList}>
            {files.map((file) => {
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
            })}
          </ul>
        </>
      )}
    </div>
    <div className={`${styles.sidebarToggle} mb-4`}>
    <button
          onClick={onNotesClick}
          disabled={isImageNotesDisabled}
          title={imageNotesTitle}
        >
          Image Notes
        </button>
        </div>
      </div>
    <Toast
      message={toastMessage}
      type={toastType}
      isVisible={isToastVisible}
      onClose={() => {
        setIsToastVisible(false);
        setError('');
        setSuccessAction(null);
      }}
    />
    </>
  );
};