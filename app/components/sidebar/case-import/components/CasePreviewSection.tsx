import { type CaseImportPreview } from '~/types';
import styles from '../case-import.module.css';

interface CasePreviewSectionProps {
  casePreview: CaseImportPreview | null;
  isLoadingPreview: boolean;
}

export const CasePreviewSection = ({ casePreview, isLoadingPreview }: CasePreviewSectionProps) => {
  if (isLoadingPreview) {
    return (
      <div className={styles.previewSection}>
        <div className={styles.previewLoading}>
          Loading case information...
        </div>
      </div>
    );
  }

  if (!casePreview) return null;

  return (
    <>
      {/* Case Information - Always Blue */}
      <div className={styles.previewSection}>
        <h3 className={styles.previewTitle}>Case Information</h3>
        <div className={styles.previewGrid}>
          <div className={styles.previewItem}>
            <span className={styles.previewLabel}>Case Number:</span>
            <span className={styles.previewValue}>{casePreview.caseNumber}</span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabel}>Exported by:</span>
            <span className={styles.previewValue}>
              {casePreview.exportedByName || casePreview.exportedBy || 'N/A'}
            </span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabel}>Lab/Company:</span>
            <span className={styles.previewValue}>{casePreview.exportedByCompany || 'N/A'}</span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabel}>Export Date:</span>
            <span className={styles.previewValue}>
              {new Date(casePreview.exportDate).toLocaleDateString()}
            </span>
          </div>
          <div className={styles.previewItem}>
            <span className={styles.previewLabel}>Total Images:</span>
            <span className={styles.previewValue}>{casePreview.totalFiles}</span>
          </div>
        </div>
      </div>

      {/* Data Integrity Checks - Green/Red Based on Validation */}
      {casePreview.hashValid !== undefined && (
        <div className={`${styles.validationSection} ${casePreview.hashValid ? styles.validationSectionValid : styles.validationSectionInvalid}`}>
          <h3 className={styles.validationTitle}>Data Integrity Validation</h3>
          <div className={styles.validationItem}>            
            <span className={`${styles.validationValue} ${casePreview.hashValid ? styles.validationSuccess : styles.validationError}`}>
              {casePreview.hashValid ? (
                <>✓ Validation passed</>
              ) : (
                <>✗ Validation failed</>
              )}
            </span>
          </div>
        </div>
      )}
    </>
  );
};