import { useMemo } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { type FileData } from '~/types';
import sharedStyles from '~/components/navbar/case-modals/case-modal-shared.module.css';
import styles from './delete-files-modal.module.css';

interface DeleteFilesModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  files: FileData[];
  selectedFileIds: Set<string>;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export const DeleteFilesModal = ({
  isOpen,
  isSubmitting = false,
  files,
  selectedFileIds,
  onClose,
  onSubmit,
}: DeleteFilesModalProps) => {
  const selectedFiles = useMemo(
    () => files.filter((file) => selectedFileIds.has(file.id)),
    [files, selectedFileIds]
  );

  const previewFiles = selectedFiles.slice(0, 5);
  const remainingCount = Math.max(0, selectedFiles.length - previewFiles.length);

  const {
    requestClose,
    overlayProps,
    getCloseButtonProps,
  } = useOverlayDismiss({
    isOpen,
    onClose,
    canDismiss: !isSubmitting,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className={sharedStyles.overlay} aria-label="Close delete files dialog" {...overlayProps}>
      <div className={`${sharedStyles.modal} ${styles.modal}`} role="dialog" aria-modal="true" aria-label="Delete Selected Files">
        <button {...getCloseButtonProps({ ariaLabel: 'Close delete files dialog' })}>×</button>

        <h3 className={sharedStyles.title}>Delete Selected Files</h3>
        <p className={sharedStyles.subtitle}>
          {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
        </p>

        <div className={sharedStyles.warningPanel}>
          <p>This action permanently deletes the selected files and their annotation data.</p>
          <p>This operation cannot be undone.</p>
          {previewFiles.length > 0 && (
            <ul className={styles.filePreviewList}>
              {previewFiles.map((file) => (
                <li key={file.id}>{file.originalFilename}</li>
              ))}
            </ul>
          )}
          {remainingCount > 0 && (
            <p className={styles.remainingNote}>and {remainingCount} more...</p>
          )}
        </div>

        <div className={sharedStyles.actions}>
          <button
            type="button"
            className={sharedStyles.cancelButton}
            onClick={requestClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${sharedStyles.confirmButton} ${styles.confirmButton}`}
            onClick={() => {
              void onSubmit();
            }}
            disabled={isSubmitting || selectedFiles.length === 0}
          >
            {isSubmitting ? 'Deleting...' : `Delete ${selectedFiles.length} File${selectedFiles.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
};
