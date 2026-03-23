import { type CaseImportPreview } from '~/types';
import { ARCHIVED_REGULAR_CASE_BLOCK_MESSAGE, DATA_INTEGRITY_VALIDATION_PASSED, DATA_INTEGRITY_VALIDATION_FAILED } from '~/utils/case-messages';
import styles from '../case-import.module.css';

interface CasePreviewSectionProps {
  casePreview: CaseImportPreview | null;
  isLoadingPreview: boolean;
  isArchivedRegularCaseImportBlocked?: boolean;
}

export const CasePreviewSection = ({
  casePreview,
  isLoadingPreview,
  isArchivedRegularCaseImportBlocked = false
}: CasePreviewSectionProps) => {
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
        {casePreview.archived && (
          <div className={styles.archivedImportNote}>
            Archived export detected. Original exporter imports are allowed for archived cases.
          </div>
        )}
        {isArchivedRegularCaseImportBlocked && (
          <div className={styles.archivedRegularCaseRiskNote}>
            {ARCHIVED_REGULAR_CASE_BLOCK_MESSAGE}
          </div>
        )}
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
          <div className={styles.previewItem}>
            <span className={styles.previewLabel}>Archived Export:</span>
            <span className={styles.previewValue}>{casePreview.archived ? 'Yes' : 'No'}</span>
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
                <>{DATA_INTEGRITY_VALIDATION_PASSED}</>
              ) : (
                <>{DATA_INTEGRITY_VALIDATION_FAILED}</>
              )}
            </span>
          </div>
        </div>
      )}
    </>
  );
};