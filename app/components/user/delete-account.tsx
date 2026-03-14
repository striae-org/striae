import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '~/services/firebase';
import { auditService } from '~/services/audit.service';
import styles from './delete-account.module.css';

interface DeletionProgress {
  totalCases: number;
  completedCases: number;
  currentCaseNumber: string;
  percent: number;
}

const initialDeletionProgress: DeletionProgress = {
  totalCases: 0,
  completedCases: 0,
  currentCaseNumber: '',
  percent: 0
};

interface DeleteAccountProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
  };
  company: string;
}

export const DeleteAccount = ({ isOpen, onClose, user, company }: DeleteAccountProps) => {
  const [uidConfirmation, setUidConfirmation] = useState('');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<DeletionProgress>(initialDeletionProgress);

  // Extract first and last name from display name
  const [firstName, lastName] = (user.displayName || '').split(' ');
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();

  // Check if confirmations match user data
  const isConfirmationValid = uidConfirmation === user.uid && emailConfirmation === user.email;

  const scheduleLogout = () => {
    setTimeout(async () => {
      try {
        await signOut(auth);
        onClose();
      } catch (logoutError) {
        console.error('Error during logout:', logoutError);
        onClose();
      }
    }, 3000);
  };

  const updateProgress = (totalCases: number, completedCases: number, currentCaseNumber = '', forceComplete = false) => {
    const safeTotal = totalCases > 0 ? totalCases : 0;
    const safeCompleted = completedCases > safeTotal ? safeTotal : completedCases;
    const percent = safeTotal > 0
      ? Math.round((safeCompleted / safeTotal) * 100)
      : (forceComplete ? 100 : 0);

    setDeletionProgress({
      totalCases: safeTotal,
      completedCases: safeCompleted,
      currentCaseNumber,
      percent
    });
  };

  const handleProgressStream = async (response: Response) => {
    if (!response.body) {
      throw new Error('No progress stream available from account deletion service.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamError = '';
    let streamCompleted = false;
    let latestTotalCases = 0;
    let latestCompletedCases = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let eventBoundary = buffer.indexOf('\n\n');
      while (eventBoundary !== -1) {
        const rawEvent = buffer.slice(0, eventBoundary);
        buffer = buffer.slice(eventBoundary + 2);

        const lines = rawEvent.split('\n');
        const eventTypeLine = lines.find((line) => line.startsWith('event:'));
        const dataLine = lines.find((line) => line.startsWith('data:'));

        if (eventTypeLine && dataLine) {
          const eventType = eventTypeLine.replace('event:', '').trim();

          try {
            const data = JSON.parse(dataLine.replace('data:', '').trim()) as {
              totalCases?: number;
              completedCases?: number;
              currentCaseNumber?: string;
              success?: boolean;
              message?: string;
            };

            if (eventType === 'start') {
              latestTotalCases = data.totalCases ?? 0;
              latestCompletedCases = data.completedCases ?? 0;
              updateProgress(latestTotalCases, latestCompletedCases, '');
            }

            if (eventType === 'case-start') {
              latestTotalCases = data.totalCases ?? latestTotalCases;
              latestCompletedCases = data.completedCases ?? latestCompletedCases;
              updateProgress(
                latestTotalCases,
                latestCompletedCases,
                data.currentCaseNumber ?? ''
              );
            }

            if (eventType === 'case-complete') {
              latestTotalCases = data.totalCases ?? latestTotalCases;
              latestCompletedCases = data.completedCases ?? latestCompletedCases;
              updateProgress(
                latestTotalCases,
                latestCompletedCases,
                data.currentCaseNumber ?? ''
              );
            }

            if (eventType === 'complete') {
              latestTotalCases = data.totalCases ?? latestTotalCases;
              latestCompletedCases = data.completedCases ?? latestCompletedCases;
              streamCompleted = data.success === true;
              updateProgress(latestTotalCases, latestCompletedCases, '', streamCompleted && latestTotalCases === 0);
              if (!streamCompleted) {
                streamError = data.message || 'Account deletion failed.';
              }
            }

            if (eventType === 'error') {
              streamError = data.message || 'Account deletion failed.';
            }
          } catch {
            streamError = 'Failed to parse account deletion progress.';
          }
        }

        eventBoundary = buffer.indexOf('\n\n');
      }
    }

    if (streamError) {
      throw new Error(streamError);
    }

    if (!streamCompleted) {
      throw new Error('Account deletion did not complete successfully.');
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Reset form when modal opens
      setUidConfirmation('');
      setEmailConfirmation('');
      setError('');
      setSuccess(false);
      setDeletionProgress(initialDeletionProgress);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleDeleteAccount = async () => {
    if (!isConfirmationValid) return;
    
    // Additional confirmation dialog similar to case-sidebar patterns
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete your Striae account? This action cannot be undone and will delete all your data, cases, and files. Your email address will be permanently disabled.`
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    setError('');
    updateProgress(0, 0, '');
    
    try {
      // Log account deletion attempt
      await auditService.logAccountDeletionSimple(
        user.uid,
        user.email || '',
        'pending',
        'user-requested',
        'uid-email',
        undefined, // casesCount - to be filled after deletion
        undefined, // filesCount - to be filled after deletion
        undefined, // dataRetentionPeriod
        false // emailNotificationSent - deletion emails disabled
      );

      const idToken = await auth.currentUser?.getIdToken();

      if (!idToken) {
        throw new Error('Unable to verify account session for deletion request');
      }
      
      // Delete the user account via user-worker
      const deleteResponse = await fetch(`/api/user/${encodeURIComponent(user.uid)}?stream=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'text/event-stream'
        }
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({})) as { message?: string };
        throw new Error(errorData.message || 'Failed to delete account');
      }

      const contentType = deleteResponse.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        await handleProgressStream(deleteResponse);

        // Log successful account deletion
        await auditService.logAccountDeletionSimple(
          user.uid,
          user.email || '',
          'success',
          'user-requested',
          'uid-email',
          undefined, // casesCount - not available from response
          undefined, // filesCount - not available from response
          undefined, // dataRetentionPeriod
          false // emailNotificationSent - deletion emails disabled
        );

        setSuccess(true);
        scheduleLogout();
      } else {
        const result = await deleteResponse.json() as { success: boolean; message?: string };
        if (result.success) {
          updateProgress(1, 1, '');

          await auditService.logAccountDeletionSimple(
            user.uid,
            user.email || '',
            'success',
            'user-requested',
            'uid-email',
            undefined,
            undefined,
            undefined,
            false
          );

          setSuccess(true);
          scheduleLogout();
        } else {
          throw new Error(result.message || 'Account deletion failed');
        }
      }
      
    } catch (err) {
      // Log failed account deletion
      await auditService.logAccountDeletionSimple(
        user.uid,
        user.email || '',
        'failure',
        'user-requested',
        'uid-email',
        undefined, // casesCount
        undefined, // filesCount
        undefined, // dataRetentionPeriod
        false, // emailNotificationSent
        undefined, // sessionId
        [err instanceof Error ? err.message : 'Unknown error during account deletion']
      );

      console.error('Delete account error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const showProgress = isDeleting || success || (Boolean(error) && deletionProgress.totalCases > 0);
  const progressStatus = success
    ? 'All cases have been deleted.'
    : error
      ? (deletionProgress.currentCaseNumber
          ? `Deletion stopped while processing case ${deletionProgress.currentCaseNumber}.`
          : 'Deletion stopped before completion.')
      : (deletionProgress.currentCaseNumber
          ? `Deleting case ${deletionProgress.currentCaseNumber}...`
          : 'Preparing account deletion...');

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div 
      className={styles.modalOverlay} 
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Close delete account dialog"
    >
      <div 
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <header className={styles.modalHeader}>
          <h1 id="modal-title" className={styles.dangerTitle}>Delete Striae Account</h1>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
            aria-label="Close modal"
          >
            &times;
          </button>
        </header>

        <div className={styles.modalContent}>
          {/* User Information */}
          <div className={styles.userInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>UID:</span>
              <span className={styles.value}>{user.uid}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Name:</span>
              <span className={styles.value}>{fullName || 'Not provided'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Email:</span>
              <span className={styles.value}>{user.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Lab/Company:</span>
              <span className={styles.value}>{company || 'Not provided'}</span>
            </div>
          </div>

          {/* Divider */}
          <div className={styles.divider}></div>

          {/* Warning Message */}
          <div className={styles.warningSection}>
            <p className={styles.warningText}>
              {isDeleting 
                ? 'Deleting your account now. If you have a lot of data, this may take a while...'
                : <>
                    Deleting your account is irreversible! All account information and data will be deleted from Striae. The email address associated with this account will be permanently disabled. <strong><em>Please be certain you want to take this action!</em></strong>
                  </>
              }
            </p>
          </div>

          {/* Divider */}
          <div className={styles.divider}></div>

          {showProgress && (
            <div className={styles.progressSection} aria-live="polite">
              <div className={styles.progressHeader}>
                <p className={styles.progressTitle}>Deletion Progress</p>
                <p className={styles.progressMeta}>
                  {deletionProgress.completedCases}/{deletionProgress.totalCases} cases
                </p>
              </div>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label="Account deletion progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={deletionProgress.percent}
              >
                <div
                  className={styles.progressFill}
                  style={{ width: `${deletionProgress.percent}%` }}
                />
              </div>
              <p className={styles.progressStatus}>{progressStatus}</p>
            </div>
          )}

          {/* Success/Error Messages */}
          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className={styles.successMessage}>
              <p>✓ Account deletion successful!</p>
              <p>You will be logged out automatically in 3 seconds...</p>
            </div>
          )}

          {/* Confirmation Form */}
          {!success && (
            <form className={styles.confirmationForm}>
            <div className={styles.formGroup}>
              <label htmlFor="uid-confirmation" className={styles.formLabel}>
                Enter UID to confirm account deletion:
              </label>
              <input
                id="uid-confirmation"
                type="text"
                value={uidConfirmation}
                onChange={(e) => setUidConfirmation(e.target.value)}
                className={styles.confirmationInput}
                placeholder="Enter your User ID"
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email-confirmation" className={styles.formLabel}>
                Enter your email address to confirm account deletion:
              </label>
              <input
                id="email-confirmation"
                type="email"
                value={emailConfirmation}
                onChange={(e) => setEmailConfirmation(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                className={styles.confirmationInput}
                placeholder="Enter your email address"
                autoComplete="off"
              />
            </div>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className={styles.deleteButton}
              disabled={!isConfirmationValid || isDeleting}
            >
              {isDeleting ? 'Deleting Account...' : 'Delete Striae Account'}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};
