import { useState, useContext, useEffect, useCallback } from 'react';
import {
  EmailAuthProvider,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  multiFactor,
  reauthenticateWithCredential,
  type MultiFactorError,
  type MultiFactorInfo,
  type MultiFactorResolver,
  type User,
  updateProfile,
} from 'firebase/auth';
import { PasswordReset } from '~/routes/auth/passwordReset';
import { DeleteAccount } from './delete-account';
import { UserAuditViewer } from '../audit/user-audit-viewer';
import { AuthContext } from '~/contexts/auth.context';
import { getUserData, updateUserData } from '~/utils/permissions';
import { auditService } from '~/services/audit.service';
import { auth } from '~/services/firebase';
import { handleAuthError, ERROR_MESSAGES, getValidationError } from '~/services/firebase-errors';
import { FormField, FormButton, FormMessage } from '../form';
import styles from './manage-profile.module.css';

const MFA_RECAPTCHA_CONTAINER_ID = 'recaptcha-container-manage-profile';

const formatPhoneNumberForMfa = (phone: string): string => {
  const trimmedPhone = phone.trim();
  if (trimmedPhone.startsWith('+')) {
    return `+${trimmedPhone.slice(1).replace(/\D/g, '')}`;
  }

  const digitsOnly = trimmedPhone.replace(/\D/g, '');
  if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
    return `+${digitsOnly}`;
  }

  return `+1${digitsOnly}`;
};

const maskPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '***-***-****';
  }

  return `***-***-${digits.slice(-4)}`;
};

const getPhoneDisplayValue = (factor: MultiFactorInfo): string => {
  const displayName = factor.displayName ?? '';
  if (displayName.toLowerCase().startsWith('phone:')) {
    return displayName.slice('phone:'.length).trim();
  }

  return displayName;
};

const getMaskedFactorDisplay = (factor: MultiFactorInfo | null): string => {
  if (!factor) {
    return 'your enrolled phone';
  }

  const phoneDisplayValue = getPhoneDisplayValue(factor);
  if (!phoneDisplayValue) {
    return 'your enrolled phone';
  }

  return maskPhoneNumber(phoneDisplayValue);
};

const validatePhoneNumber = (phone: string): { isValid: boolean; errorMessage?: string } => {
  if (!phone.trim()) {
    return { isValid: false, errorMessage: getValidationError('MFA_INVALID_PHONE') };
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone === '15551234567' || cleanPhone === '5551234567') {
    return {
      isValid: false,
      errorMessage: 'Please enter your actual phone number, not the demo number.',
    };
  }

  if (cleanPhone.length < 7 || cleanPhone.length > 15) {
    return { isValid: false, errorMessage: 'Phone number must be between 7-15 digits.' };
  }

  if (phone.startsWith('+1') || (!phone.startsWith('+') && cleanPhone.length === 10)) {
    const usPhone = cleanPhone.startsWith('1') ? cleanPhone.slice(1) : cleanPhone;
    if (usPhone.length !== 10) {
      return { isValid: false, errorMessage: 'US/Canada phone numbers must be 10 digits.' };
    }

    if (usPhone[0] === '0' || usPhone[0] === '1') {
      return {
        isValid: false,
        errorMessage: 'Invalid area code. Area codes cannot start with 0 or 1.',
      };
    }

    if (usPhone[3] === '0' || usPhone[3] === '1') {
      return { isValid: false, errorMessage: 'Invalid phone number format.' };
    }
  }

  if (phone.startsWith('+') && cleanPhone.length < 8) {
    return {
      isValid: false,
      errorMessage: 'International phone numbers must have at least 8 digits including country code.',
    };
  }

  return { isValid: true };
};

