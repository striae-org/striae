import { User } from 'firebase/auth';
import {
  exportCaseData,
  exportAllCases,
  downloadCaseAsJSON,
  downloadCaseAsCSV,
  downloadAllCasesAsJSON,
  downloadAllCasesAsCSV,
  downloadCaseAsZip
} from '../../actions/case-export';
import { useState, useEffect } from 'react';
import styles from './cases.module.css';
import { CasesModal } from './cases-modal';
import { FilesModal } from '../files/files-modal';
import { CaseExport, ExportFormat } from '../case-export/case-export';
import { ImageUploadZone } from '../upload/image-upload-zone';
import { UserAuditViewer } from '~/components/audit/user-audit-viewer';
import {
  validateCaseNumber,
  checkExistingCase,
  createNewCase,
  renameCase,
  deleteCase,
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
  getUserData
} from '~/utils/permissions';
import { getFileAnnotations } from '~/utils/data-operations';
import { FileData, CaseActionType } from '~/types';

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
  selectedFileId,
  isUploading = false,
  onUploadStatusChange,
  onUploadComplete
}: CaseSidebarProps) => {
  
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileError, setFileError] = useState('');
  const [newCaseName, setNewCaseName] = useState('');
  const [showCaseActions, setShowCaseActions] = useState(false);
  const [canCreateNewCase, setCanCreateNewCase] = useState(true);
  const [canUploadNewFile, setCanUploadNewFile] = useState(true);
  const [createCaseError, setCreateCaseError] = useState('');
  const [uploadFileError, setUploadFileError] = useState('');
  const [limitsDescription, setLimitsDescription] = useState('');
  const [permissionChecking, setPermissionChecking] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [fileConfirmationStatus, setFileConfirmationStatus] = useState<{
    [fileId: string]: { includeConfirmation: boolean; isConfirmed: boolean }
  }>({});
  const [caseConfirmationStatus, setCaseConfirmationStatus] = useState<{
    includeConfirmation: boolean;
    isConfirmed: boolean;
  }>({ includeConfirmation: false, isConfirmed: false });

  // Check user permissions on mount and when user changes
  useEffect(() => {
    checkUserPermissions();
  }, [user]);

  // Function to check user permissions (extracted for reuse)
  const checkUserPermissions = async () => {
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
  };

  // Function to check file upload permissions (extracted for reuse)
  const checkFileUploadPermissions = async (fileCount?: number) => {
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
  };

  // Check file upload permissions when currentCase or files change
  useEffect(() => {
    checkFileUploadPermissions();
  }, [user, currentCase, files.length]);
   
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

  // Fetch confirmation status for files when they load, change,
  // or when the currently selected image confirmation state changes
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
            isConfirmed: !!(annotations?.includeConfirmation && annotations?.confirmationData),
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

      // Calculate case confirmation status
      const filesRequiringConfirmation = Object.values(statuses).filter(s => s.includeConfirmation);
      const allConfirmedFiles = filesRequiringConfirmation.every(s => s.isConfirmed);
      
      setCaseConfirmationStatus({
        includeConfirmation: filesRequiringConfirmation.length > 0,
        isConfirmed: filesRequiringConfirmation.length > 0 ? allConfirmedFiles : false,
      });
    };

    fetchConfirmationStatuses();

    return () => {
      isCancelled = true;
    };
  }, [currentCase, files, user, selectedFileId, isConfirmed]);
  
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

  const handleRenameCase = async () => {
  // Don't allow renaming read-only cases
  if (isReadOnly) {
    return;
  }

  if (!currentCase || !newCaseName) return;
  
  if (!validateCaseNumber(newCaseName)) {
    setError('Invalid new case number format');
    return;
  }
  
  setIsRenaming(true);
  setError('');
  
  try {
    // Check if a read-only case with the new name exists
    const existingReadOnlyCase = await checkReadOnlyCaseExists(user, newCaseName);
    if (existingReadOnlyCase) {
      setError(`Case "${newCaseName}" already exists as a read-only review case. You cannot rename to this case number.`);
      setIsRenaming(false);
      return;
    }

    await renameCase(user, currentCase, newCaseName);
    setCurrentCase(newCaseName);
    onCaseChange(newCaseName);
    setNewCaseName('');
    setSuccessAction('loaded');
    setTimeout(() => setSuccessAction(null), SUCCESS_MESSAGE_TIMEOUT);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to rename case');
  } finally {
    setIsRenaming(false);
  }
};

  const handleDeleteCase = async () => {
  // Don't allow deleting read-only cases
  if (isReadOnly) {
    return;
  }

  if (!currentCase) return;
  
  const confirmed = window.confirm(
    `Are you sure you want to delete case ${currentCase}? This will permanently delete all associated files and cannot be undone.`
  );
  
  if (!confirmed) return;
  
  setIsDeletingCase(true);
  setError('');
  
  try {
    await deleteCase(user, currentCase);
    setCurrentCase('');
    onCaseChange('');
    setFiles([]);
    setSuccessAction('deleted');
    setTimeout(() => setSuccessAction(null), SUCCESS_MESSAGE_TIMEOUT);
    
    // Refresh permissions after successful case deletion
    // This allows users with limited permissions to create a new case
    await checkUserPermissions();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete case');
  } finally {
    setIsDeletingCase(false);
  }
};

