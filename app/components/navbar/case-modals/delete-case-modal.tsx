import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import sharedStyles from './case-modal-shared.module.css';
import styles from './delete-case-modal.module.css';

interface DeleteCaseModalProps {
  isOpen: boolean;
  currentCase: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export const DeleteCaseModal = ({
  isOpen,
  currentCase,
  isSubmitting = false,
  onClose,
  onSubmit,
}: DeleteCaseModalProps) => {
  const isCloseBlocked = isSubmitting;

  const {
    requestClose,
    overlayProps,
    getCloseButtonProps,
  } = useOverlayDismiss({
    isOpen,
    onClose,
    canDismiss: !isCloseBlocked,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={sharedStyles.overlay}
      aria-label="Close delete case dialog"
      {...overlayProps}
    >
      <div className={`${sharedStyles.modal} ${styles.modal}`} role="dialog" aria-modal="true" aria-label="Delete Case">
        <button {...getCloseButtonProps({ ariaLabel: 'Close delete case dialog' })}>
          ×
        </button>

        <h3 className={sharedStyles.title}>Delete Case</h3>
        <p className={sharedStyles.subtitle}>Case: {currentCase}</p>

        <div className={sharedStyles.warningPanel}>
          <p>This action permanently deletes the case and all associated files.</p>
          <p>This operation cannot be undone.</p>
          <p>Any image assets that are already missing will be skipped automatically.</p>
        </div>

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
              void onSubmit();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
