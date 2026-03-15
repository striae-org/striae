import { useEffect, useId, useState, type KeyboardEvent, type MouseEvent } from 'react';
import styles from './public-signing-key-modal.module.css';
import { copyTextToClipboard } from '~/utils/clipboard';
import {
  APPLE_COMMAND_EXAMPLES,
  DEFAULT_EXPECTED_KEY_ID,
  POWER_SHELL_COMMAND_EXAMPLES,
  createAppleVerifierTemplate,
  createPowerShellVerifierTemplate
} from './verifier-templates';

const NO_PUBLIC_KEY_MESSAGE = 'No public signing key is configured for this environment.';
const COPY_FAILED_MESSAGE = 'Copy failed. Select and copy the text manually.';

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
  const [isCopyingPublicKey, setIsCopyingPublicKey] = useState(false);
  const [isCopyingPowerShellTemplate, setIsCopyingPowerShellTemplate] = useState(false);
  const [isCopyingAppleTemplate, setIsCopyingAppleTemplate] = useState(false);
  const [publicKeyCopyMessage, setPublicKeyCopyMessage] = useState('');
  const [instructionCopyMessage, setInstructionCopyMessage] = useState('');
  const publicSigningKeyTitleId = useId();
  const publicSigningKeyFieldId = useId();
  const expectedKeyId =
    typeof publicSigningKeyId === 'string' && publicSigningKeyId.trim().length > 0
      ? publicSigningKeyId.trim()
      : DEFAULT_EXPECTED_KEY_ID;

  useEffect(() => {
    if (!isOpen) {
      setIsCopyingPublicKey(false);
      setIsCopyingPowerShellTemplate(false);
      setIsCopyingAppleTemplate(false);
      setPublicKeyCopyMessage('');
      setInstructionCopyMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscapeKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose();
    }
  };

  const resetCopyMessages = () => {
    setInstructionCopyMessage('');
    setPublicKeyCopyMessage('');
  };

  const copyVerifierTemplate = async (
    templateText: string,
    setIsCopying: (isCopying: boolean) => void,
    successMessage: string,
    errorLabel: string
  ) => {
    setIsCopying(true);
    resetCopyMessages();

    try {
      const { copied, error } = await copyTextToClipboard(templateText);
      setInstructionCopyMessage(copied ? successMessage : COPY_FAILED_MESSAGE);
      if (!copied) {
        console.error(`Failed to copy ${errorLabel}:`, error);
      }
    } finally {
      setIsCopying(false);
    }
  };

  const handleCopyPublicKey = async () => {
    if (!publicKeyPem) {
      setPublicKeyCopyMessage(NO_PUBLIC_KEY_MESSAGE);
      return;
    }

    setIsCopyingPublicKey(true);
    resetCopyMessages();

    try {
      const { copied, error } = await copyTextToClipboard(publicKeyPem);
      setPublicKeyCopyMessage(copied ? 'Public key copied to clipboard.' : COPY_FAILED_MESSAGE);
      if (!copied) {
        console.error('Failed to copy public signing key:', error);
      }
    } finally {
      setIsCopyingPublicKey(false);
    }
  };

  const handleCopyAppleTemplate = async () => {
    await copyVerifierTemplate(
      createAppleVerifierTemplate(expectedKeyId),
      setIsCopyingAppleTemplate,
      'Apple/Linux verifier script copied to clipboard.',
      'Apple/Linux verifier script'
    );
  };

  const handleCopyPowerShellTemplate = async () => {
    await copyVerifierTemplate(
      createPowerShellVerifierTemplate(expectedKeyId),
      setIsCopyingPowerShellTemplate,
      'PowerShell verifier script copied to clipboard.',
      'PowerShell verifier script'
    );
  };

  const statusMessage = instructionCopyMessage || publicKeyCopyMessage;

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
            This key verifies digital signatures attached to Striae exports. It is safe to share for
            independent verification.
          </p>

          {publicSigningKeyId && (
            <p className={styles.meta}>
              Key ID: <span>{publicSigningKeyId}</span>
            </p>
          )}

          <label htmlFor={publicSigningKeyFieldId} className={styles.label}>
            Public signing key (PEM)
          </label>
          <textarea
            id={publicSigningKeyFieldId}
            className={styles.field}
            value={publicKeyPem || NO_PUBLIC_KEY_MESSAGE}
            readOnly
            rows={10}
          />

          <p className={styles.howToTitle}>How to verify Striae exports</p>
          <p className={styles.howToIntro}>
            Follow this checklist exactly. Treat the export as untrusted unless every step passes.
          </p>

          <details className={styles.howToSection} open>
            <summary className={styles.howToSectionSummary}>Quick checks (all exports)</summary>
            <div className={styles.howToSectionBody}>
              <ol className={styles.howToList}>
                <li>
                  Locate the signature envelope and confirm it includes
                  {' '}
                  <code className={styles.inlineCode}>algorithm</code>,
                  {' '}
                  <code className={styles.inlineCode}>keyId</code>, and
                  {' '}
                  <code className={styles.inlineCode}>value</code>.
                </li>
                <li>
                  Require
                  {' '}
                  <code className={styles.inlineCode}>algorithm=RSASSA-PKCS1-v1_5-SHA-256</code>.
                </li>
                <li>
                  Require
                  {' '}
                  <code className={styles.inlineCode}>keyId</code>
                  {' '}
                  to match the key ID shown above.
                </li>
                <li>
                  Base64url-decode
                  {' '}
                  <code className={styles.inlineCode}>value</code>
                  {' '}
                  before verification.
                </li>
              </ol>
            </div>
          </details>

          <details className={styles.howToSection}>
            <summary className={styles.howToSectionSummary}>Case ZIP export (FORENSIC_MANIFEST.json)</summary>
            <div className={styles.howToSectionBody}>
              <ol className={styles.howToList}>
                <li>
                  Open
                  {' '}
                  <code className={styles.inlineCode}>FORENSIC_MANIFEST.json</code>
                  {' '}
                  and read signature metadata from
                  {' '}
                  <code className={styles.inlineCode}>signature</code>.
                </li>
                <li>
                  Build canonical payload JSON with this exact order and normalization:
                  {' '}
                  <code className={styles.inlineCode}>
                    manifestVersion, dataHash(lowercase), imageHashes(sorted by filename + lowercase values),
                    manifestHash(lowercase), totalFiles, createdAt
                  </code>
                  .
                </li>
                <li>
                  Verify signature over UTF-8 bytes of that canonical payload using RSA PKCS#1 v1.5 + SHA-256.
                </li>
                <li>
                  Recompute data/image/manifest hashes and require all hash checks to pass.
                </li>
              </ol>
              <p className={styles.howToNote}>
                Use the platform-specific script buttons below to run this workflow.
              </p>
            </div>
          </details>

          <details className={styles.howToSection}>
            <summary className={styles.howToSectionSummary}>
              Confirmation export (confirmation-data-*.json)
            </summary>
            <div className={styles.howToSectionBody}>
              <ol className={styles.howToList}>
                <li>
                  Read signature metadata from
                  {' '}
                  <code className={styles.inlineCode}>metadata.signature</code>
                  {' '}
                  and version from
                  {' '}
                  <code className={styles.inlineCode}>metadata.signatureVersion</code>.
                </li>
                <li>
                  Recompute
                  {' '}
                  <code className={styles.inlineCode}>metadata.hash</code>
                  {' '}
                  from the unsigned payload (remove
                  {' '}
                  <code className={styles.inlineCode}>metadata.hash</code>,
                  {' '}
                  <code className={styles.inlineCode}>metadata.signature</code>, and
                  {' '}
                  <code className={styles.inlineCode}>metadata.signatureVersion</code>
                  {' '}
                  first).
                </li>
                <li>
                  Build canonical signing payload with stable metadata field order, uppercase hash, sorted
                  image IDs, and sorted confirmation entries.
                </li>
                <li>
                  Verify signature over UTF-8 bytes of the canonical payload using RSA PKCS#1 v1.5 + SHA-256.
                </li>
              </ol>
              <p className={styles.howToNote}>
                Use the platform-specific script buttons below to run this workflow.
              </p>
            </div>
          </details>

          <details className={styles.howToSection}>
            <summary className={styles.howToSectionSummary}>Windows PowerShell verifier</summary>
            <div className={styles.howToSectionBody}>
              <p className={styles.howToNote}>
                Use this option to validate case ZIP or confirmation exports with PowerShell plus OpenSSL.
              </p>
              <button
                type="button"
                className={styles.templateButton}
                onClick={handleCopyPowerShellTemplate}
                disabled={isCopyingPowerShellTemplate}
              >
                {isCopyingPowerShellTemplate ? 'Copying...' : 'Copy PowerShell Verifier Script'}
              </button>
              <p className={styles.commandExample}>
                Case:
                {' '}
                <code className={styles.commandCode}>
                  {POWER_SHELL_COMMAND_EXAMPLES.case}
                </code>
              </p>
              <p className={styles.commandExample}>
                Confirmation:
                {' '}
                <code className={styles.commandCode}>
                  {POWER_SHELL_COMMAND_EXAMPLES.confirmation}
                </code>
              </p>
            </div>
          </details>

          <details className={styles.howToSection}>
            <summary className={styles.howToSectionSummary}>Apple / Linux verifier</summary>
            <div className={styles.howToSectionBody}>
              <p className={styles.howToNote}>
                Use this option to validate exports with Python 3 plus OpenSSL on macOS or Linux.
              </p>
              <button
                type="button"
                className={styles.templateButton}
                onClick={handleCopyAppleTemplate}
                disabled={isCopyingAppleTemplate}
              >
                {isCopyingAppleTemplate ? 'Copying...' : 'Copy Apple/Linux Verifier Script'}
              </button>
              <p className={styles.commandExample}>
                Case:
                {' '}
                <code className={styles.commandCode}>
                  {APPLE_COMMAND_EXAMPLES.case}
                </code>
              </p>
              <p className={styles.commandExample}>
                Confirmation:
                {' '}
                <code className={styles.commandCode}>
                  {APPLE_COMMAND_EXAMPLES.confirmation}
                </code>
              </p>
            </div>
          </details>

          <p className={styles.passFailNote}>
            Result rule: trust the export only when signature verification and integrity checks both PASS.
          </p>

          {statusMessage && (
            <p className={styles.status} role="status" aria-live="polite">
              {statusMessage}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.copyButton}
              onClick={handleCopyPublicKey}
              disabled={isCopyingPublicKey || !publicKeyPem}
            >
              {isCopyingPublicKey ? 'Copying...' : 'Copy Key'}
            </button>
            <button
              type="button"
              className={styles.closeModalButton}
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