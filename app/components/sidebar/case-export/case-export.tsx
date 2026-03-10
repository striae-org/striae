import { useState, useEffect, useContext } from 'react';
import styles from './case-export.module.css';
import config from '~/config/config.json';
import { AuthContext } from '~/contexts/auth.context';
import { getVerificationPublicKey } from '~/utils/signature-utils';
import { getCaseConfirmations, exportConfirmationData } from '../../actions/confirm-export';

export type ExportFormat = 'json' | 'csv';

type ManifestSigningConfig = {
  manifest_signing_key_id?: string;
  manifest_signing_public_key?: string;
  manifest_signing_public_keys?: Record<string, string>;
};

function getPublicSigningKeyDetails(): { keyId: string | null; publicKeyPem: string | null } {
  const signingConfig = config as unknown as ManifestSigningConfig;
  const configuredKeyId =
    typeof signingConfig.manifest_signing_key_id === 'string' &&
    signingConfig.manifest_signing_key_id.trim().length > 0
      ? signingConfig.manifest_signing_key_id
      : null;

  if (configuredKeyId) {
    return {
      keyId: configuredKeyId,
      publicKeyPem: getVerificationPublicKey(configuredKeyId)
    };
  }

  const keyMap = signingConfig.manifest_signing_public_keys;
  if (keyMap && typeof keyMap === 'object') {
    const firstConfiguredEntry = Object.entries(keyMap).find(
      ([, value]) => typeof value === 'string' && value.trim().length > 0
    );

    if (firstConfiguredEntry) {
      return {
        keyId: firstConfiguredEntry[0],
        publicKeyPem: firstConfiguredEntry[1]
      };
    }
  }

  if (
    typeof signingConfig.manifest_signing_public_key === 'string' &&
    signingConfig.manifest_signing_public_key.trim().length > 0
  ) {
    return {
      keyId: null,
      publicKeyPem: signingConfig.manifest_signing_public_key
    };
  }

  return {
    keyId: null,
    publicKeyPem: null
  };
}

interface CaseExportProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (caseNumber: string, format: ExportFormat, includeImages?: boolean) => void;
  onExportAll: (onProgress: (current: number, total: number, caseName: string) => void, format: ExportFormat) => void;
  currentCaseNumber?: string;
  isReadOnly?: boolean;
}

