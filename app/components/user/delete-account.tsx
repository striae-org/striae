import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '~/services/firebase';
import paths from '~/config/config.json';
import { getUserApiKey } from '~/utils/auth';
import styles from './delete-account.module.css';

interface DeleteAccountProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
  };
  company: string;
  permitted: boolean;
}

export const DeleteAccount = ({ isOpen, onClose, user, company, permitted }: DeleteAccountProps) => {
  const [uidConfirmation, setUidConfirmation] = useState('');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Extract first and last name from display name
  const [firstName, lastName] = (user.displayName || '').split(' ');
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();

  // Check if confirmations match user data
  const isConfirmationValid = uidConfirmation === user.uid && emailConfirmation === user.email;

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
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleDeleteAccount = async () => {
    if (!isConfirmationValid) return;
    
    setIsDeleting(true);
    setError('');
    
    try {
      // Get API key for user-worker authentication
      const apiKey = await getUserApiKey();
      
      // Delete the user account via user-worker (includes email sending)
      const deleteResponse = await fetch(`${paths.user_worker_url}/${user.uid}`, {
        method: 'DELETE',
        headers: {
          'X-Custom-Auth-Key': apiKey
        }
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({})) as { message?: string };
        throw new Error(errorData.message || 'Failed to delete account');
      }

      const result = await deleteResponse.json() as { success: boolean; message?: string };
      
      if (result.success) {
        setSuccess(true);
        
        // Log out user and close modal after 3 seconds
        setTimeout(async () => {
          try {
            await signOut(auth);
            onClose();
          } catch (logoutError) {
            console.error('Error during logout:', logoutError);
            // Still close the modal even if logout fails
            onClose();
          }
        }, 3000);
      } else {
        throw new Error(result.message || 'Account deletion failed');
      }
      
    } catch (err) {
      console.error('Delete account error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalOverlay} 
      onClick={onClose}
      role="presentation"
    >
      <div 
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
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

          {/* Warning Message - Conditional based on account type */}
          <div className={styles.warningSection}>
            {permitted ? (
              <p className={styles.warningText}>
                {isDeleting 
                  ? 'Deleting your account now. If you have a lot of data, this may take a while...'
                  : <>
                      Deleting your account is irreversible! All account information and data will be deleted from Striae. The email address associated with this account will be permanently disabled. <strong><em>Please be certain you want to take this action!</em></strong>
                    </>
                }
              </p>
            ) : (
              <p className={styles.warningText}>
                <strong>Demo Account Deletion Disabled:</strong> Demo accounts cannot be deleted. This restriction helps protect shared demo credentials and ensures demo functionality remains available for evaluation purposes.
              </p>
            )}
          </div>

          {/* Divider */}
          <div className={styles.divider}></div>

          {/* Success/Error Messages */}
          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className={styles.successMessage}>
              <p>✓ Account deletion successful! Confirmation emails have been sent.</p>
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
                disabled={!permitted}
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
                disabled={!permitted}
              />
            </div>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className={styles.deleteButton}
              disabled={!permitted || !isConfirmationValid || isDeleting}
            >
              {!permitted 
                ? 'Demo Account Deletion Disabled' 
                : isDeleting 
                  ? 'Deleting Account...' 
                  : 'Delete Striae Account'}
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};
