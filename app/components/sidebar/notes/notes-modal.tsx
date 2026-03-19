import { useState } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import styles from './notes.module.css';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
  onSave: (notes: string) => void;
}

export const NotesModal = ({ isOpen, onClose, notes, onSave }: NotesModalProps) => {
  const [tempNotes, setTempNotes] = useState(notes);
  const {
    handleOverlayMouseDown,
    handleOverlayKeyDown
  } = useOverlayDismiss({
    isOpen,
    onClose
  });

  if (!isOpen) return null;  

  const handleSave = () => {
    onSave(tempNotes);
    onClose();
  };

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={handleOverlayMouseDown}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close notes dialog"
    >
      <div className={styles.modal}>
        <h5 className={styles.modalTitle}>Additional Notes</h5>
        <textarea
          value={tempNotes}
          onChange={(e) => setTempNotes(e.target.value)}
          className={styles.modalTextarea}
          placeholder="Enter additional notes..."
        />
        <div className={styles.modalButtons}>
          <button onClick={handleSave} className={styles.saveButton}>Save</button>
          <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
        </div>
      </div>
    </div>
  );
};