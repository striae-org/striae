import { useEffect, useRef, useState } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import sharedStyles from './case-modal-shared.module.css';
import styles from './archive-case-modal.module.css';

interface ArchiveCaseModalProps {
  isOpen: boolean;
  currentCase: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (archiveReason: string) => Promise<void>;
}

export const ArchiveCaseModal = ({
  isOpen,
  currentCase,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ArchiveCaseModalProps) => {
  const [archiveReason, setArchiveReason] = useState('');
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const isCloseBlocked = isSubmitting;

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setArchiveReason('');
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
      reasonRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusId);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async () => {
    await onSubmit(archiveReason.trim());
    setArchiveReason('');
  };

  return (
    <div
      className={sharedStyles.overlay}
      aria-label="Close archive case dialog"
      {...overlayProps}
    >
      <div className={`${sharedStyles.modal} ${styles.modal}`} role="dialog" aria-modal="true" aria-label="Archive Case">
        <button {...getCloseButtonProps({ ariaLabel: 'Close archive case dialog' })}>
          ×
        </button>
        <h3 className={sharedStyles.title}>Archive Case</h3>
        <p className={sharedStyles.subtitle}>Case: {currentCase}</p>

        <div className={sharedStyles.warningPanel}>
          <p>
            Archiving a case permanently renders it read-only.
          </p>
          <p>
            The archive will be in JSON format and include all images.
          </p>
          <p>
            The full audit trail is packaged with Striae&apos;s current public key and forensic signatures.
          </p>
          <p>
            You can import the archived package back into Striae for future review.
          </p>
        </div>

        <label htmlFor="archiveReason" className={styles.reasonLabel}>Archive reason (recommended)</label>
        <textarea
          id="archiveReason"
          ref={reasonRef}
          value={archiveReason}
          onChange={(event) => setArchiveReason(event.target.value)}
          className={styles.reasonInput}
          placeholder="Optional chain-of-custody note"
          disabled={isSubmitting}
          rows={3}
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
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Archiving...' : 'Confirm Archive'}
          </button>
        </div>
      </div>
    </div>
  );
};
