import type React from 'react';
import { use, useMemo, useRef, useState } from 'react';
import { AuthContext } from '~/contexts/auth.context';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { deleteOtherFile, getOtherFileUrl, uploadOtherFile } from '~/components/actions/other-files-manage';
import { type OtherFileData } from '~/types';
import styles from './other-files-modal.module.css';

interface OtherFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: string | null;
  otherFiles: OtherFileData[];
  setOtherFiles: React.Dispatch<React.SetStateAction<OtherFileData[]>>;
  isReadOnly?: boolean;
  isReviewOnlyCase?: boolean;
}

const MAX_OTHER_FILE_SIZE = 100 * 1024 * 1024;
const OTHER_FILES_PER_PAGE = 10;
const UNKNOWN_FILE_TYPE = '__unknown__';

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 'Unknown';
  }

  return new Date(parsed).toLocaleString();
}

function formatBytes(value?: number): string {
  if (!value || value <= 0) {
    return 'Unknown size';
  }

  const mb = value / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }

  return `${mb.toFixed(2)} MB`;
}

function getLocalDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return UNKNOWN_FILE_TYPE;
  }
  return filename.substring(lastDot).toLowerCase();
}

function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.setAttribute('rel', 'noopener noreferrer');
  link.click();
}

export const OtherFilesModal = ({
  isOpen,
  onClose,
  currentCase,
  otherFiles,
  setOtherFiles,
  isReadOnly = false,
  isReviewOnlyCase = false,
}: OtherFilesModalProps) => {
  const { user } = use(AuthContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [uploadQueueCount, setUploadQueueCount] = useState(0);
  const [currentUploadName, setCurrentUploadName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() => new Set());
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [fileNameFilter, setFileNameFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [uploadedDateFilter, setUploadedDateFilter] = useState('');

  const {
    overlayProps,
    getCloseButtonProps,
    requestClose,
  } = useOverlayDismiss({
    isOpen,
    onClose,
    canDismiss: !isUploading && !isDownloadingSelected && !isDeletingSelected,
  });

  const selectedFiles = useMemo(
    () => otherFiles.filter((file) => selectedFileIds.has(file.id)),
    [otherFiles, selectedFileIds]
  );
  const availableFileTypes = useMemo(
    () => Array.from(new Set(otherFiles.map((file) => getFileExtension(file.originalFilename)))).sort(),
    [otherFiles]
  );
  const filteredFiles = useMemo(() => {
    const normalizedName = fileNameFilter.trim().toLowerCase();

    return otherFiles.filter((file) => {
      const fileExtension = getFileExtension(file.originalFilename);

      return (
        (!normalizedName || file.originalFilename.toLowerCase().includes(normalizedName)) &&
        (!fileTypeFilter || fileExtension === fileTypeFilter) &&
        (!uploadedDateFilter || getLocalDateKey(file.uploadedAt) === uploadedDateFilter)
      );
    });
  }, [fileNameFilter, fileTypeFilter, otherFiles, uploadedDateFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / OTHER_FILES_PER_PAGE));
  const effectiveCurrentPage = Math.min(currentPage, totalPages - 1);
  const paginatedFiles = filteredFiles.slice(
    effectiveCurrentPage * OTHER_FILES_PER_PAGE,
    (effectiveCurrentPage + 1) * OTHER_FILES_PER_PAGE
  );

  const canWrite = !isReadOnly && !isReviewOnlyCase;

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds((previous) => {
      const next = new Set(previous);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFileIds(new Set(paginatedFiles.map((file) => file.id)));
  };

  const clearSelected = () => {
    setSelectedFileIds(new Set());
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_OTHER_FILE_SIZE) {
      return `${file.name}: file size exceeds 100 MB limit`;
    }

    return null;
  };

  const handleUploadFiles = async (files: File[], uploadMethod: 'drag-drop' | 'file-picker') => {
    if (!user || !currentCase || files.length === 0 || !canWrite) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentUploadIndex(0);
    setUploadQueueCount(files.length);
    setCurrentUploadName('');
    setErrorMessage('');
    setStatusMessage('Uploading files...');

    const uploaded: OtherFileData[] = [];
    const failed: string[] = [];

    for (const [index, file] of files.entries()) {
      setCurrentUploadIndex(index);
      setCurrentUploadName(file.name);
      setUploadProgress(0);

      const validationMessage = validateFile(file);
      if (validationMessage) {
        failed.push(validationMessage);
        continue;
      }

      try {
        const nextFile = await uploadOtherFile(user, currentCase, file, uploadMethod, (progress) => {
          setUploadProgress(progress);
        });
        uploaded.push(nextFile);
      } catch (error) {
        failed.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
      }
    }

    if (uploaded.length > 0) {
      setOtherFiles((previous) => [...previous, ...uploaded]);
      setStatusMessage(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? '' : 's'}.`);
    } else {
      setStatusMessage('');
    }

    if (failed.length > 0) {
      setErrorMessage(failed.join(' | '));
    }

    setIsUploading(false);
    setUploadProgress(0);
    setCurrentUploadIndex(0);
    setUploadQueueCount(0);
    setCurrentUploadName('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    await handleUploadFiles(Array.from(files), 'file-picker');
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (!canWrite) {
      return;
    }

    const droppedFiles = event.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) {
      return;
    }

    await handleUploadFiles(Array.from(droppedFiles), 'drag-drop');
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canWrite) {
      return;
    }

    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const relatedTarget = event.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !dropZoneRef.current?.contains(relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canWrite) {
      return;
    }

    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDownloadOne = async (file: OtherFileData) => {
    if (!user || !currentCase) {
      return;
    }

    setErrorMessage('');
    try {
      const access = await getOtherFileUrl(user, file, currentCase, 'Single associated file download');
      triggerDownload(access.url, file.originalFilename);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Download failed');
    }
  };

  const handleDownloadSelected = async () => {
    if (!user || !currentCase || selectedFiles.length === 0) {
      return;
    }

    setIsDownloadingSelected(true);
    setErrorMessage('');

    const failures: string[] = [];

    for (const file of selectedFiles) {
      try {
        const access = await getOtherFileUrl(user, file, currentCase, 'Batch associated file download');
        triggerDownload(access.url, file.originalFilename);
      } catch (error) {
        failures.push(`${file.originalFilename}: ${error instanceof Error ? error.message : 'Download failed'}`);
      }
    }

    if (failures.length > 0) {
      setErrorMessage(failures.join(' | '));
    }

    setIsDownloadingSelected(false);
  };

  const handleDeleteOne = async (file: OtherFileData) => {
    if (!user || !currentCase || !canWrite) {
      return;
    }

    if (!window.confirm(`Delete associated file "${file.originalFilename}"? This action cannot be undone.`)) {
      return;
    }

    setErrorMessage('');

    try {
      await deleteOtherFile(user, currentCase, file.id);
      setOtherFiles((previous) => previous.filter((entry) => entry.id !== file.id));
      setSelectedFileIds((previous) => {
        const next = new Set(previous);
        next.delete(file.id);
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Delete failed');
    }
  };

  const handleDeleteSelected = async () => {
    if (!user || !currentCase || !canWrite || selectedFiles.length === 0) {
      return;
    }

    if (!window.confirm(`Delete ${selectedFiles.length} selected associated files? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingSelected(true);
    setErrorMessage('');

    const deletedIds = new Set<string>();
    const failures: string[] = [];

    for (const file of selectedFiles) {
      try {
        await deleteOtherFile(user, currentCase, file.id);
        deletedIds.add(file.id);
      } catch (error) {
        failures.push(`${file.originalFilename}: ${error instanceof Error ? error.message : 'Delete failed'}`);
      }
    }

    if (deletedIds.size > 0) {
      setOtherFiles((previous) => previous.filter((entry) => !deletedIds.has(entry.id)));
      setSelectedFileIds((previous) => {
        const next = new Set(previous);
        for (const fileId of deletedIds) {
          next.delete(fileId);
        }
        return next;
      });
    }

    if (failures.length > 0) {
      setErrorMessage(failures.join(' | '));
    }

    setIsDeletingSelected(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} aria-label="Close associated files dialog" {...overlayProps}>
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <h2>Associated File Management {currentCase ? `- ${currentCase}` : ''}</h2>
          <button className={styles.closeButton} {...getCloseButtonProps({ ariaLabel: 'Close associated files dialog' })}>
            ×
          </button>
        </header>

        <div className={styles.modalContent}>
          {(isReadOnly || isReviewOnlyCase) && (
            <p className={styles.readOnlyNotice}>
              This case is read-only. Upload and deletion are disabled. Download is still allowed.
            </p>
          )}

          <div
            ref={dropZoneRef}
            className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaDragging : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(event) => {
              void handleDrop(event);
            }}
          >
            <p className={styles.uploadHint}>
              {isDragging ? 'Drop files here to upload them to this case' : 'Drag and drop non-image files here (100 MB limit per file)'}
            </p>
            <div className={styles.uploadActions}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(event) => {
                  void handleFileInputChange(event);
                }}
                disabled={!canWrite || isUploading}
                aria-label="Upload associated files"
              />
              {isUploading && <span className={styles.statusText}>Uploading...</span>}
              {statusMessage && !isUploading && <span className={styles.statusText}>{statusMessage}</span>}
            </div>
            {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
          </div>

          {isUploading && (
            <div className={styles.uploadProgressSection}>
              <div
                className={styles.progressBar}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress}
                aria-label="Associated file upload progress"
              >
                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className={styles.uploadStatusContainer}>
                <span className={styles.uploadingText}>
                  {uploadProgress === 100 ? 'Processing...' : `${uploadProgress}%`}
                </span>
                {uploadQueueCount > 1 && (
                  <span className={styles.fileCountText}>
                    {currentUploadIndex + 1} of {uploadQueueCount}
                  </span>
                )}
              </div>
              {currentUploadName && (
                <p className={styles.currentFileName} title={currentUploadName}>
                  Uploading: {currentUploadName}
                </p>
              )}
            </div>
          )}

          <div className={styles.controls}>
            <p className={styles.countText}>{filteredFiles.length} shown of {otherFiles.length} associated file{otherFiles.length === 1 ? '' : 's'}</p>
            <div className={styles.bulkSelectionActions}>
              <button type="button" className={styles.secondaryButton} onClick={selectAll} disabled={paginatedFiles.length === 0}>Select All Visible</button>
              <button type="button" className={styles.secondaryButton} onClick={clearSelected} disabled={selectedFileIds.size === 0}>Clear</button>
            </div>
          </div>

          {otherFiles.length > 0 && (
            <section className={styles.filterControls} aria-label="Associated file filters">
              <label className={styles.filterField} htmlFor="associated-files-name-filter">
                File Name
                <input
                  id="associated-files-name-filter"
                  type="search"
                  value={fileNameFilter}
                  onChange={(event) => {
                    setFileNameFilter(event.target.value);
                    setCurrentPage(0);
                  }}
                  placeholder="Filter by file name"
                />
              </label>
              <label className={styles.filterField} htmlFor="associated-files-type-filter">
                File Type
                <select
                  id="associated-files-type-filter"
                  value={fileTypeFilter}
                  onChange={(event) => {
                    setFileTypeFilter(event.target.value);
                    setCurrentPage(0);
                  }}
                >
                  <option value="">All types</option>
                  {availableFileTypes.map((fileType) => (
                    <option key={fileType} value={fileType}>
                      {fileType === UNKNOWN_FILE_TYPE ? 'Unknown' : fileType}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.filterField} htmlFor="associated-files-date-filter">
                Date Uploaded
                <input
                  id="associated-files-date-filter"
                  type="date"
                  value={uploadedDateFilter}
                  onChange={(event) => {
                    setUploadedDateFilter(event.target.value);
                    setCurrentPage(0);
                  }}
                />
              </label>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setFileNameFilter('');
                  setFileTypeFilter('');
                  setUploadedDateFilter('');
                  setCurrentPage(0);
                }}
                disabled={!fileNameFilter && !fileTypeFilter && !uploadedDateFilter}
              >
                Reset Filters
              </button>
            </section>
          )}

          {otherFiles.length === 0 ? (
            <p className={styles.emptyState}>No associated files found for this case.</p>
          ) : filteredFiles.length === 0 ? (
            <p className={styles.emptyState}>No associated files match the selected filters.</p>
          ) : (
            <>
              <ul className={styles.filesList}>
                {paginatedFiles.map((file) => {
                const checked = selectedFileIds.has(file.id);

                return (
                  <li key={file.id} className={styles.fileItem}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFileSelection(file.id)}
                      aria-label={`Select ${file.originalFilename}`}
                    />

                    <div className={styles.fileMeta}>
                      <p className={styles.fileName} title={file.originalFilename}>{file.originalFilename}</p>
                      <p className={styles.fileDetails}>
                        Uploaded: {formatDate(file.uploadedAt)} | Size: {formatBytes(file.byteLength)}
                      </p>
                    </div>

                    <div className={styles.fileActions}>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => {
                          void handleDownloadOne(file);
                        }}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className={`${styles.secondaryButton} ${styles.deleteButton}`}
                        onClick={() => {
                          void handleDeleteOne(file);
                        }}
                        disabled={!canWrite}
                        title={!canWrite ? 'Read-only cases allow download only' : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
                })}
              </ul>
              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Associated files pagination">
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setCurrentPage(Math.max(0, effectiveCurrentPage - 1))}
                    disabled={effectiveCurrentPage === 0}
                  >
                    Previous
                  </button>
                  <span aria-live="polite">
                    Page {effectiveCurrentPage + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, effectiveCurrentPage + 1))}
                    disabled={effectiveCurrentPage === totalPages - 1}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>

        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              void handleDownloadSelected();
            }}
            disabled={selectedFiles.length === 0 || isDownloadingSelected}
          >
            Download Selected ({selectedFiles.length})
          </button>

          <div className={styles.footerButtonGroup}>
            <button
              type="button"
              className={`${styles.secondaryButton} ${styles.deleteButton}`}
              onClick={() => {
                void handleDeleteSelected();
              }}
              disabled={selectedFiles.length === 0 || isDeletingSelected || !canWrite}
              title={!canWrite ? 'Read-only cases allow download only' : undefined}
            >
              Delete Selected ({selectedFiles.length})
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={requestClose}
              disabled={isUploading || isDeletingSelected || isDownloadingSelected}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