export const CaseExport = ({ 
  isOpen, 
  onClose, 
  onExport, 
  onExportAll,
  currentCaseNumber = '',
  isReadOnly = false
}: CaseExportProps) => {
  const { user } = useContext(AuthContext);
  const [caseNumber, setCaseNumber] = useState(currentCaseNumber);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isExportingConfirmations, setIsExportingConfirmations] = useState(false);
  const [error, setError] = useState<string>('');
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; caseName: string } | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [includeImages, setIncludeImages] = useState(false);
  const [hasConfirmationData, setHasConfirmationData] = useState(false);
  const [isPublicKeyModalOpen, setIsPublicKeyModalOpen] = useState(false);
  const [isCopyingPublicKey, setIsCopyingPublicKey] = useState(false);
  const [publicKeyCopyMessage, setPublicKeyCopyMessage] = useState('');
  const { keyId: publicSigningKeyId, publicKeyPem } = getPublicSigningKeyDetails();

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

  // Check for confirmation data when case changes (for read-only cases)
  useEffect(() => {
    const checkConfirmationData = async () => {
      if (isReadOnly && user && caseNumber.trim()) {
        try {
          const confirmations = await getCaseConfirmations(user, caseNumber.trim());
          const hasData = !!confirmations && Object.keys(confirmations).length > 0;
          setHasConfirmationData(hasData);
        } catch (error) {
          console.error('Failed to check confirmation data:', error);
          setHasConfirmationData(false);
        }
      } else {
        setHasConfirmationData(false);
      }
    };

    checkConfirmationData();
  }, [isReadOnly, user, caseNumber]);

  // Additional useEffect to check when modal opens
  useEffect(() => {
    if (isOpen && isReadOnly && user && caseNumber.trim()) {
      const checkOnOpen = async () => {
        try {
          const confirmations = await getCaseConfirmations(user, caseNumber.trim());
          const hasData = !!confirmations && Object.keys(confirmations).length > 0;
          setHasConfirmationData(hasData);
        } catch (error) {
          console.error('Modal open confirmation check failed:', error);
          setHasConfirmationData(false);
        }
      };
      checkOnOpen();
    }
  }, [isOpen, isReadOnly, user, caseNumber]);

  // Force JSON format and disable images for read-only cases
  useEffect(() => {
    if (isReadOnly) {
      setSelectedFormat('json');
      setIncludeImages(false);
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (!isOpen) {
      setIsPublicKeyModalOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isPublicKeyModalOpen) {
      setIsCopyingPublicKey(false);
      setPublicKeyCopyMessage('');
    }
  }, [isPublicKeyModalOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (isPublicKeyModalOpen) {
          setIsPublicKeyModalOpen(false);
          return;
        }

        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, isPublicKeyModalOpen, onClose]);

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

  const handleExportConfirmations = async () => {
    if (!caseNumber.trim() || !user) {
      setError('Unable to export confirmation data');
      return;
    }
    
    setIsExportingConfirmations(true);
    setError('');
    
    try {
      await exportConfirmationData(user, caseNumber.trim());
      onClose();
    } catch (error) {
      console.error('Confirmation export failed:', error);
      setError(error instanceof Error ? error.message : 'Confirmation export failed. Please try again.');
    } finally {
      setIsExportingConfirmations(false);
    }
  };

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) {
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClose();
    }
  };

  const handlePublicKeyOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsPublicKeyModalOpen(false);
    }
  };

  const handlePublicKeyOverlayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) {
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsPublicKeyModalOpen(false);
    }
  };

  const copyTextWithExecCommand = (text: string): boolean => {
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = text;
    tempTextarea.setAttribute('readonly', '');
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.opacity = '0';
    tempTextarea.style.pointerEvents = 'none';

    document.body.appendChild(tempTextarea);
    tempTextarea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(tempTextarea);
    }

    return copied;
  };

  const handleCopyPublicKey = async () => {
    if (!publicKeyPem) {
      setPublicKeyCopyMessage('No public signing key is configured for this environment.');
      return;
    }

    setIsCopyingPublicKey(true);
    setPublicKeyCopyMessage('');

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(publicKeyPem);
        setPublicKeyCopyMessage('Public key copied to clipboard.');
      } else {
        const copied = copyTextWithExecCommand(publicKeyPem);
        setPublicKeyCopyMessage(
          copied
            ? 'Public key copied to clipboard.'
            : 'Copy failed. Select and copy the key manually.'
        );
      }
    } catch (copyError) {
      const copied = copyTextWithExecCommand(publicKeyPem);
      setPublicKeyCopyMessage(
        copied
          ? 'Public key copied to clipboard.'
          : 'Copy failed. Select and copy the key manually.'
      );

      if (!copied) {
        console.error('Failed to copy public signing key:', copyError);
      }
    } finally {
      setIsCopyingPublicKey(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={handleOverlayMouseDown}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close case export dialog"
    >
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
                disabled={isExporting || isExportingAll || isReadOnly}
              />
            </div>
            
            {/* 2. Format choice - disabled for read-only cases */}
            <div className={styles.formatSelector}>
              <span className={styles.formatLabel}>Data Format:</span>
              <div className={styles.formatToggle}>
                <button
                  type="button"
                  className={`${styles.formatOption} ${selectedFormat === 'json' ? styles.formatOptionActive : ''}`}
                  onClick={() => setSelectedFormat('json')}
                  disabled={isExporting || isExportingAll || isReadOnly}
                  title="JSON for case imports"
                >
                  JSON
                </button>
                <button
                  type="button"
                  className={`${styles.formatOption} ${selectedFormat === 'csv' ? styles.formatOptionActive : ''}`}
                  onClick={() => setSelectedFormat('csv')}
                  disabled={isExporting || isExportingAll || isReadOnly}
                  title="CSV for single case, Excel (.xlsx) with multiple worksheets for all cases"
                >
                  CSV/Excel
                </button>
              </div>
            </div>

            {/* 3. Image inclusion option - disabled for read-only cases */}
            <div className={styles.imageOption}>
              <div className={styles.checkboxLabel}>
                <input
                  id="includeImagesOption"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  disabled={!caseNumber.trim() || isExporting || isExportingAll || isReadOnly}
                  aria-label="Include images in ZIP export"
                />
                <label htmlFor="includeImagesOption" className={styles.checkboxText}>
                  <span>Include Images (ZIP)</span>
                  <span className={styles.checkboxTooltip}>
                    Available for single case exports only. Downloads a ZIP file containing data and all associated image files. Case imports support only JSON data format.
                  </span>
                </label>
              </div>
            </div>
            
            {/* 4. Export buttons (case OR all cases) */}
            <div className={styles.inputGroup}>
              <button
                className={isReadOnly ? styles.confirmationExportButton : styles.exportButton}
                onClick={isReadOnly ? handleExportConfirmations : handleExport}
                disabled={!caseNumber.trim() || isExporting || isExportingAll || isExportingConfirmations || (isReadOnly && !hasConfirmationData)}
              >
                {isExporting || isExportingConfirmations ? 'Exporting...' : 
                 isReadOnly ? 'Export Confirmation Data' : 'Export Case Data'}
              </button>
            </div>

            <div className={styles.publicKeySection}>
              <button
                type="button"
                className={styles.publicKeyButton}
                onClick={() => setIsPublicKeyModalOpen(true)}
              >
                View Public Signing Key
              </button>
            </div>
            
            {/* Hide "Export All Cases" for read-only cases */}
            {!isReadOnly && (
              <>
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
              </>
            )}
            
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

      {isPublicKeyModalOpen && (
        <div
          className={styles.publicKeyOverlay}
          onMouseDown={handlePublicKeyOverlayMouseDown}
          onKeyDown={handlePublicKeyOverlayKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Close public signing key dialog"
        >
          <div
            className={styles.publicKeyModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publicSigningKeyTitle"
          >
            <div className={styles.publicKeyHeader}>
              <h3 id="publicSigningKeyTitle" className={styles.publicKeyTitle}>
                Striae Public Signing Key
              </h3>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsPublicKeyModalOpen(false)}
                aria-label="Close public signing key dialog"
              >
                ×
              </button>
            </div>

            <div className={styles.publicKeyContent}>
              <p className={styles.publicKeyDescription}>
                This key verifies digital signatures attached to Striae exports. It is safe to share for
                independent verification.
              </p>

              {publicSigningKeyId && (
                <p className={styles.publicKeyMeta}>
                  Key ID: <span>{publicSigningKeyId}</span>
                </p>
              )}

              <label htmlFor="publicSigningKey" className={styles.publicKeyLabel}>
                Public signing key (PEM)
              </label>
              <textarea
                id="publicSigningKey"
                className={styles.publicKeyField}
                value={publicKeyPem || 'No public signing key is configured for this environment.'}
                readOnly
                rows={10}
              />

              <p className={styles.publicKeyHowToTitle}>How to verify Striae exports</p>
              <ol className={styles.publicKeyHowToList}>
                <li>
                  Locate signature metadata in the export (for case ZIP exports, see FORENSIC_MANIFEST.json;
                  for confirmation exports, see metadata.signature).
                </li>
                <li>
                  Use this public key with your signature verification workflow (for example OpenSSL or an
                  internal verifier) to validate the signed payload.
                </li>
                <li>
                  Trust the export only when signature verification succeeds and the key ID matches the export
                  metadata.
                </li>
              </ol>

              {publicKeyCopyMessage && (
                <p className={styles.publicKeyStatus} role="status" aria-live="polite">
                  {publicKeyCopyMessage}
                </p>
              )}

              <div className={styles.publicKeyActions}>
                <button
                  type="button"
                  className={styles.publicKeyCopyButton}
                  onClick={handleCopyPublicKey}
                  disabled={isCopyingPublicKey || !publicKeyPem}
                >
                  {isCopyingPublicKey ? 'Copying...' : 'Copy Key'}
                </button>
                <button
                  type="button"
                  className={styles.publicKeyCloseButton}
                  onClick={() => setIsPublicKeyModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};