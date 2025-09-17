import { useState, useEffect } from 'react';
import styles from './case-export.module.css';

interface CaseExportProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (caseNumber: string) => void;
  currentCaseNumber?: string;
}

export const CaseExport = ({ 
  isOpen, 
  onClose, 
  onExport, 
  currentCaseNumber = '' 
}: CaseExportProps) => {
  const [caseNumber, setCaseNumber] = useState(currentCaseNumber);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string>('');

  // Update caseNumber when currentCaseNumber prop changes
  useEffect(() => {
    setCaseNumber(currentCaseNumber);
  }, [currentCaseNumber]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!caseNumber.trim()) {
      setError('Please enter a case number');
      return;
    }
    
    setIsExporting(true);
    setError('');
    
    try {
      await onExport(caseNumber.trim());
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      setError(error instanceof Error ? error.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Export Case Data</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.fieldGroup}>
            <label htmlFor="caseNumber" className={styles.label}>
              Case Number:
            </label>
            <div className={styles.inputGroup}>
              <input
                id="caseNumber"
                type="text"
                className={styles.input}
                value={caseNumber}
                onChange={(e) => {
                  setCaseNumber(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter case number"
                disabled={isExporting}
              />
              <button
                className={styles.exportButton}
                onClick={handleExport}
                disabled={!caseNumber.trim() || isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export Case Data'}
              </button>
            </div>
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};