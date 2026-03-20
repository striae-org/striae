import type { User } from 'firebase/auth';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { NotesSidebar } from './notes-sidebar';
import styles from './notes-editor-modal.module.css';

interface NotesEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: string;
  user: User;
  imageId: string;
  originalFileName?: string;
  onAnnotationRefresh?: () => void;
  isUploading?: boolean;
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
}: NotesEditorModalProps) => {
  const {
    requestClose,
    overlayProps,
    getCloseButtonProps,
  } = useOverlayDismiss({
    isOpen,
    onClose,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} aria-label="Close image notes dialog" {...overlayProps}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Image Notes">
        <div className={styles.header}>
          <h2 className={styles.title}>Image Notes</h2>
          <button className={styles.closeButton} {...getCloseButtonProps({ ariaLabel: 'Close image notes dialog' })}>
            ×
          </button>
        </div>
        <div className={styles.content}>
          <NotesSidebar
            currentCase={currentCase}
            onReturn={requestClose}
            user={user}
            imageId={imageId}
            onAnnotationRefresh={onAnnotationRefresh}
            originalFileName={originalFileName}
            isUploading={isUploading}
            showReturnButton={false}
            stickyActionBar={true}
            compactLayout={true}
          />
        </div>
      </div>
    </div>
  );
};
