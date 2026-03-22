import { useState } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import styles from './notes.module.css';

interface AddlNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
  onSave: (notes: string) => void;
  showNotification?: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const AddlNotesModal = ({ isOpen, onClose, notes, onSave, showNotification }: AddlNotesModalProps) => {
  const [tempNotes, setTempNotes] = useState(notes);
  const [isSaving, setIsSaving] = useState(false);
  const {
    requestClose,
    overlayProps,
    getCloseButtonProps
  } = useOverlayDismiss({
    isOpen,
    onClose
  });

  if (!isOpen) return null;  

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.resolve(onSave(tempNotes));
      showNotification?.('Notes saved successfully.', 'success');
      requestClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save notes.';
      showNotification?.(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      aria-label="Close notes dialog"
      {...overlayProps}
    >
      <div className={styles.modal}>
        <button {...getCloseButtonProps({ ariaLabel: 'Close notes dialog' })}>×</button>
        <h5 className={styles.modalTitle}>Additional Notes</h5>
        <textarea
          value={tempNotes}
          onChange={(e) => setTempNotes(e.target.value)}
          className={styles.modalTextarea}
          placeholder="Enter additional notes..."
        />
        <div className={styles.modalButtons}>
          <button 
            onClick={handleSave} 
            className={styles.saveButton}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={requestClose} 
            className={styles.cancelButton}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};