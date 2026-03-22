import { useEffect, useRef, useState } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import sharedStyles from './case-modal-shared.module.css';
import styles from './rename-case-modal.module.css';

interface RenameCaseModalProps {
  isOpen: boolean;
  currentCase: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (newCaseName: string) => Promise<void>;
}

export const RenameCaseModal = ({
  isOpen,
  currentCase,
  isSubmitting = false,
  onClose,
  onSubmit,
}: RenameCaseModalProps) => {
  const [newCaseName, setNewCaseName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCloseBlocked = isSubmitting;

  const handleClose = () => {
    setNewCaseName('');
    onClose();
  };

  const {
    requestClose,
    overlayProps,
    getCloseButtonProps,
  } = useOverlayDismiss({
    isOpen,
    onClose: handleClose,
    canDismiss: !isCloseBlocked,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusId);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    await onSubmit(newCaseName.trim());
    setNewCaseName('');
  };

  return (
    <div
      className={sharedStyles.overlay}
      aria-label="Close rename case dialog"
      {...overlayProps}
    >
      <div className={`${sharedStyles.modal} ${styles.modal}`} role="dialog" aria-modal="true" aria-label="Rename Case">
        <button {...getCloseButtonProps({ ariaLabel: 'Close rename case dialog' })}>
          ×
        </button>
        <h3 className={sharedStyles.title}>Rename Case</h3>
        <p className={sharedStyles.subtitle}>Current case: {currentCase}</p>
        <input
          ref={inputRef}
          type="text"
          value={newCaseName}
          onChange={(event) => setNewCaseName(event.target.value)}
          className={sharedStyles.input}
          placeholder="New case number"
          disabled={isSubmitting}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && newCaseName.trim() && !isSubmitting) {
              void handleSubmit();
            }
          }}
        />
        <div className={sharedStyles.actions}>
          <button
            type="button"
            className={sharedStyles.cancelButton}
            onClick={requestClose}
            disabled={isCloseBlocked}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${sharedStyles.confirmButton} ${styles.confirmButton}`}
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !newCaseName.trim()}
          >
            {isSubmitting ? 'Renaming...' : 'Rename Case'}
          </button>
        </div>
      </div>
    </div>
  );
};
