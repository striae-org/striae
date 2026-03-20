import type { User } from 'firebase/auth';
import { useState, useCallback } from 'react';
import styles from './sidebar.module.css';
import { CaseSidebar } from './cases/case-sidebar';
import { Toast } from '../toast/toast';
import { type FileData } from '~/types';

interface SidebarProps {
  user: User;
  onImageSelect: (file: FileData) => void;
  imageId?: string;
  currentCase: string;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
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
  currentCase,
  imageLoaded,
  setImageLoaded,
  files,
  setFiles,
  showNotes,
  setShowNotes,
  onAnnotationRefresh,
  isReadOnly = false,
  isConfirmed = false,
  confirmationSaveVersion = 0,
  isUploading: initialIsUploading = false,
  onUploadStatusChange,
}: SidebarProps) => {
  const [isUploading, setIsUploading] = useState(initialIsUploading);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [isToastVisible, setIsToastVisible] = useState(false);

  const handleUploadStatusChange = useCallback((uploading: boolean) => {
    setIsUploading(uploading);
    onUploadStatusChange?.(uploading);
  }, [onUploadStatusChange]);

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
      <CaseSidebar 
        user={user} 
        onImageSelect={onImageSelect}
        currentCase={currentCase}
        imageLoaded={imageLoaded}
        setImageLoaded={setImageLoaded}
        files={files}
        setFiles={setFiles}
        onNotesClick={() => setShowNotes(true)}
        isReadOnly={isReadOnly}
        isConfirmed={isConfirmed}
        confirmationSaveVersion={confirmationSaveVersion}
        selectedFileId={imageId}
        isUploading={isUploading}
        onUploadStatusChange={handleUploadStatusChange}
        onUploadComplete={handleUploadComplete}
      />
      <Toast 
        message={toastMessage}
        type={toastType}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />
    </div>
  );
};