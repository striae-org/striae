import { useState } from 'react';
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

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!caseNumber.trim()) return;
    
    setIsExporting(true);
    try {
      await onExport(caseNumber.trim());
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
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
                onChange={(e) => setCaseNumber(e.target.value)}
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
          </div>
        </div>
      </div>
    </div>
  );
};