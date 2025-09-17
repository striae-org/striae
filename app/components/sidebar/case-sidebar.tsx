import { User } from 'firebase/auth';
import {
  exportCaseData,
  exportAllCases,
  downloadCaseAsJSON,
  downloadCaseAsCSV,
  downloadAllCasesAsJSON,
  downloadAllCasesAsCSV,
  downloadCaseAsZip
} from '../actions/case-export';
import { useState, useEffect, useRef } from 'react';
import styles from './cases.module.css';
import { CasesModal } from './cases-modal';
import { CaseExport, ExportFormat } from './case-export/case-export';
import {
  validateCaseNumber,
  checkExistingCase,
  createNewCase,
  renameCase,
  deleteCase,
} from '../actions/case-manage';
import {
  fetchFiles,
  uploadFile,
  deleteFile,
} from '../actions/image-manage';
import { 
  canCreateCase, 
  canUploadFile, 
  getLimitsDescription,
  getUserData
} from '~/utils/permissions';
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
}: CaseSidebarProps) => {
  
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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


    const fileInputRef = useRef<HTMLInputElement>(null);

    const allowedTypes = [
      'image/png',
      'image/gif', 
      'image/jpeg',
      'image/webp',
      'image/svg+xml'
    ];

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
        const permission = await canUploadFile(user, currentCase, currentFileCount);
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
      fetchFiles(user, currentCase)
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
        const files = await fetchFiles(user, caseNumber);
        setFiles(files);
        setCaseNumber('');
        setSuccessAction('loaded');
        setTimeout(() => setSuccessAction(null), SUCCESS_MESSAGE_TIMEOUT);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentCase) return;

    setFileError('');
    setIsUploadingFile(true);
    setUploadProgress(0);

    if (!allowedTypes.includes(file.type)) {
      setFileError('Only PNG, GIF, JPEG, WEBP, or SVG files are allowed');
      setIsUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setFileError(''), 3000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10 MB');
      setIsUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setFileError(''), 3000);
      return;
    }

    try {
    const uploadedFile = await uploadFile(user, currentCase, file, (progress) => {
      setUploadProgress(progress);
    });
    const updatedFiles = [...files, uploadedFile];
    setFiles(updatedFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Refresh file upload permissions after successful upload
    // Pass the new file count directly to avoid state update timing issues
    await checkFileUploadPermissions(updatedFiles.length);
  } catch (err) {
    setFileError(err instanceof Error ? err.message : 'Upload failed');
    setTimeout(() => setFileError(''), 3000);
  } finally {
    setIsUploadingFile(false);
    setUploadProgress(0);
  }
};

  const handleFileDelete = async (fileId: string) => {
    if (!currentCase) return;
    
    setFileError('');
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
    }
  };

  const handleRenameCase = async () => {
  if (!currentCase || !newCaseName) return;
  
  if (!validateCaseNumber(newCaseName)) {
    setError('Invalid new case number format');
    return;
  }
  
  setIsRenaming(true);
  setError('');
  
  try {
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
      console.log(`Starting export for case: "${exportCaseNumber}" in ${format.toUpperCase()} format${includeImages ? ' with images (ZIP)' : ''}`);
      
      if (includeImages) {
        // ZIP export with images - only available for single case exports
        await downloadCaseAsZip(user, exportCaseNumber, format);
      } else {
        // Standard data-only export
        const exportData = await exportCaseData(user, exportCaseNumber, {
          includeAnnotations: true,
          includeMetadata: true
        });
        
        console.log('Export data generated successfully:', exportData);
        
        // Download the exported data in the selected format
        if (format === 'json') {
          downloadCaseAsJSON(exportData);
        } else {
          downloadCaseAsCSV(exportData);
        }
      }
      
      console.log(`Case export completed for: ${exportCaseNumber} in ${format.toUpperCase()} format${includeImages ? ' with images' : ''}`);
    } catch (error) {
      console.error('Export failed:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  const handleExportAll = async (onProgress: (current: number, total: number, caseName: string) => void, format: ExportFormat) => {
    try {
      console.log(`Starting export of all cases in ${format.toUpperCase()} format...`);
      
      // Export all cases with progress callback
      const exportData = await exportAllCases(user, {
        includeAnnotations: true,
        includeMetadata: true
      }, onProgress);
      
      console.log('All cases export data generated successfully:', exportData);
      
      // Download the exported data in the selected format
      if (format === 'json') {
        downloadAllCasesAsJSON(exportData);
      } else {
        downloadAllCasesAsCSV(exportData);
      }
      
      console.log(`All cases export completed in ${format.toUpperCase()} format`);
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
        disabled={isLoading || !caseNumber || permissionChecking}
        title={!canCreateNewCase ? createCaseError : undefined}
      >
            {isLoading ? 'Loading...' : permissionChecking ? 'Checking permissions...' : 'Load/Create Case'}
      </button>      
      </div>
      <div className={styles.caseInput}>            
      <button 
            onClick={() => setIsModalOpen(true)}
            className={styles.listButton}
          >
            List All Cases
          </button>
    </div>
    <div className={styles.caseInput}>            
      <button 
            onClick={() => setIsExportModalOpen(true)}
            className={styles.exportButton}
          >
            Export Case Data
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
      />
        <div className={styles.filesSection}>
      <h4>{currentCase || 'No Case Selected'}</h4>
      {currentCase && (
        <div className={styles.fileUpload}>
      <label htmlFor="file-upload">Upload Image:</label>
      <input
        id="file-upload"
        ref={fileInputRef}
        type="file"
        accept="image/png, image/gif, image/jpeg, image/webp, image/svg+xml"
        onChange={handleFileUpload}
        disabled={isUploadingFile || !canUploadNewFile}
        className={styles.fileInput}
        aria-label="Upload image file"
        title={!canUploadNewFile ? uploadFileError : undefined}
      />      
      {isUploadingFile && (
        <>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${uploadProgress}%` }}
          />          
        </div>
        <span className={styles.uploadingText}>
            {uploadProgress === 100 ? 'Processing...' : `${uploadProgress}%`}
          </span>
          </>
      )}
      {fileError && <p className={styles.error}>{fileError}</p>}
      {!canUploadNewFile && uploadFileError && (
        <p className={styles.error}>{uploadFileError}</p>
      )}
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
            {files.map((file) => (
              <li key={file.id}
                className={styles.fileItem}>
                  <button
                    className={styles.fileButton}
                    onClick={() => handleImageSelect(file)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImageSelect(file)}
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
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
    <div className={`${styles.sidebarToggle} mb-4`}>
    <button
          onClick={onNotesClick}
          disabled={!imageLoaded}          
        >
          Image Notes
        </button>
        </div>
          {currentCase && (
        <div className={styles.caseActionsSection}>
          <button
            onClick={() => setShowCaseActions(!showCaseActions)}
            className={styles.caseActionsToggle}
          >
            {showCaseActions ? 'Hide' : 'Rename/Delete Case'}
          </button>
          
          {showCaseActions && (
            <div className={styles.caseActionsContent}>
              <div className={`${styles.caseRename} mb-4`}>
                <input
                  type="text"
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  placeholder="New Case Number"            
                />
                <button
                  onClick={handleRenameCase}
                  disabled={isRenaming || !newCaseName}            
                >
                  {isRenaming ? 'Renaming...' : 'Rename Case'}
                </button>
              </div>
              
              <div className={styles.deleteCaseSection}>
                <button
                  onClick={handleDeleteCase}
                  disabled={isDeletingCase}
                  className={styles.deleteWarningButton}
                >
                  {isDeletingCase ? 'Deleting...' : 'Delete Case'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};