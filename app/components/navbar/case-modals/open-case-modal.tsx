import { useEffect, useRef, useState } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import styles from './open-case-modal.module.css';

interface OpenCaseModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  title?: string;
  helperText?: string;
  onClose: () => void;
  onSubmit: (caseNumber: string) => Promise<void>;
}

export const OpenCaseModal = ({
  isOpen,
  isSubmitting = false,
  title = 'Open Case',
  helperText,
  onClose,
  onSubmit,
}: OpenCaseModalProps) => {
  const [caseNumber, setCaseNumber] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCloseBlocked = isSubmitting;

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

  const handleClose = () => {
    if (isCloseBlocked) {
      return;
    }

    setCaseNumber('');
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

  const handleSubmit = async () => {
    const trimmedCaseNumber = caseNumber.trim();
    if (!trimmedCaseNumber || isSubmitting) {
      return;
    }

    await onSubmit(trimmedCaseNumber);
    setCaseNumber('');
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      aria-label="Close open case dialog"
      {...overlayProps}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Open Case">
        <button {...getCloseButtonProps({ ariaLabel: 'Close open case dialog' })}>
          ×
        </button>
        <h3 className={styles.title}>{title}</h3>
        {helperText ? <p className={styles.helperText}>{helperText}</p> : null}
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={caseNumber}
          onChange={(event) => setCaseNumber(event.target.value)}
          placeholder="Case #"
          disabled={isSubmitting}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleSubmit();
            }
          }}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={requestClose}
            disabled={isCloseBlocked}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting || !caseNumber.trim()}
          >
            {isSubmitting ? 'Opening...' : 'Load/Create Case'}
          </button>
        </div>
      </div>
    </div>
  );
};
