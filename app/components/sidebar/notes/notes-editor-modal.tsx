import type { User } from 'firebase/auth';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { NotesEditorForm } from './notes-editor-form';
import styles from './notes.module.css';

interface NotesEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: string;
  user: User;
  imageId: string;
  originalFileName?: string;
  onAnnotationRefresh?: () => void;
  isUploading?: boolean;
  isReadOnly?: boolean;
  showNotification?: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const NotesEditorModal = ({
  isOpen,
  onClose,
  currentCase,
  user,
  imageId,
  originalFileName,
  onAnnotationRefresh,
  isUploading = false,
  isReadOnly = false,
  showNotification,
}: NotesEditorModalProps) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCloseAlertOpen, setIsCloseAlertOpen] = useState(false);
  const [isSavingBeforeClose, setIsSavingBeforeClose] = useState(false);
  const [saveHandler, setSaveHandler] = useState<(() => Promise<boolean>) | null>(null);
  const closeAlertRef = useRef<HTMLDivElement | null>(null);
  const saveAndCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeAlertTitleId = useId();
  const closeAlertDescriptionId = useId();

  const handleCloseAttempt = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsCloseAlertOpen(true);
      return;
    }

    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    setHasUnsavedChanges((previous) => (previous === isDirty ? previous : isDirty));
  }, []);

  const handleRegisterSaveHandler = useCallback((handler: (() => Promise<boolean>) | null) => {
    setSaveHandler((previous) => (previous === handler ? previous : handler));
  }, []);

  const {
    overlayProps,
    getCloseButtonProps,
  } = useOverlayDismiss({
    isOpen,
    onClose: handleCloseAttempt,
    closeOnEscape: !isCloseAlertOpen,
  });

  const handleDiscardAndClose = () => {
    setHasUnsavedChanges(false);
    setIsCloseAlertOpen(false);
    onClose();
  };

  const handleCancelClose = () => {
    setIsCloseAlertOpen(false);
  };

  const canSaveBeforeClose = !!saveHandler && !isSavingBeforeClose;

  const handleSaveBeforeClose = async () => {
    if (!saveHandler) {
      showNotification?.('Save is not ready yet. Please wait a moment and try again.', 'warning');
      return;
    }

    setIsSavingBeforeClose(true);
    let didSave: boolean;

    try {
      didSave = await saveHandler();
    } catch (error) {
      console.error('Failed to save notes before closing:', error);
      showNotification?.('Failed to save notes. Please try again.', 'error');
      didSave = false;
    } finally {
      setIsSavingBeforeClose(false);
    }

    if (!didSave) {
      return;
    }

    setHasUnsavedChanges(false);
    setIsCloseAlertOpen(false);
    onClose();
  };

  useEffect(() => {
    if (!isCloseAlertOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    saveAndCloseButtonRef.current?.focus();

    const handleAlertKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsCloseAlertOpen(false);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusContainer = closeAlertRef.current;
      if (!focusContainer) {
        return;
      }

      const focusableElements = Array.from(
        focusContainer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleAlertKeyDown);

    return () => {
      document.removeEventListener('keydown', handleAlertKeyDown);
      previouslyFocused?.focus();
    };
  }, [isCloseAlertOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} aria-label="Close image notes dialog" {...overlayProps}>
      <div
        className={styles.editorModal}
        role="dialog"
        aria-modal={isCloseAlertOpen ? undefined : true}
        aria-label="Image Notes"
        aria-hidden={isCloseAlertOpen}
        inert={isCloseAlertOpen}
      >
        <div className={styles.editorModalHeader}>
          <h2 className={styles.editorModalTitle}>Image Notes</h2>
          <button className={styles.editorModalCloseButton} {...getCloseButtonProps({ ariaLabel: 'Close image notes dialog' })}>
            ×
          </button>
        </div>
        <div className={styles.editorModalContent}>
          <NotesEditorForm
            currentCase={currentCase}
            user={user}
            imageId={imageId}
            onAnnotationRefresh={onAnnotationRefresh}
            originalFileName={originalFileName}
            isUploading={isUploading}
            isReadOnly={isReadOnly}
            showNotification={showNotification}
            onDirtyChange={handleDirtyChange}
            onRegisterSaveHandler={handleRegisterSaveHandler}
          />
        </div>
      </div>
      {isCloseAlertOpen && (
        <div className={styles.modalOverlay}>
          <div
            className={`${styles.modal} ${styles.unsavedChangesModal}`}
            ref={closeAlertRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={closeAlertTitleId}
            aria-describedby={closeAlertDescriptionId}
          >
            <h3 id={closeAlertTitleId} className={styles.modalTitle}>You have unsaved notes!</h3>
            <p id={closeAlertDescriptionId} className={styles.unsavedChangesMessage}>
              You have unsaved changes to notes and data. Save before closing?
            </p>
            <div className={styles.unsavedChangesActions}>
              <div className={styles.unsavedChangesPrimaryRow}>
                <button
                  ref={saveAndCloseButtonRef}
                  type="button"
                  onClick={handleSaveBeforeClose}
                  className={`${styles.saveButton} ${styles.unsavedChangesPrimaryAction}`}
                  disabled={!canSaveBeforeClose}
                >
                  {isSavingBeforeClose ? 'Saving...' : 'Save and Close'}
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndClose}
                  className={`${styles.cancelButton} ${styles.unsavedChangesPrimaryAction}`}
                  disabled={isSavingBeforeClose}
                >
                  Close Without Saving
                </button>
              </div>
              <button
                type="button"
                onClick={handleCancelClose}
                className={styles.secondaryButton}
                disabled={isSavingBeforeClose}
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
