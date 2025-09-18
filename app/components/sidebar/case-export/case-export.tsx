import { useState, useEffect } from 'react';
import styles from './case-export.module.css';

export type ExportFormat = 'json' | 'csv';

interface CaseExportProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (caseNumber: string, format: ExportFormat, includeImages?: boolean) => void;
  onExportAll: (onProgress: (current: number, total: number, caseName: string) => void, format: ExportFormat) => void;
  currentCaseNumber?: string;
}

export const CaseExport = ({ 
  isOpen, 
  onClose, 
  onExport, 
  onExportAll,
  currentCaseNumber = '' 
}: CaseExportProps) => {
  const [caseNumber, setCaseNumber] = useState(currentCaseNumber);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [error, setError] = useState<string>('');
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; caseName: string } | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [includeImages, setIncludeImages] = useState(false);

  // Update caseNumber when currentCaseNumber prop changes
  useEffect(() => {
    setCaseNumber(currentCaseNumber);
  }, [currentCaseNumber]);

  // Disable images option when exporting all cases or when no case number is entered
  useEffect(() => {
    if ((isExportingAll || !caseNumber.trim()) && includeImages) {
      setIncludeImages(false);
    }
  }, [isExportingAll, caseNumber, includeImages]);

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
    setExportProgress(null);
    
    try {
      await onExport(caseNumber.trim(), selectedFormat, includeImages);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      setError(error instanceof Error ? error.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    setIsExportingAll(true);
    setError('');
    setExportProgress(null); // Don't show progress until we have real data
    
    try {
      await onExportAll((current: number, total: number, caseName: string) => {
        setExportProgress({ current, total, caseName });
      }, selectedFormat);
      onClose();
    } catch (error) {
      console.error('Export all failed:', error);
      setError(error instanceof Error ? error.message : 'Export all cases failed. Please try again.');
    } finally {
      setIsExportingAll(false);
      setExportProgress(null);
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
            {/* 1. Case number input */}
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
                disabled={isExporting || isExportingAll}
              />
            </div>
            
            {/* 2. Format choice */}
            <div className={styles.formatSelector}>
              <span className={styles.formatLabel}>Format:</span>
              <div className={styles.formatToggle}>
                <button
                  type="button"
                  className={`${styles.formatOption} ${selectedFormat === 'json' ? styles.formatOptionActive : ''}`}
                  onClick={() => setSelectedFormat('json')}
                  disabled={isExporting || isExportingAll}
                >
                  JSON
                </button>
                <button
                  type="button"
                  className={`${styles.formatOption} ${selectedFormat === 'csv' ? styles.formatOptionActive : ''}`}
                  onClick={() => setSelectedFormat('csv')}
                  disabled={isExporting || isExportingAll}
                  title="CSV for single case, Excel (.xlsx) with multiple worksheets for all cases"
                >
                  CSV/Excel
                </button>
              </div>
            </div>

            {/* 3. Image inclusion option */}
            <div className={styles.imageOption}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  disabled={!caseNumber.trim() || isExporting || isExportingAll}
                />
                <div className={styles.checkboxText}>
                  <span>Include Images (ZIP)</span>
                  <p className={styles.checkboxTooltip}>
                    Available for single case exports only. Downloads a ZIP file containing data and all associated image files.
                  </p>
                </div>
              </label>
            </div>
            
            {/* 4. Export buttons (case OR all cases) */}
            <div className={styles.inputGroup}>
              <button
                className={styles.exportButton}
                onClick={handleExport}
                disabled={!caseNumber.trim() || isExporting || isExportingAll}
              >
                {isExporting ? 'Exporting...' : 'Export Case Data'}
              </button>
            </div>
            
            <div className={styles.divider}>
              <span>OR</span>
            </div>
            
            <div className={styles.exportAllSection}>
              <button
                className={styles.exportAllButton}
                onClick={handleExportAll}
                disabled={isExporting || isExportingAll}
              >
                {isExportingAll ? 'Exporting All Cases...' : 'Export All Cases'}
              </button>              
            </div>
            
            {exportProgress && exportProgress.total > 0 && (
              <div className={styles.progressSection}>
                <div className={styles.progressText}>
                  Exporting case {exportProgress.current} of {exportProgress.total}: {exportProgress.caseName}
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {isExportingAll && !exportProgress && (
              <div className={styles.progressSection}>
                <div className={styles.progressText}>
                  Preparing export...
                </div>
              </div>
            )}
            
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