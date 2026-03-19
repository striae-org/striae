import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import styles from './public-signing-key-modal.module.css';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { verifyExportFile } from '~/utils/forensics';

const NO_PUBLIC_KEY_MESSAGE = 'No public signing key is configured for this environment.';

interface SelectedPublicKeyFile {
  name: string;
  content: string;
  source: 'download' | 'upload';
}

interface VerificationOutcome {
  state: 'pass' | 'fail';
  message: string;
}

interface VerificationDropZoneProps {
  inputId: string;
  label: string;
  accept: string;
  emptyText: string;
  helperText: string;
  selectedFileName?: string | null;
  selectedDescription?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  onFileSelected: (file: File) => void | Promise<void>;
  onClear?: () => void;
  actionButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

const VerificationDropZone = ({
  inputId,
  label,
  accept,
  emptyText,
  helperText,
  selectedFileName,
  selectedDescription,
  errorMessage,
  isDisabled = false,
  onFileSelected,
  onClear,
  actionButton
}: VerificationDropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    if (!isDisabled) {
      inputRef.current?.click();
    }
  };

  const handleSelectedFile = (file?: File) => {
    if (!file || isDisabled) {
      return;
    }

    void onFileSelected(file);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleSelectedFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDisabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const relatedTarget = event.relatedTarget as HTMLElement | null;

    if (!relatedTarget || !event.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    handleSelectedFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className={styles.verificationField}>
      <div className={styles.fieldHeader}>
        <label htmlFor={inputId} className={styles.fieldLabel}>
          {label}
        </label>
        {selectedFileName && onClear && (
          <button type="button" className={styles.clearButton} onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        disabled={isDisabled}
        className={styles.hiddenFileInput}
      />

      <div
        className={`${styles.dropZone} ${isDragOver ? styles.dropZoneActive : ''} ${isDisabled ? styles.dropZoneDisabled : ''}`}
        onClick={openFilePicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        aria-label={label}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !isDisabled) {
            if (event.key === ' ') {
              event.preventDefault();
            }
            openFilePicker();
          }
        }}
      >
        <p className={styles.dropZonePrimary}>
          {isDragOver ? 'Drop file to continue' : selectedFileName || emptyText}
        </p>
        <p className={styles.dropZoneSecondary}>{selectedFileName ? selectedDescription : helperText}</p>
      </div>

      <div className={styles.fieldActions}>
        <button type="button" className={styles.secondaryButton} onClick={openFilePicker} disabled={isDisabled}>
          Choose File
        </button>
        {actionButton && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={actionButton.onClick}
            disabled={isDisabled || actionButton.disabled}
          >
            {actionButton.label}
          </button>
        )}
      </div>

      {errorMessage && <p className={styles.fieldError}>{errorMessage}</p>}
    </div>
  );
};

function createPublicKeyDownloadFileName(publicSigningKeyId?: string | null): string {
  const normalizedKeyId =
    typeof publicSigningKeyId === 'string' && publicSigningKeyId.trim().length > 0
      ? `-${publicSigningKeyId.trim().replace(/[^a-z0-9_-]+/gi, '-')}`
      : '';

  return `striae-public-signing-key${normalizedKeyId}.pem`;
}

function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const linkElement = document.createElement('a');

  linkElement.href = objectUrl;
  linkElement.download = fileName;
  linkElement.style.display = 'none';

  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface PublicSigningKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicSigningKeyId?: string | null;
  publicKeyPem?: string | null;
}

