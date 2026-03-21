import { type CaseImportPreview } from '~/types';
import styles from '../case-import.module.css';

interface ConfirmationDialogProps {
  showConfirmation: boolean;
  casePreview: CaseImportPreview | null;
  showArchivedRegularCaseRiskWarning?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog = ({ 
  showConfirmation, 
  casePreview, 
  showArchivedRegularCaseRiskWarning = false,
  onConfirm, 
  onCancel 
}: ConfirmationDialogProps) => {
  if (!showConfirmation || !casePreview) return null;

  return (
    <div className={styles.confirmationOverlay}>
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
            <div className={styles.confirmationItem}>
              <strong>Archived Export:</strong> {casePreview.archived ? 'Yes' : 'No'}
            </div>
            {casePreview.archived && (
              <div className={styles.archivedImportNote}>
                Archived export detected. Original exporter imports are allowed for archived cases.
              </div>
            )}
            {showArchivedRegularCaseRiskWarning && (
              <div className={styles.archivedRegularCaseRiskNote}>
                Warning: This archived import matches a case in your regular case list. If you clear the imported read-only case later, the regular case images will be deleted and inaccessible.
              </div>
            )}
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