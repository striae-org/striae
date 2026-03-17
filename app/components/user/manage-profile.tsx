import { useState, useContext, useEffect, useCallback } from 'react';
import { updateProfile } from 'firebase/auth';
import { PasswordReset } from '~/routes/auth/passwordReset';
import { DeleteAccount } from './delete-account';
import { UserAuditViewer } from '../audit/user-audit-viewer';
import { AuthContext } from '~/contexts/auth.context';
import { getUserData, updateUserData } from '~/utils/data';
import { auditService } from '~/services/audit';
import { handleAuthError, ERROR_MESSAGES } from '~/services/firebase/errors';
import { FormField, FormButton, FormMessage } from '../form';
import { MfaPhoneUpdateSection } from './mfa-phone-update';
import styles from './manage-profile.module.css';

interface ManageProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageProfile = ({ isOpen, onClose }: ManageProfileProps) => {
  const { user } = useContext(AuthContext);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMfaBusy, setIsMfaBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAuditViewer, setShowAuditViewer] = useState(false);
  const isCloseBlocked = isMfaBusy || isLoading;

  const handleMfaBusyChange = useCallback((isBusy: boolean) => {
    setIsMfaBusy(isBusy);
  }, []);

  const handleCloseRequest = () => {
    if (isCloseBlocked) {
      return;
    }

    onClose();
  };

  useEffect(() => {
    if (isOpen && user) {
      const loadUserData = async () => {
        try {
          const userData = await getUserData(user);

          if (userData) {
            setCompany(userData.company || '');
            setEmail(userData.email || '');
          }
        } catch (err) {
          console.error('Failed to load user data:', err);
        }
      };

      void loadUserData();
    }
  }, [isOpen, user]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isCloseBlocked) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isCloseBlocked, onClose]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    const oldDisplayName = user?.displayName || '';

    try {
      if (!user) throw new Error(ERROR_MESSAGES.NO_USER);

      await updateProfile(user, {
        displayName,
      });

      const [firstName, lastName] = displayName.split(' ');

      await updateUserData(user, {
        email: user.email,
        firstName: firstName || '',
        lastName: lastName || '',
      });

      await auditService.logUserProfileUpdate(
        user,
        'displayName',
        oldDisplayName,
        displayName,
        'success'
      );

      setSuccess(ERROR_MESSAGES.PROFILE_UPDATED);
    } catch (err) {
      const { message } = handleAuthError(err);

      await auditService.logUserProfileUpdate(
        user!,
        'displayName',
        oldDisplayName,
        displayName,
        'failure',
        undefined,
        [message]
      );

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteModal(true);
  };

  if (!isOpen) return null;

  if (showAuditViewer) {
    return <UserAuditViewer isOpen={showAuditViewer} onClose={() => setShowAuditViewer(false)} />;
  }

  if (showResetForm) {
    return <PasswordReset isModal={true} onBack={() => setShowResetForm(false)} />;
  }

  if (showDeleteModal && user) {
    return (
      <DeleteAccount
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        user={{
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        }}
        company={company}
      />
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={handleCloseRequest} role="presentation">
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h1 id="modal-title">Manage Profile</h1>
          <button
            onClick={handleCloseRequest}
            className={styles.closeButton}
            aria-label="Close modal"
            disabled={isCloseBlocked}
          >
            &times;
          </button>
        </header>

        <form onSubmit={handleUpdateProfile} className={styles.form}>
          <FormField
            label="Display Name"
            component="input"
            type="text"
            name="displayName"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            required
          />

          <div className={styles.formGroup}>
            <label htmlFor="company">Lab/Company Name</label>
            <input
              id="company"
              type="text"
              value={company}
              disabled
              readOnly
              className={styles.input}
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
            />
            <p className={styles.helpText}>
              Company name can only be changed by an administrator. Contact support if changes are needed.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              readOnly
              className={styles.input}
              autoComplete="email"
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
            />
            <p className={styles.helpText}>
              Email address cannot be changed for security reasons. Contact support if changes are needed.
            </p>
          </div>

          <MfaPhoneUpdateSection user={user} isOpen={isOpen} onBusyChange={handleMfaBusyChange} />

          {error && <FormMessage type="error" message={error} />}
          {success && <FormMessage type="success" message={success} />}

          <div className={styles.buttonGroup}>
            <FormButton variant="primary" type="submit" isLoading={isLoading} loadingText="Updating...">
              Update Profile
            </FormButton>
            <FormButton variant="audit" type="button" onClick={() => setShowAuditViewer(true)}>
              View My Audit Trail
            </FormButton>
            <FormButton variant="secondary" type="button" onClick={() => setShowResetForm(true)}>
              Reset Password
            </FormButton>
          </div>
          <button type="button" onClick={handleDeleteAccountClick} className={styles.deleteButton}>
            Delete Striae Account
          </button>
        </form>
      </div>
    </div>
  );
};
