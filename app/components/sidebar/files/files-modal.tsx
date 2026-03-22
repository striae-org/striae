import type React from 'react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '~/contexts/auth.context';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import {
  useFileListPreferences,
  DEFAULT_FILES_MODAL_PREFERENCES,
} from '~/hooks/useFileListPreferences';
import {
  type FilesModalSortBy,
  type FilesModalConfirmationFilter,
  type FilesModalClassTypeFilter,
  getFilesForModal,
} from '~/utils/data/file-filters';
import { deleteFile } from '~/components/actions/image-manage';
import {
  ensureCaseConfirmationSummary,
  type FileConfirmationSummary,
} from '~/utils/data';
import { type FileData } from '~/types';
import { DeleteFilesModal } from './delete-files-modal';
import styles from './files-modal.module.css';

interface FilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect?: (file: FileData) => void;
  currentCase: string | null;
  files: FileData[];
  setFiles: React.Dispatch<React.SetStateAction<FileData[]>>;
  isReadOnly?: boolean;
  selectedFileId?: string;
  confirmationSaveVersion?: number;
}

interface ActionNotice {
  type: 'success' | 'warning' | 'error';
  message: string;
}

const FILES_PER_PAGE = 10;

const CLEAR_SELECTION_FILE: FileData = {
  id: 'clear',
  originalFilename: '/clear.jpg',
  uploadedAt: '',
};

const DEFAULT_CONFIRMATION_SUMMARY: FileConfirmationSummary = {
  includeConfirmation: false,
  isConfirmed: false,
  updatedAt: '',
};

function formatDate(dateString: string): string {
  const parsed = Date.parse(dateString);
  if (Number.isNaN(parsed)) {
    return 'Unknown';
  }

  return new Date(parsed).toLocaleDateString();
}

function getClassTypeLabel(classType?: FileConfirmationSummary['classType']): string {
  if (!classType) {
    return 'Unset';
  }

  return classType;
}

function getConfirmationLabel(summary: FileConfirmationSummary): string {
  if (!summary.includeConfirmation) {
    return 'None Requested';
  }

  return summary.isConfirmed ? 'Confirmed' : 'Pending';
}

