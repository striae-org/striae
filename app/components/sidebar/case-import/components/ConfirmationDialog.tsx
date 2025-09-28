import { CaseImportPreview } from '~/types';
import styles from '../case-import.module.css';

interface ConfirmationDialogProps {
  showConfirmation: boolean;
  casePreview: CaseImportPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog = ({ 
  showConfirmation, 
  casePreview, 
  onConfirm, 
  onCancel 
}: ConfirmationDialogProps) => {
  if (!showConfirmation || !casePreview) return null;

  return (
    <div className={styles.confirmationOverlay} onClick={(e) => e.stopPropagation()}>
      <div className={styles.confirmationModal}>
        <div className={styles.confirmationContent}>
          <h3 className={styles.confirmationTitle}>Confirm Case Import</h3>
          <p className={styles.confirmationText}>
            Are you sure you want to import this case for review?
          </p>
          
          <div className={styles.confirmationDetails}>
            <div className={styles.confirmationItem}>
              <strong>Case Number:</strong> {casePreview.caseNumber}
            </div>
            <div className={styles.confirmationItem}>
              <strong>Exported by:</strong> {casePreview.exportedByName || casePreview.exportedBy || 'N/A'}
            </div>
            <div className={styles.confirmationItem}>
              <strong>Lab/Company:</strong> {casePreview.exportedByCompany || 'N/A'}
            </div>
            <div className={styles.confirmationItem}>
              <strong>Export Date:</strong> {new Date(casePreview.exportDate).toLocaleDateString()}
            </div>
            <div className={styles.confirmationItem}>
              <strong>Total Images:</strong> {casePreview.totalFiles}
            </div>
            {casePreview.hashValid !== undefined && (
              <div className={`${styles.confirmationItem} ${casePreview.hashValid ? styles.confirmationItemValid : styles.confirmationItemInvalid}`}>
                <strong>Data Integrity:</strong> 
                <span className={casePreview.hashValid ? styles.confirmationSuccess : styles.confirmationError}>
                  {casePreview.hashValid ? '✓ Verified' : '✗ Failed'}
                </span>
              </div>
            )}
          </div>

          <div className={styles.confirmationButtons}>
            <button
              className={styles.confirmButton}
              onClick={onConfirm}
            >
              Confirm Import
            </button>
            <button
              className={styles.cancelButton}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};