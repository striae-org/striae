import styles from '../case-import.module.css';

interface ExistingCaseSectionProps {
  existingReadOnlyCase: string | null;
  selectedFile: File | null;
  onClear: () => void;
  isClearing: boolean;
  isImporting: boolean;
}

export const ExistingCaseSection = ({ 
  existingReadOnlyCase, 
  selectedFile, 
  onClear, 
  isClearing, 
  isImporting 
}: ExistingCaseSectionProps) => {
  if (!existingReadOnlyCase) return null;

  return (
    <div className={styles.warningSection}>
      <div className={styles.warningText}>
        <strong>Current Review Case:</strong> &quot;{existingReadOnlyCase}&quot;
        <p className={styles.warningSubtext}>
          {selectedFile 
            ? 'Importing a new case will automatically replace the existing one.'
            : 'You can clear this case or import a new one to replace it.'
          }
        </p>
      </div>
      <button
        className={styles.clearButton}
        onClick={onClear}
        disabled={isClearing || isImporting}
      >
        {isClearing ? 'Clearing...' : 'Clear Case'}
      </button>
    </div>
  );
};