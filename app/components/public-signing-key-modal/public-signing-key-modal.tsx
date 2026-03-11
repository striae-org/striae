import { useEffect, useId, useState, type KeyboardEvent, type MouseEvent } from 'react';
import styles from './public-signing-key-modal.module.css';

const NO_PUBLIC_KEY_MESSAGE = 'No public signing key is configured for this environment.';

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
  const [publicKeyCopyMessage, setPublicKeyCopyMessage] = useState('');
  const publicSigningKeyTitleId = useId();
  const publicSigningKeyFieldId = useId();

  useEffect(() => {
    if (!isOpen) {
      setIsCopyingPublicKey(false);
      setPublicKeyCopyMessage('');
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
      setPublicKeyCopyMessage(NO_PUBLIC_KEY_MESSAGE);
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
          <ol className={styles.howToList}>
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
            <p className={styles.status} role="status" aria-live="polite">
              {publicKeyCopyMessage}
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