export const FilesModal = ({
  isOpen,
  onClose,
  onFileSelect,
  currentCase,
  files,
  setFiles,
  isReadOnly = false,
  selectedFileId,
  confirmationSaveVersion = 0,
}: FilesModalProps) => {
  const { user } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSelectedFileId, setOpenSelectedFileId] = useState<string | null>(selectedFileId || null);
  const [deleteSelectedFileIds, setDeleteSelectedFileIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [fileConfirmationStatus, setFileConfirmationStatus] = useState<Record<string, FileConfirmationSummary>>({});

  useEffect(() => {
    if (!actionNotice) {
      return;
    }

    const timer = window.setTimeout(() => setActionNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);
  const {
    preferences,
    setSortBy,
    setConfirmationFilter,
    setClassTypeFilter,
    resetPreferences,
  } = useFileListPreferences();
  const {
    requestClose,
    overlayProps,
    getCloseButtonProps,
  } = useOverlayDismiss({
    isOpen,
    onClose,
  });

  const hasCustomPreferences =
    preferences.sortBy !== DEFAULT_FILES_MODAL_PREFERENCES.sortBy ||
    preferences.confirmationFilter !== DEFAULT_FILES_MODAL_PREFERENCES.confirmationFilter ||
    preferences.classTypeFilter !== DEFAULT_FILES_MODAL_PREFERENCES.classTypeFilter;

  const existingFileIdSet = useMemo(
    () => new Set(files.map((file) => file.id)),
    [files]
  );

  const effectiveDeleteSelectedFileIds = useMemo(
    () => new Set(Array.from(deleteSelectedFileIds).filter((fileId) => existingFileIdSet.has(fileId))),
    [deleteSelectedFileIds, existingFileIdSet]
  );

  const effectiveOpenSelectedFileId = useMemo(() => {
    if (openSelectedFileId && existingFileIdSet.has(openSelectedFileId)) {
      return openSelectedFileId;
    }

    if (selectedFileId && existingFileIdSet.has(selectedFileId)) {
      return selectedFileId;
    }

    return null;
  }, [openSelectedFileId, selectedFileId, existingFileIdSet]);

  const visibleFiles = useMemo(
    () => getFilesForModal(files, preferences, fileConfirmationStatus, searchQuery),
    [files, preferences, fileConfirmationStatus, searchQuery]
  );

  const totalPages = Math.max(1, Math.ceil(visibleFiles.length / FILES_PER_PAGE));
  const effectiveCurrentPage = Math.min(currentPage, totalPages - 1);

  const paginatedFiles = visibleFiles.slice(
    effectiveCurrentPage * FILES_PER_PAGE,
    (effectiveCurrentPage + 1) * FILES_PER_PAGE
  );

  useEffect(() => {
    let isCancelled = false;

    const fetchConfirmationStatuses = async () => {
      if (!isOpen || !currentCase || !user || files.length === 0) {
        if (!isCancelled) {
          setFileConfirmationStatus({});
        }
        return;
      }

      const caseSummary = await ensureCaseConfirmationSummary(user, currentCase, files).catch((err) => {
        console.error(`Error fetching confirmation summary for case ${currentCase}:`, err);
        return null;
      });

      if (!caseSummary || isCancelled) {
        return;
      }

      setFileConfirmationStatus(caseSummary.filesById);
    };

    void fetchConfirmationStatuses();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentCase, files, user, confirmationSaveVersion]);

  const toggleDeleteSelection = (fileId: string) => {
    setDeleteSelectedFileIds((previous) => {
      const next = new Set(previous);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const selectAllVisibleFiles = () => {
    setDeleteSelectedFileIds((previous) => {
      const next = new Set(previous);
      visibleFiles.forEach((file) => {
        next.add(file.id);
      });
      return next;
    });
  };

  const clearDeleteSelection = () => {
    setDeleteSelectedFileIds(new Set());
  };

  const handleOpenSelectedFile = () => {
    if (!openSelectedFileId) {
      return;
    }

    const targetFile = files.find((file) => file.id === openSelectedFileId);
    if (!targetFile) {
      setActionNotice({
        type: 'error',
        message: 'Selected file is no longer available.',
      });
      return;
    }

    onFileSelect?.(targetFile);
    requestClose();
  };

  const handleDeleteSelectedFiles = async () => {
    if (!user || !currentCase || isReadOnly || deleteSelectedFileIds.size === 0) {
      return;
    }

    setIsDeletingSelected(true);
    setActionNotice(null);

    const selectedIds = Array.from(deleteSelectedFileIds);
    const failedFiles: string[] = [];
    const deletedIds: string[] = [];
    let missingImages = 0;

    for (const fileId of selectedIds) {
      try {
        const result = await deleteFile(user, currentCase, fileId);
        deletedIds.push(fileId);
        if (result.imageMissing) {
          missingImages += 1;
        }
      } catch {
        const failedFile = files.find((file) => file.id === fileId);
        failedFiles.push(failedFile?.originalFilename || fileId);
      }
    }

    const updatedFiles = files.filter((file) => !deletedIds.includes(file.id));
    setFiles(updatedFiles);

    setFileConfirmationStatus((previous) => {
      const next = { ...previous };
      deletedIds.forEach((fileId) => {
        delete next[fileId];
      });
      return next;
    });

    setDeleteSelectedFileIds(new Set());
    setIsDeleteModalOpen(false);

    if (selectedFileId && deletedIds.includes(selectedFileId)) {
      onFileSelect?.(CLEAR_SELECTION_FILE);
    }

    if (effectiveOpenSelectedFileId && deletedIds.includes(effectiveOpenSelectedFileId)) {
      setOpenSelectedFileId(null);
    }

    if (failedFiles.length > 0) {
      setActionNotice({
        type: 'warning',
        message: `Deleted ${deletedIds.length} file(s). Failed: ${failedFiles.join(', ')}`,
      });
    } else if (missingImages > 0) {
      setActionNotice({
        type: 'warning',
        message: `Deleted ${deletedIds.length} file(s). ${missingImages} image asset(s) were missing and skipped.`,
      });
    } else {
      setActionNotice({
        type: 'success',
        message: `Deleted ${deletedIds.length} file(s) successfully.`,
      });
    }

    setIsDeletingSelected(false);
  };

  const canDeleteSelected = !isReadOnly && effectiveDeleteSelectedFileIds.size > 0 && !isDeletingSelected;

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} aria-label="Close files dialog" {...overlayProps}>
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <h2>File Management {currentCase ? `- ${currentCase}` : ''}</h2>
          <button className={styles.closeButton} {...getCloseButtonProps({ ariaLabel: 'Close files dialog' })}>
            ×
          </button>
        </header>

        <div className={styles.modalContent}>
          {files.length === 0 ? (
            <p className={styles.emptyState}>No files found in this case</p>
          ) : (
            <>
              <section className={styles.controlsSection} aria-label="File list controls">
                <div className={styles.controlGroup}>
                  <label htmlFor="files-sort">Sort</label>
                  <select
                    id="files-sort"
                    value={preferences.sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value as FilesModalSortBy);
                      setCurrentPage(0);
                    }}
                  >
                    <option value="recent">Date Uploaded</option>
                    <option value="filename">File Name</option>
                    <option value="confirmation">Confirmation Status</option>
                    <option value="classType">Class Type</option>
                  </select>
                </div>

                <div className={styles.controlGroup}>
                  <label htmlFor="files-confirmation-filter">Confirmation Status</label>
                  <select
                    id="files-confirmation-filter"
                    value={preferences.confirmationFilter}
                    onChange={(event) => {
                      setConfirmationFilter(event.target.value as FilesModalConfirmationFilter);
                      setCurrentPage(0);
                    }}
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="none-requested">None Requested</option>
                  </select>
                </div>

                <div className={styles.controlGroup}>
                  <label htmlFor="files-class-filter">Class Type</label>
                  <select
                    id="files-class-filter"
                    value={preferences.classTypeFilter}
                    onChange={(event) => {
                      setClassTypeFilter(event.target.value as FilesModalClassTypeFilter);
                      setCurrentPage(0);
                    }}
                  >
                    <option value="all">All</option>
                    <option value="Bullet">Bullet</option>
                    <option value="Cartridge Case">Cartridge Case</option>
                    <option value="Shotshell">Shotshell</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <button
                  type="button"
                  className={styles.resetButton}
                  onClick={() => {
                    setSearchQuery('');
                    resetPreferences();
                    setCurrentPage(0);
                  }}
                  disabled={!hasCustomPreferences && searchQuery.trim().length === 0}
                >
                  Reset
                </button>
              </section>

              <div className={styles.searchSection}>
                <label htmlFor="file-search">Search file name</label>
                <input
                  id="file-search"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(0);
                  }}
                  placeholder="Type to filter files"
                  className={styles.searchInput}
                />
              </div>

              <p className={styles.fileCount}>
                {visibleFiles.length} shown of {files.length} total files
              </p>

              {actionNotice && (
                <p
                  className={`${styles.actionNotice} ${
                    actionNotice.type === 'error'
                      ? styles.actionNoticeError
                      : actionNotice.type === 'warning'
                        ? styles.actionNoticeWarning
                        : styles.actionNoticeSuccess
                  }`}
                >
                  {actionNotice.message}
                </p>
              )}

              {visibleFiles.length === 0 ? (
                <p className={styles.emptyState}>No files match your filters</p>
              ) : (
                <ul className={styles.filesList}>
                  {paginatedFiles.map((file) => {
                    const summary = fileConfirmationStatus[file.id] || DEFAULT_CONFIRMATION_SUMMARY;
                    const isOpenSelected = effectiveOpenSelectedFileId === file.id;
                    const isDeleteSelected = effectiveDeleteSelectedFileIds.has(file.id);
                    const confirmationLabel = getConfirmationLabel(summary);
                    const classTypeLabel = getClassTypeLabel(summary.classType);

                    let confirmationClass = '';
                    if (summary.includeConfirmation) {
                      confirmationClass = summary.isConfirmed
                        ? styles.fileItemConfirmed
                        : styles.fileItemNotConfirmed;
                    }

                    return (
                      <li key={file.id}>
                        <div
                          className={`${styles.fileItem} ${isOpenSelected ? styles.active : ''}`}
                          onClick={() => setOpenSelectedFileId(file.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setOpenSelectedFileId(file.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <input
                            type="checkbox"
                            checked={isDeleteSelected}
                            className={styles.deleteSelector}
                            onChange={() => toggleDeleteSelection(file.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${file.originalFilename} for delete`}
                          />

                          <div className={styles.fileInfo}>
                            <div className={styles.fileName} title={file.originalFilename}>
                              {file.originalFilename}
                            </div>
                            <div className={styles.fileMetaRow}>
                              <span className={styles.fileDate}>Uploaded: {formatDate(file.uploadedAt)}</span>
                              <span className={styles.classTypeBadge}>Class: {classTypeLabel}</span>
                            </div>
                          </div>

                          <span
                            className={`${styles.confirmationBadge} ${confirmationClass}`}
                            aria-label={`Confirmation status: ${confirmationLabel}`}
                          >
                            {confirmationLabel}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        <div className={styles.footerActions}>
          <div className={styles.maintenanceActions}>
            <button
              type="button"
              className={styles.secondaryActionButton}
              onClick={selectAllVisibleFiles}
              disabled={isReadOnly || visibleFiles.length === 0 || isDeletingSelected}
            >
              Select Visible
            </button>
            <button
              type="button"
              className={styles.secondaryActionButton}
              onClick={clearDeleteSelection}
              disabled={effectiveDeleteSelectedFileIds.size === 0 || isDeletingSelected}
            >
              Clear Selected
            </button>
            <button
              type="button"
              className={`${styles.secondaryActionButton} ${styles.deleteActionButton}`}
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={!canDeleteSelected}
            >
              Delete Selected ({effectiveDeleteSelectedFileIds.size})
            </button>
          </div>

          <button
            type="button"
            className={styles.openSelectedButton}
            onClick={handleOpenSelectedFile}
            disabled={!effectiveOpenSelectedFileId || isDeletingSelected}
          >
            Open Selected File
          </button>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setCurrentPage((previous) => Math.max(0, previous - 1))}
                disabled={effectiveCurrentPage === 0}
              >
                Previous
              </button>
              <span>
                {effectiveCurrentPage + 1} of {totalPages} ({visibleFiles.length} filtered files)
              </span>
              <button
                onClick={() => setCurrentPage((previous) => Math.min(totalPages - 1, previous + 1))}
                disabled={effectiveCurrentPage === totalPages - 1}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <DeleteFilesModal
        isOpen={isDeleteModalOpen}
        isSubmitting={isDeletingSelected}
        files={files}
        selectedFileIds={effectiveDeleteSelectedFileIds}
        onClose={() => setIsDeleteModalOpen(false)}
        onSubmit={handleDeleteSelectedFiles}
      />
    </div>
  );
};