interface ManageProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageProfile = ({ isOpen, onClose }: ManageProfileProps) => {
  const { user } = useContext(AuthContext);  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [permitted, setPermitted] = useState(false); // Default to false for safety - will be updated after data loads
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaPhoneInput, setMfaPhoneInput] = useState('');
  const [currentMfaPhone, setCurrentMfaPhone] = useState('Not configured');
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [mfaVerificationId, setMfaVerificationId] = useState('');
  const [isMfaCodeSent, setIsMfaCodeSent] = useState(false);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [mfaResendTimer, setMfaResendTimer] = useState(0);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [showMfaReauthPrompt, setShowMfaReauthPrompt] = useState(false);
  const [mfaReauthPassword, setMfaReauthPassword] = useState('');
  const [mfaReauthResolver, setMfaReauthResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaReauthHint, setMfaReauthHint] = useState<MultiFactorInfo | null>(null);
  const [mfaReauthVerificationId, setMfaReauthVerificationId] = useState('');
  const [mfaReauthVerificationCode, setMfaReauthVerificationCode] = useState('');
  const [isMfaReauthCodeSent, setIsMfaReauthCodeSent] = useState(false);
  const [isMfaReauthLoading, setIsMfaReauthLoading] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAuditViewer, setShowAuditViewer] = useState(false);
  const isCloseBlocked = isMfaLoading || isLoading || isMfaReauthLoading;

  const resetMfaReauthFlow = useCallback(() => {
    setShowMfaReauthPrompt(false);
    setMfaReauthPassword('');
    setMfaReauthResolver(null);
    setMfaReauthHint(null);
    setMfaReauthVerificationId('');
    setMfaReauthVerificationCode('');
    setIsMfaReauthCodeSent(false);
  }, []);

  const handleCloseRequest = () => {
    if (isCloseBlocked) {
      return;
    }

    onClose();
  };

  const refreshCurrentMfaPhone = useCallback(async (currentUser: User) => {
    await currentUser.reload();

    const phoneFactors = multiFactor(currentUser).enrolledFactors.filter(
      (factor) => factor.factorId === PhoneMultiFactorGenerator.FACTOR_ID
    );

    if (phoneFactors.length === 0) {
      setCurrentMfaPhone('Not configured');
      return;
    }

    const latestFactor = phoneFactors[phoneFactors.length - 1];
    const phoneDisplayValue = getPhoneDisplayValue(latestFactor);
    if (!phoneDisplayValue) {
      setCurrentMfaPhone('Configured');
      return;
    }

    setCurrentMfaPhone(maskPhoneNumber(phoneDisplayValue));
  }, []);

  const handleResetMfaChange = () => {
    setIsMfaCodeSent(false);
    setMfaVerificationCode('');
    setMfaVerificationId('');
    setMfaError('');
    setMfaSuccess('');
    setMfaResendTimer(0);
    resetMfaReauthFlow();
  };

  const handleCancelMfaReauth = () => {
    resetMfaReauthFlow();
    setMfaError('');
  };

  const handleSendMfaVerificationCode = async () => {
    if (!user) {
      setMfaError(ERROR_MESSAGES.NO_USER);
      return;
    }

    const validation = validatePhoneNumber(mfaPhoneInput);
    if (!validation.isValid) {
      setMfaError(validation.errorMessage || getValidationError('MFA_INVALID_PHONE'));
      setMfaSuccess('');
      return;
    }

    if (!recaptchaVerifier) {
      setMfaError(getValidationError('MFA_RECAPTCHA_ERROR'));
      setMfaSuccess('');
      return;
    }

    setIsMfaLoading(true);
    setMfaError('');
    setMfaSuccess('');

    try {
      const formattedPhone = formatPhoneNumberForMfa(mfaPhoneInput);
      const mfaSession = await multiFactor(user).getSession();
      const phoneInfoOptions = {
        phoneNumber: formattedPhone,
        session: mfaSession,
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);

      setMfaVerificationId(verificationId);
      setIsMfaCodeSent(true);
      setMfaResendTimer(60);
      resetMfaReauthFlow();
    } catch (err) {
      const { message, data } = handleAuthError(err);

      if (data?.code === 'auth/requires-recent-login') {
        const supportsPasswordReauth = user.providerData.some(
          (provider) => provider.providerId === 'password'
        );

        if (supportsPasswordReauth && user.email) {
          resetMfaReauthFlow();
          setShowMfaReauthPrompt(true);
          setMfaError('For security, confirm your password to continue.');
          return;
        }

        setMfaError('For security, please sign out and sign in again, then try this action again.');
        return;
      }

      setMfaError(message);
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleMfaReauthenticate = async () => {
    if (!user) {
      setMfaError(ERROR_MESSAGES.NO_USER);
      return;
    }

    if (!user.email) {
      setMfaError('Please sign out and sign in again to continue.');
      return;
    }

    if (!mfaReauthPassword.trim()) {
      setMfaError('Please enter your password to continue.');
      return;
    }

    setIsMfaReauthLoading(true);
    setMfaError('');

    try {
      const credential = EmailAuthProvider.credential(user.email, mfaReauthPassword);
      await reauthenticateWithCredential(user, credential);

      resetMfaReauthFlow();

      await handleSendMfaVerificationCode();
    } catch (err) {
      const { message, data } = handleAuthError(err);

      if (data?.code === 'auth/multi-factor-auth-required') {
        if (!recaptchaVerifier) {
          setMfaError(getValidationError('MFA_RECAPTCHA_ERROR'));
          return;
        }

        const resolver = getMultiFactorResolver(auth, err as MultiFactorError);
        const phoneHint = resolver.hints.find(
          (hint) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID
        );

        if (!phoneHint) {
          setMfaError('This account requires a non-phone MFA method. Please sign out and sign in again.');
          return;
        }

        setShowMfaReauthPrompt(true);
        setMfaReauthResolver(resolver);
        setMfaReauthHint(phoneHint);
        setMfaReauthVerificationId('');
        setMfaReauthVerificationCode('');
        setIsMfaReauthCodeSent(false);
        setMfaError('Password accepted. Complete MFA verification to continue.');
        return;
      }

      setMfaError(message);
    } finally {
      setIsMfaReauthLoading(false);
    }
  };

  const handleSendMfaReauthVerificationCode = async () => {
    if (!mfaReauthResolver || !mfaReauthHint) {
      setMfaError('Please confirm your password again to continue.');
      return;
    }

    if (!recaptchaVerifier) {
      setMfaError(getValidationError('MFA_RECAPTCHA_ERROR'));
      return;
    }

    setIsMfaReauthLoading(true);
    setMfaError('');

    try {
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const phoneInfoOptions = {
        multiFactorHint: mfaReauthHint,
        session: mfaReauthResolver.session,
      };

      const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
      setMfaReauthVerificationId(verificationId);
      setMfaReauthVerificationCode('');
      setIsMfaReauthCodeSent(true);
    } catch (err) {
      const { message } = handleAuthError(err);
      setMfaError(message);
    } finally {
      setIsMfaReauthLoading(false);
    }
  };

  const handleVerifyMfaReauthCode = async () => {
    if (!mfaReauthResolver) {
      setMfaError('Please confirm your password again to continue.');
      return;
    }

    if (!mfaReauthVerificationId) {
      setMfaError(getValidationError('MFA_NO_VERIFICATION_ID'));
      return;
    }

    if (!mfaReauthVerificationCode.trim()) {
      setMfaError(getValidationError('MFA_CODE_REQUIRED'));
      return;
    }

    setIsMfaReauthLoading(true);
    setMfaError('');

    try {
      const credential = PhoneAuthProvider.credential(
        mfaReauthVerificationId,
        mfaReauthVerificationCode.trim()
      );
      const assertion = PhoneMultiFactorGenerator.assertion(credential);
      await mfaReauthResolver.resolveSignIn(assertion);

      resetMfaReauthFlow();
      await handleSendMfaVerificationCode();
    } catch (err) {
      const { message, data } = handleAuthError(err);
      let errorMessage = message;

      if (data?.code === 'auth/invalid-verification-code') {
        errorMessage = getValidationError('MFA_INVALID_CODE');
      } else if (data?.code === 'auth/code-expired') {
        errorMessage = getValidationError('MFA_CODE_EXPIRED');
        setIsMfaReauthCodeSent(false);
        setMfaReauthVerificationId('');
        setMfaReauthVerificationCode('');
      }

      setMfaError(errorMessage);
    } finally {
      setIsMfaReauthLoading(false);
    }
  };

  const handleUpdateMfaPhoneNumber = async () => {
    if (!user) {
      setMfaError(ERROR_MESSAGES.NO_USER);
      return;
    }

    if (!mfaVerificationId) {
      setMfaError(getValidationError('MFA_NO_VERIFICATION_ID'));
      return;
    }

    if (!mfaVerificationCode.trim()) {
      setMfaError(getValidationError('MFA_CODE_REQUIRED'));
      return;
    }

    const formattedPhone = formatPhoneNumberForMfa(mfaPhoneInput);
    const existingPhoneFactorUids = multiFactor(user).enrolledFactors
      .filter((factor) => factor.factorId === PhoneMultiFactorGenerator.FACTOR_ID)
      .map((factor) => factor.uid);

    setIsMfaLoading(true);
    setMfaError('');
    setMfaSuccess('');

    try {
      const credential = PhoneAuthProvider.credential(mfaVerificationId, mfaVerificationCode.trim());
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);

      await multiFactor(user).enroll(multiFactorAssertion, `Phone: ${formattedPhone}`);

      for (const factorUid of existingPhoneFactorUids) {
        await multiFactor(user).unenroll(factorUid);
      }

      await refreshCurrentMfaPhone(user);

      setMfaPhoneInput('');
      setMfaVerificationCode('');
      setMfaVerificationId('');
      setIsMfaCodeSent(false);
      setMfaResendTimer(0);
      setMfaSuccess(
        existingPhoneFactorUids.length > 0
          ? 'MFA phone number updated successfully.'
          : 'MFA phone number added successfully.'
      );

      try {
        await auditService.logMfaEnrollment(
          user,
          formattedPhone,
          'sms',
          'success',
          1,
          undefined,
          navigator.userAgent
        );
      } catch (auditError) {
        console.error('Failed to log MFA phone update success audit:', auditError);
      }
    } catch (err) {
      const { message, data } = handleAuthError(err);
      let errorMessage = message;

      if (data?.code === 'auth/invalid-verification-code') {
        errorMessage = getValidationError('MFA_INVALID_CODE');
      } else if (data?.code === 'auth/code-expired') {
        errorMessage = getValidationError('MFA_CODE_EXPIRED');
        setIsMfaCodeSent(false);
        setMfaVerificationId('');
      } else if (data?.code === 'auth/requires-recent-login') {
        const supportsPasswordReauth = user.providerData.some(
          (provider) => provider.providerId === 'password'
        );

        setIsMfaCodeSent(false);
        setMfaVerificationCode('');
        setMfaVerificationId('');

        if (supportsPasswordReauth && user.email) {
          resetMfaReauthFlow();
          setShowMfaReauthPrompt(true);
          errorMessage = 'For security, confirm your password to continue.';
        } else {
          errorMessage = 'For security, please sign out and sign in again, then try this action again.';
        }
      }

      setMfaError(errorMessage);

      try {
        await auditService.logMfaEnrollment(
          user,
          formattedPhone,
          'sms',
          'failure',
          undefined,
          undefined,
          navigator.userAgent,
          [errorMessage]
        );
      } catch (auditError) {
        console.error('Failed to log MFA phone update failure audit:', auditError);
      }
    } finally {
      setIsMfaLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      const loadUserData = async () => {
        try {
          setMfaError('');
          setMfaSuccess('');
          setIsMfaCodeSent(false);
          setMfaVerificationCode('');
          setMfaVerificationId('');
          setMfaResendTimer(0);
          resetMfaReauthFlow();

          // Use the same getUserData function as case-sidebar
          const userData = await getUserData(user);
          
          if (userData) {
            setCompany(userData.company || '');
            setEmail(userData.email || '');
            setPermitted(userData.permitted === true);
          } else {
            // Keep permitted as false if we can't load data
          }

          await refreshCurrentMfaPhone(user);
        } catch (err) {
          console.error('Failed to load user data:', err);
        }
      };
      
      void loadUserData();
    }
  }, [isOpen, user, refreshCurrentMfaPhone, resetMfaReauthFlow]);

  useEffect(() => {
    if (mfaResendTimer <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMfaResendTimer((previousTimer) => Math.max(0, previousTimer - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [mfaResendTimer]);

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    const verifier = new RecaptchaVerifier(auth, MFA_RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved automatically for invisible mode.
      },
      'expired-callback': () => {
        setMfaError(getValidationError('MFA_RECAPTCHA_EXPIRED'));
      },
    });

    setRecaptchaVerifier(verifier);

    return () => {
      verifier.clear();
      setRecaptchaVerifier(null);
    };
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
        displayName
      });

      const [firstName, lastName] = displayName.split(' ');
      
      // Use centralized updateUserData function
      await updateUserData(user, {
        email: user.email,
        firstName: firstName || '',
        lastName: lastName || '',          
      });

      // Log successful profile update
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
      
      // Log failed profile update
      await auditService.logUserProfileUpdate(
        user!,
        'displayName',
        oldDisplayName,
        displayName,
        'failure',
        undefined, // no session ID
        [message] // error details
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
    return (
      <UserAuditViewer 
        isOpen={showAuditViewer}
        onClose={() => setShowAuditViewer(false)}
      />
    );
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
          email: user.email
        }}
        company={company}
      />
    );
  }

  return (
    <div 
      className={styles.modalOverlay} 
      onClick={handleCloseRequest}
      role="presentation"
    >
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

          <div className={styles.formGroup}>
            <label htmlFor="mfaPhoneInput">Change Phone Number (MFA)</label>
            <input
              id="mfaPhoneInput"
              type="tel"
              value={mfaPhoneInput}
              onChange={(e) => {
                setMfaPhoneInput(e.target.value);
                if (mfaError) setMfaError('');
                if (mfaSuccess) setMfaSuccess('');
              }}
              className={styles.input}
              autoComplete="tel"
              placeholder="ex. +15551234567"
              disabled={isMfaLoading || isMfaReauthLoading}
            />
            <p className={styles.helpText}>Current MFA phone: {currentMfaPhone}</p>

            {showMfaReauthPrompt ? (
              <div className={styles.mfaReauthSection}>
                {!mfaReauthResolver ? (
                  <>
                    <label htmlFor="mfaReauthPassword">Confirm Password</label>
                    <p className={styles.helpText}>
                      Your session expired. Enter your password to refresh your sign-in.
                    </p>
                    <input
                      id="mfaReauthPassword"
                      type="password"
                      value={mfaReauthPassword}
                      onChange={(e) => setMfaReauthPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleMfaReauthenticate();
                        }
                      }}
                      className={styles.input}
                      autoComplete="current-password"
                      placeholder="Confirm current password"
                      disabled={isMfaReauthLoading || isMfaLoading}
                    />

                    <div className={styles.mfaButtonGroup}>
                      <FormButton
                        variant="primary"
                        type="button"
                        onClick={handleMfaReauthenticate}
                        isLoading={isMfaReauthLoading}
                        loadingText="Confirming..."
                        disabled={!mfaReauthPassword.trim()}
                      >
                        Confirm Password
                      </FormButton>

                      <FormButton
                        variant="secondary"
                        type="button"
                        onClick={handleCancelMfaReauth}
                        disabled={isMfaReauthLoading}
                      >
                        Cancel
                      </FormButton>
                    </div>
                  </>
                ) : !isMfaReauthCodeSent ? (
                  <>
                    <p className={styles.helpText}>
                      Password accepted. Send a code to {getMaskedFactorDisplay(mfaReauthHint)} to finish
                      re-authentication.
                    </p>

                    <div className={styles.mfaButtonGroup}>
                      <FormButton
                        variant="primary"
                        type="button"
                        onClick={handleSendMfaReauthVerificationCode}
                        isLoading={isMfaReauthLoading}
                        loadingText="Sending..."
                      >
                        Send MFA Code
                      </FormButton>

                      <FormButton
                        variant="secondary"
                        type="button"
                        onClick={handleCancelMfaReauth}
                        disabled={isMfaReauthLoading}
                      >
                        Cancel
                      </FormButton>
                    </div>
                  </>
                ) : (
                  <>
                    <label htmlFor="mfaReauthVerificationCode">MFA Verification Code</label>
                    <p className={styles.helpText}>
                      Enter the 6-digit code sent to {getMaskedFactorDisplay(mfaReauthHint)}.
                    </p>
                    <input
                      id="mfaReauthVerificationCode"
                      type="text"
                      value={mfaReauthVerificationCode}
                      onChange={(e) => {
                        setMfaReauthVerificationCode(e.target.value.replace(/\D/g, ''));
                        if (mfaError) setMfaError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleVerifyMfaReauthCode();
                        }
                      }}
                      className={styles.input}
                      autoComplete="one-time-code"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      disabled={isMfaReauthLoading || isMfaLoading}
                    />

                    <div className={styles.mfaButtonGroup}>
                      <FormButton
                        variant="primary"
                        type="button"
                        onClick={handleVerifyMfaReauthCode}
                        isLoading={isMfaReauthLoading}
                        loadingText="Verifying..."
                        disabled={mfaReauthVerificationCode.trim().length !== 6}
                      >
                        Verify and Continue
                      </FormButton>

                      <FormButton
                        variant="secondary"
                        type="button"
                        onClick={handleSendMfaReauthVerificationCode}
                        disabled={isMfaReauthLoading}
                      >
                        Send New Code
                      </FormButton>

                      <FormButton
                        variant="secondary"
                        type="button"
                        onClick={handleCancelMfaReauth}
                        disabled={isMfaReauthLoading}
                      >
                        Cancel
                      </FormButton>
                    </div>
                  </>
                )}
              </div>
            ) : !isMfaCodeSent ? (
              <div className={styles.mfaButtonGroup}>
                <FormButton
                  variant="secondary"
                  type="button"
                  onClick={handleSendMfaVerificationCode}
                  isLoading={isMfaLoading}
                  loadingText="Sending Code..."
                  disabled={!mfaPhoneInput.trim()}
                >
                  Send Verification Code
                </FormButton>
              </div>
            ) : (
              <div className={styles.mfaVerificationSection}>
                <input
                  id="mfaVerificationCode"
                  type="text"
                  value={mfaVerificationCode}
                  onChange={(e) => {
                    setMfaVerificationCode(e.target.value.replace(/\D/g, ''));
                    if (mfaError) setMfaError('');
                  }}
                  className={styles.input}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  disabled={isMfaLoading || isMfaReauthLoading}
                />

                <div className={styles.mfaButtonGroup}>
                  <FormButton
                    variant="primary"
                    type="button"
                    onClick={handleUpdateMfaPhoneNumber}
                    isLoading={isMfaLoading}
                    loadingText="Updating..."
                    disabled={isMfaReauthLoading || mfaVerificationCode.trim().length !== 6}
                  >
                    Update Phone Number
                  </FormButton>

                  <FormButton
                    variant="secondary"
                    type="button"
                    onClick={handleResetMfaChange}
                    disabled={isMfaLoading || isMfaReauthLoading}
                  >
                    Change Phone Number
                  </FormButton>

                  {mfaResendTimer === 0 ? (
                    <FormButton
                      variant="secondary"
                      type="button"
                      onClick={handleSendMfaVerificationCode}
                      disabled={isMfaLoading || isMfaReauthLoading}
                    >
                      Resend Code
                    </FormButton>
                  ) : (
                    <p className={styles.resendTimer}>Resend code in {mfaResendTimer}s</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && <FormMessage type="error" message={error} />}
          {success && <FormMessage type="success" message={success} />}
          {mfaError && <FormMessage type="error" message={mfaError} />}
          {mfaSuccess && <FormMessage type="success" message={mfaSuccess} />}

          <div className={styles.buttonGroup}>
                <FormButton 
                  variant="primary"
                  type="submit" 
                  isLoading={isLoading}
                  loadingText="Updating..."
                >
                  Update Profile
                </FormButton>
                <FormButton
                  variant="secondary"
                  type="button"
                  onClick={() => setShowAuditViewer(true)}
                >
                  View My Audit Trail
                </FormButton>
                <FormButton
                  variant="secondary"
                  type="button"
                  onClick={() => setShowResetForm(true)}
                >
                  Reset Password
                </FormButton>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccountClick}
                className={styles.deleteButton}
              >
                Delete Striae Account
              </button>

              <div id={MFA_RECAPTCHA_CONTAINER_ID} className={styles.recaptchaContainer} />
            </form>
      </div>
    </div>
  );
};