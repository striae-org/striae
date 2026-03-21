import { useState, useEffect, useContext, useRef } from 'react';
import { type ConfirmationData } from '~/types/annotations';
import { AuthContext } from '~/contexts/auth.context';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import { generateConfirmationId } from '~/utils/common';
import styles from './confirmation.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (confirmationData: ConfirmationData) => void;
  company?: string;
  defaultBadgeId?: string;
  existingConfirmation?: ConfirmationData | null;
}

// Format current date and time in readable format
const formatTimestamp = (): string => {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, company, defaultBadgeId, existingConfirmation }: ConfirmationModalProps) => {
  const { user } = useContext(AuthContext);
  const [badgeId, setBadgeId] = useState('');
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const wasOpenRef = useRef(false);
  
  const fullName = user?.displayName || user?.email || 'Unknown User';
  const userEmail = user?.email || 'No email available';
  const labCompany = company || 'Not specified';
  const timestamp = formatTimestamp();
  const confirmationId = generateConfirmationId();

  const {
    requestClose,
    overlayProps,
    getCloseButtonProps
  } = useOverlayDismiss({
    isOpen,
    onClose
  });

  // Check if this is an existing confirmation
  const hasExistingConfirmation = !!existingConfirmation;

  // Reset form when modal opens
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (justOpened) {
      if (existingConfirmation) {
        setBadgeId(existingConfirmation.badgeId);
      } else {
        setBadgeId(defaultBadgeId || '');
      }
      setError('');
      setIsConfirming(false);
    }
  }, [isOpen, defaultBadgeId, existingConfirmation]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!badgeId.trim()) {
      setError('Badge/ID is required');
      return;
    }

    setIsConfirming(true);
    setError('');

    try {
      const confirmationData: ConfirmationData = {
        fullName,
        badgeId: badgeId.trim(),
        timestamp,
        confirmationId,
        confirmedBy: user?.uid || '',
        confirmedByEmail: user?.email || '',
        confirmedByCompany: labCompany,
        confirmedAt: new Date().toISOString()
      };

      onConfirm?.(confirmationData);
      onClose();
    } catch (error) {
      console.error('Confirmation failed:', error);
      setError('Confirmation failed. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      aria-label="Close confirmation dialog"
      {...overlayProps}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {hasExistingConfirmation ? 'Confirmation Details' : 'Confirm Identification'}
          </h2>
          <button {...getCloseButtonProps({ ariaLabel: 'Close confirmation dialog' })}>
            ×
          </button>
        </div>
        
        {hasExistingConfirmation && (
          <div className={styles.existingConfirmationBanner}>
            ✓ This image has already been confirmed
          </div>
        )}
        
        <div className={styles.content}>
          <div className={styles.fieldGroup}>
            <div className={styles.field}>
              <span className={styles.label}>Name:</span>
              <div className={styles.readOnlyValue}>
                {hasExistingConfirmation ? existingConfirmation.fullName : fullName}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="badgeId">Badge/ID: *</label>
              <input
                id="badgeId"
                type="text"
                className={styles.input}
                value={badgeId}
                onChange={(e) => {
                  setBadgeId(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your badge or ID number"
                disabled={isConfirming || hasExistingConfirmation}
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Email:</span>
              <div className={styles.readOnlyValue}>
                {hasExistingConfirmation ? existingConfirmation.confirmedByEmail : userEmail}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Lab/Company:</span>
              <div className={styles.readOnlyValue}>
                {hasExistingConfirmation ? existingConfirmation.confirmedByCompany : labCompany}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Timestamp:</span>
              <div className={styles.readOnlyValue}>
                {hasExistingConfirmation ? existingConfirmation.timestamp : timestamp}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Confirmation ID:</span>
              <div className={styles.readOnlyValue}>
                {hasExistingConfirmation ? existingConfirmation.confirmationId : confirmationId}
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={requestClose}
            disabled={isConfirming}
          >
            {hasExistingConfirmation ? 'Close' : 'Cancel'}
          </button>
          {!hasExistingConfirmation && (
            <button
              className={styles.confirmButton}
              onClick={handleConfirm}
              disabled={isConfirming || !badgeId.trim()}
            >
              {isConfirming ? 'Confirming...' : 'Confirm'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
