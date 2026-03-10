import { User } from 'firebase/auth';
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './image-upload-zone.module.css';
import { uploadFile } from '~/components/actions/image-manage';
import { FileData } from '~/types';

interface ImageUploadZoneProps {
  user: User;
  currentCase: string | null;
  isReadOnly: boolean;
  canUploadNewFile: boolean;
  uploadFileError: string;
  onFilesChanged: (files: FileData[]) => void;
  onUploadPermissionCheck?: (fileCount: number) => Promise<void>;
  currentFiles: FileData[];
  onUploadStatusChange?: (isUploading: boolean) => void;
  onUploadComplete?: (result: { successCount: number; failedFiles: string[] }) => void;
}

const ALLOWED_TYPES = [
  'image/png',
  'image/gif',
  'image/jpeg',
  'image/webp',
  'image/svg+xml'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ImageUploadZone = ({
  user,
  currentCase,
  isReadOnly,
  canUploadNewFile,
  uploadFileError,
  onFilesChanged,
  onUploadPermissionCheck,
  currentFiles,
  onUploadStatusChange,
  onUploadComplete,
}: ImageUploadZoneProps) => {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState('');
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const currentFilesRef = useRef(currentFiles);

  // Keep currentFilesRef in sync with prop to avoid stale closure
  useEffect(() => {
    currentFilesRef.current = currentFiles;
  }, [currentFiles]);

  // Notify parent when upload status changes
  useEffect(() => {
    onUploadStatusChange?.(isUploadingFile);
  }, [isUploadingFile, onUploadStatusChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear any pending timeout
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  // Helper to set error with auto-dismiss, managing timeout properly
  const setErrorWithAutoDismiss = (errorMessage: string) => {
    // Clear any pending timeout from previous error
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    setFileError(errorMessage);
    // Set new timeout for auto-dismiss
    timeoutIdRef.current = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }
      setFileError('');
      timeoutIdRef.current = null;
    }, 3000);
  };

  const validateAndUploadFile = async (file: File, currentFilesList: FileData[]) => {
    if (!file || !currentCase || !user || !user.uid) return { success: false, files: currentFilesList };

    if (!ALLOWED_TYPES.includes(file.type)) {
      if (isMountedRef.current) {
        setErrorWithAutoDismiss(`${file.name}: Only PNG, GIF, JPEG, WEBP, or SVG files are allowed`);
      }
      return { success: false, files: currentFilesList };
    }

    if (file.size > MAX_FILE_SIZE) {
      if (isMountedRef.current) {
        setErrorWithAutoDismiss(`${file.name}: File size must be less than 10 MB`);
      }
      return { success: false, files: currentFilesList };
    }

    try {
      if (isMountedRef.current) {
        setCurrentFileName(file.name);
      }
      const uploadedFile = await uploadFile(user, currentCase, file, (progress) => {
        if (isMountedRef.current) {
          setUploadProgress(progress);
        }
      });
      const updatedFiles = [...currentFilesList, uploadedFile];
      
      if (isMountedRef.current) {
        onFilesChanged(updatedFiles);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }

      // Refresh file upload permissions after successful upload
      if (onUploadPermissionCheck && isMountedRef.current) {
        try {
          await onUploadPermissionCheck(updatedFiles.length);
        } catch (permissionErr) {
          console.error('Failed to refresh upload permissions:', permissionErr);
          // Note: Files have already been successfully uploaded.
          // This error is non-critical but should be tracked in monitoring.
          // In production, consider showing a non-blocking warning notification.
        }
      }
      return { success: true, files: updatedFiles };
    } catch (err) {
      if (isMountedRef.current) {
        setErrorWithAutoDismiss(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`);
      }
      return { success: false, files: currentFilesList };
    }
  };

  // Process files sequentially
  const processFileQueue = async (filesToProcess: File[]) => {
    // Clear any pending timeout from previous errors
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    if (!isMountedRef.current) return;
    
    setUploadQueue(filesToProcess);
    setCurrentFileIndex(0);
    setIsUploadingFile(true);
    setFileError('');
    setUploadProgress(0);

    // Use ref to get current files, avoiding stale closure issues
    let accumulatedFiles = currentFilesRef.current;
    const successfulUploads: string[] = [];
    const failedUploads: string[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      if (!isMountedRef.current) break;
      
      setCurrentFileIndex(i);
      setUploadProgress(0);
      const file = filesToProcess[i];
      const result = await validateAndUploadFile(file, accumulatedFiles);
      
      if (result.success) {
        accumulatedFiles = result.files;
        successfulUploads.push(file.name);
      } else {
        failedUploads.push(file.name);
      }
    }

    if (isMountedRef.current) {
      setIsUploadingFile(false);
      setUploadProgress(0);
      setCurrentFileName('');
      setUploadQueue([]);
      setCurrentFileIndex(0);
      
      // Call completion callback with results
      if (onUploadComplete && (successfulUploads.length > 0 || failedUploads.length > 0)) {
        onUploadComplete({
          successCount: successfulUploads.length,
          failedFiles: failedUploads
        });
      }
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) {
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0 || !currentCase) return;

    // Convert FileList to Array
    const filesToUpload = Array.from(files);
    await processFileQueue(filesToUpload);
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only disable drag mode if leaving the entire drop zone
    // Check if relatedTarget (element being entered) is outside the drop zone
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !dropZoneRef.current?.contains(relatedTarget)) {
      setIsDraggingFiles(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);

    if (isReadOnly) {
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length === 0 || !currentCase) return;

    // Convert FileList to Array and process all files
    const filesToUpload = Array.from(files);
    await processFileQueue(filesToUpload);
  };

  // If read-only or uploads restricted, show only error message
  if (isReadOnly || !canUploadNewFile) {
    return (
      <div className={styles.imageUploadZone}>
        {(isReadOnly || uploadFileError) && (
          <p className={styles.error}>
            {isReadOnly 
              ? 'This case is read-only. You cannot upload files.' 
              : uploadFileError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={dropZoneRef}
      className={`${styles.imageUploadZone} ${isDraggingFiles ? styles.dragActive : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <label htmlFor="file-upload">Upload Images:</label>
      <div className={styles.dragDropHint}>
        <p className={styles.dragDropText}>
          Drag & drop image files here or click below to select
        </p>
      </div>
      <input
        id="file-upload"
        ref={fileInputRef}
        type="file"
        accept="image/png, image/gif, image/jpeg, image/webp, image/svg+xml"
        multiple
        onChange={handleFileInputChange}
        disabled={isUploadingFile || !canUploadNewFile || isReadOnly}
        className={styles.fileInput}
        aria-label="Upload image files"
        title={!canUploadNewFile ? uploadFileError : undefined}
      />
      {isUploadingFile && (
        <>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress}
            aria-valuetext={uploadProgress === 100 ? 'Processing...' : undefined}
            aria-label="Image upload progress"
          >
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className={styles.uploadStatusContainer}>
            <span className={styles.uploadingText}>
              {uploadProgress === 100 ? 'Processing...' : `${uploadProgress}%`}
            </span>
            {uploadQueue.length > 1 && (
              <span className={styles.fileCountText}>
                {currentFileIndex + 1} of {uploadQueue.length}
              </span>
            )}
          </div>
          {currentFileName && (
            <p className={styles.currentFileName}>{currentFileName}</p>
          )}
        </>
      )}
      {fileError && <p className={styles.error}>{fileError}</p>}
    </div>
  );
};
