import { useState, useEffect, useContext } from 'react';
import { ConfirmationData } from '~/types/annotations';
import { AuthContext } from '~/contexts/auth.context';
import { generateConfirmationId } from '~/utils/id-generator';
import styles from './confirmation.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (confirmationData: ConfirmationData) => void;
  company?: string;
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

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, company, existingConfirmation }: ConfirmationModalProps) => {
  const { user } = useContext(AuthContext);
  const [badgeId, setBadgeId] = useState('');
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  
  const fullName = user?.displayName || user?.email || 'Unknown User';
  const userEmail = user?.email || 'No email available';
  const labCompany = company || 'Not specified';
  const timestamp = formatTimestamp();
  const confirmationId = generateConfirmationId();

  // Check if this is an existing confirmation
  const hasExistingConfirmation = !!existingConfirmation;

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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingConfirmation) {
        setBadgeId(existingConfirmation.badgeId);
      } else {
        setBadgeId('');
      }
      setError('');
      setIsConfirming(false);
    }
  }, [isOpen, existingConfirmation]);

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

  return (
    <div
      className={styles.overlay}
      onMouseDown={handleOverlayMouseDown}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close confirmation dialog"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {hasExistingConfirmation ? 'Confirmation Details' : 'Confirm Identification'}
          </h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
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
            onClick={onClose}
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