export const PublicSigningKeyModal = ({
  isOpen,
  onClose,
  publicSigningKeyId,
  publicKeyPem
}: PublicSigningKeyModalProps) => {
  const [selectedPublicKey, setSelectedPublicKey] = useState<SelectedPublicKeyFile | null>(null);
  const [selectedExportFile, setSelectedExportFile] = useState<File | null>(null);
  const [keyError, setKeyError] = useState('');
  const [exportFileError, setExportFileError] = useState('');
  const [verificationOutcome, setVerificationOutcome] = useState<VerificationOutcome | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const publicSigningKeyTitleId = useId();
  const publicKeyInputId = useId();
  const exportFileInputId = useId();
  const {
    handleOverlayMouseDown,
    handleOverlayKeyDown
  } = useOverlayDismiss({
    isOpen,
    onClose
  });

  useEffect(() => {
    if (!isOpen) {
      setSelectedPublicKey(null);
      setSelectedExportFile(null);
      setKeyError('');
      setExportFileError('');
      setVerificationOutcome(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const resetVerificationState = () => {
    setVerificationOutcome(null);
  };

  const handlePublicKeySelected = async (file: File) => {
    try {
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.pem')) {
        setKeyError('Select a PEM public key file.');
        return;
      }

      const content = await file.text();
      if (!content.includes('-----BEGIN PUBLIC KEY-----') || !content.includes('-----END PUBLIC KEY-----')) {
        setKeyError('The selected file is not a valid PEM public key file.');
        return;
      }

      setSelectedPublicKey({
        name: file.name,
        content,
        source: 'upload'
      });
      setKeyError('');
      resetVerificationState();
    } catch {
      setKeyError('The public key file could not be read.');
    }
  };

  const handleDownloadCurrentPublicKey = () => {
    if (!publicKeyPem) {
      setKeyError(NO_PUBLIC_KEY_MESSAGE);
      return;
    }

    const fileName = createPublicKeyDownloadFileName(publicSigningKeyId);
    downloadTextFile(fileName, publicKeyPem, 'application/x-pem-file');
    setSelectedPublicKey({
      name: fileName,
      content: publicKeyPem,
      source: 'download'
    });
    setKeyError('');
    resetVerificationState();
  };

  const handleExportFileSelected = async (file: File) => {
    const lowerName = file.name.toLowerCase();

    if (!lowerName.endsWith('.zip') && !lowerName.endsWith('.json')) {
      setExportFileError('Select a confirmation JSON/ZIP file or a case export ZIP file.');
      return;
    }

    setSelectedExportFile(file);
    setExportFileError('');
    resetVerificationState();
  };

  const handleVerify = async () => {
    const hasPublicKey = !!selectedPublicKey?.content;
    const hasExportFile = !!selectedExportFile;

    setKeyError(hasPublicKey ? '' : 'Select or download a public key PEM file first.');
    setExportFileError(hasExportFile ? '' : 'Select a confirmation JSON/ZIP file or a case export ZIP file.');

    if (!hasPublicKey || !hasExportFile || !selectedPublicKey || !selectedExportFile) {
      return;
    }

    setIsVerifying(true);
    setVerificationOutcome(null);

    try {
      const result = await verifyExportFile(selectedExportFile, selectedPublicKey.content);
      setVerificationOutcome({
        state: result.isValid ? 'pass' : 'fail',
        message: result.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const selectedKeyDescription = selectedPublicKey
    ? selectedPublicKey.source === 'download'
      ? 'Downloaded from this Striae environment and ready to use.'
      : 'Loaded from your device and ready to use.'
    : undefined;

  const selectedExportDescription = selectedExportFile
    ? `${(() => {
        const lowerName = selectedExportFile.name.toLowerCase();
        if (lowerName.endsWith('.zip')) {
          return lowerName.includes('confirmation-data-') ? 'Confirmation ZIP' : 'Case export ZIP';
        }

        return 'Confirmation JSON';
      })()} • ${formatFileSize(selectedExportFile.size)}`
    : undefined;

  return (
    <div
      className={styles.overlay}
      onMouseDown={handleOverlayMouseDown}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close public signing key dialog"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={publicSigningKeyTitleId}
      >
        <div className={styles.header}>
          <h3 id={publicSigningKeyTitleId} className={styles.title}>
            Striae Public Signing Key
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close public signing key dialog"
          >
            &times;
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            Drop a public key PEM file and a Striae confirmation JSON/ZIP or case export ZIP, then run
            verification directly in the browser.
          </p>

          {publicSigningKeyId && (
            <p className={styles.meta}>
              Current key ID: <span>{publicSigningKeyId}</span>
            </p>
          )}

          <div className={styles.verifierLayout}>
            <VerificationDropZone
              inputId={publicKeyInputId}
              label="1. Public Key PEM"
              accept=".pem"
              emptyText="Drop a public key PEM file here"
              helperText="Use a .pem file containing the Striae public signing key."
              selectedFileName={selectedPublicKey?.name}
              selectedDescription={selectedKeyDescription}
              errorMessage={keyError}
              onFileSelected={handlePublicKeySelected}
              onClear={() => {
                setSelectedPublicKey(null);
                setKeyError('');
                resetVerificationState();
              }}
              actionButton={{
                label: 'Download Current Public Key',
                onClick: handleDownloadCurrentPublicKey,
                disabled: !publicKeyPem
              }}
            />

            <VerificationDropZone
              inputId={exportFileInputId}
              label="2. Confirmation File or Export ZIP"
              accept=".json,.zip"
              emptyText="Drop a confirmation JSON/ZIP or case export ZIP here"
              helperText="Case exports use .zip. Confirmation exports can be .json or .zip."
              selectedFileName={selectedExportFile?.name}
              selectedDescription={selectedExportDescription}
              errorMessage={exportFileError}
              onFileSelected={handleExportFileSelected}
              onClear={() => {
                setSelectedExportFile(null);
                setExportFileError('');
                resetVerificationState();
              }}
            />
          </div>

          {verificationOutcome && (
            <div
              className={`${styles.resultCard} ${verificationOutcome.state === 'pass' ? styles.resultPass : styles.resultFail}`}
              role="status"
              aria-live="polite"
            >
              <p className={styles.resultTitle}>{verificationOutcome.state === 'pass' ? 'PASS' : 'FAIL'}</p>
              <p className={styles.resultMessage}>{verificationOutcome.message}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleVerify}
              disabled={isVerifying || !selectedPublicKey || !selectedExportFile}
            >
              {isVerifying ? 'Verifying...' : 'Verify File'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};