const handleImageSelect = (file: FileData) => {
    onImageSelect(file);
    setImageLoaded(true);
  };

  const handleExport = async (exportCaseNumber: string, format: ExportFormat, includeImages?: boolean) => {
    try {
      if (includeImages) {
        // ZIP export with images - only available for single case exports
        await downloadCaseAsZip(user, exportCaseNumber, format);
      } else {
        // Standard data-only export
        const exportData = await exportCaseData(user, exportCaseNumber, {
          includeMetadata: true
        });
        
        // Download the exported data in the selected format
        if (format === 'json') {
          await downloadCaseAsJSON(user, exportData);
        } else {
          await downloadCaseAsCSV(user, exportData);
        }
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  const handleExportAll = async (onProgress: (current: number, total: number, caseName: string) => void, format: ExportFormat) => {
    try {
      // Export all cases with progress callback
      const exportData = await exportAllCases(user, {
        includeMetadata: true
      }, onProgress);
      
      // Download the exported data in the selected format
      if (format === 'json') {
        await downloadAllCasesAsJSON(user, exportData);
      } else {
        await downloadAllCasesAsCSV(user, exportData);
      }
      
    } catch (error) {
      console.error('Export all failed:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

return (
    <div className={styles.caseSection}>
     <div className={styles.caseSection}>
        <h4>Case Management</h4>
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
    {error && <p className={styles.error}>{error}</p>}
    {successAction && (
      <p className={styles.success}>
        Case {currentCase} {successAction} successfully!
      </p>
    )}  
    <CasesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectCase={setCaseNumber}
        currentCase={currentCase || ''}
        user={user}
      />
      
      <CaseExport
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        onExportAll={handleExportAll}
        currentCaseNumber={currentCase || ''}
        isReadOnly={isReadOnly}
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
          disabled={!imageLoaded || isReadOnly || isConfirmed || isUploading}
          title={isUploading ? "Cannot edit notes while uploading" : isConfirmed ? "Cannot edit notes for confirmed images" : isReadOnly ? "Cannot edit notes for read-only cases" : !imageLoaded ? "Select an image first" : undefined}
        >
          Image Notes
        </button>
        </div>
          {currentCase && (
        <div className={styles.caseActionsSection}>
          <button
            onClick={() => setShowCaseActions(!showCaseActions)}
            className={styles.caseActionsButton}
            disabled={isUploading}
            title={isUploading ? "Cannot access case actions while uploading" : undefined}
          >
            {showCaseActions ? 'Hide Case Actions' : 'Case Actions'}
          </button>
          
          {showCaseActions && !isUploading && (
            <div className={styles.caseActionsContent}>
              {/* Export Case Data Section */}
              <div className={styles.exportSection}>
                <button 
                  onClick={() => setIsExportModalOpen(true)}
                  className={styles.exportButton}
                  disabled={isUploading}
                  title={isUploading ? "Cannot export while uploading" : undefined}
                >
                  Export Case Data
                </button>
              </div>
              
              {/* Audit Trail Section - Available for all cases */}
              <div className={styles.auditTrailSection}>
                <button
                  onClick={() => setIsAuditTrailOpen(true)}
                  className={styles.auditTrailButton}
                  disabled={isUploading}
                  title={isUploading ? "Cannot view audit trail while uploading" : undefined}
                >
                  Audit Trail
                </button>
              </div>
              
              {/* Rename/Delete Section - Only for owned cases */}
              {!isReadOnly && (
                <div className={styles.renameDeleteSection}>
                  <div className={`${styles.caseRename} mb-4`}>
                    <input
                      type="text"
                      value={newCaseName}
                      onChange={(e) => setNewCaseName(e.target.value)}
                      placeholder="New Case Number"
                      disabled={isUploading}
                    />
                    <button
                      onClick={handleRenameCase}
                      disabled={isRenaming || !newCaseName || isUploading}
                      title={isUploading ? "Cannot rename while uploading" : undefined}
                    >
                      {isRenaming ? 'Renaming...' : 'Rename Case'}
                    </button>
                  </div>
                  
                  <div className={styles.deleteCaseSection}>
                    <button
                      onClick={handleDeleteCase}
                      disabled={isDeletingCase || isUploading}
                      className={styles.deleteWarningButton}
                      title={isUploading ? "Cannot delete while uploading" : undefined}
                    >
                        {isDeletingCase ? 'Deleting...' : 'Delete Case'}
                      </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Unified Audit Viewer */}
      <UserAuditViewer 
        caseNumber={currentCase || ''}
        isOpen={isAuditTrailOpen}
        onClose={() => setIsAuditTrailOpen(false)}
        title={`Audit Trail - Case ${currentCase}`}
      />
      
      </div>
    </div>
  );
};