import { useCallback, useEffect, useState } from 'react';
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
} from 'firebase/auth';
import { auditService } from '~/services/audit';
import { auth } from '~/services/firebase';
import { ERROR_MESSAGES, getValidationError, handleAuthError } from '~/services/firebase/errors';
import {
  formatPhoneNumberForMfa,
  getMaskedFactorDisplay,
  getPhoneDisplayValue,
  maskPhoneNumber,
  validatePhoneNumber,
} from '~/utils/auth';
import { FormButton, FormMessage } from '../form';
import styles from './manage-profile.module.css';

const MFA_RECAPTCHA_CONTAINER_ID = 'recaptcha-container-manage-profile';

interface MfaPhoneUpdateSectionProps {
  user: User | null;
  isOpen: boolean;
  onBusyChange?: (isBusy: boolean) => void;
}

export const MfaPhoneUpdateSection = ({
  user,
  isOpen,
  onBusyChange,
}: MfaPhoneUpdateSectionProps) => {
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

  const isMfaBusy = isMfaLoading || isMfaReauthLoading;
  const hasMfaPhoneInput = mfaPhoneInput.trim().length > 0;

  const resetMfaReauthFlow = useCallback(() => {
    setShowMfaReauthPrompt(false);
    setMfaReauthPassword('');
    setMfaReauthResolver(null);
    setMfaReauthHint(null);
    setMfaReauthVerificationId('');
    setMfaReauthVerificationCode('');
    setIsMfaReauthCodeSent(false);
  }, []);

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
    setMfaSuccess('');
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
          setMfaSuccess('');
          return;
        }

        setMfaSuccess('');
        setMfaError('For security, please sign out and sign in again, then try this action again.');
        return;
      }

      setMfaSuccess('');
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
    setMfaSuccess('');

    try {
      const credential = EmailAuthProvider.credential(user.email, mfaReauthPassword);
      await reauthenticateWithCredential(user, credential);

      resetMfaReauthFlow();

      await handleSendMfaVerificationCode();
    } catch (err) {
      const { message, data } = handleAuthError(err);

      if (data?.code === 'auth/multi-factor-auth-required') {
        if (!recaptchaVerifier) {
          setMfaSuccess('');
          setMfaError(getValidationError('MFA_RECAPTCHA_ERROR'));
          return;
        }

        const resolver = getMultiFactorResolver(auth, err as MultiFactorError);
        const phoneHint = resolver.hints.find(
          (hint) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID
        );

        if (!phoneHint) {
          setMfaSuccess('');
          setMfaError('This account requires a non-phone MFA method. Please sign out and sign in again.');
          return;
        }

        setShowMfaReauthPrompt(true);
        setMfaReauthResolver(resolver);
        setMfaReauthHint(phoneHint);
        setMfaReauthVerificationId('');
        setMfaReauthVerificationCode('');
        setIsMfaReauthCodeSent(false);
        setMfaSuccess('');
        return;
      }

      setMfaSuccess('');
      setMfaError(message);
    } finally {
      setIsMfaReauthLoading(false);
    }
  };

  const handleSendMfaReauthVerificationCode = async () => {
    if (!mfaReauthResolver || !mfaReauthHint) {
      setMfaSuccess('');
      setMfaError('Please confirm your password again to continue.');
      return;
    }

    if (!recaptchaVerifier) {
      setMfaSuccess('');
      setMfaError(getValidationError('MFA_RECAPTCHA_ERROR'));
      return;
    }

    setIsMfaReauthLoading(true);
    setMfaError('');
    setMfaSuccess('');

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
      setMfaSuccess('');
    } catch (err) {
      const { message } = handleAuthError(err);
      setMfaSuccess('');
      setMfaError(message);
    } finally {
      setIsMfaReauthLoading(false);
    }
  };

  const handleVerifyMfaReauthCode = async () => {
    if (!mfaReauthResolver) {
      setMfaSuccess('');
      setMfaError('Please confirm your password again to continue.');
      return;
    }

    if (!mfaReauthVerificationId) {
      setMfaSuccess('');
      setMfaError(getValidationError('MFA_NO_VERIFICATION_ID'));
      return;
    }

    if (!mfaReauthVerificationCode.trim()) {
      setMfaSuccess('');
      setMfaError(getValidationError('MFA_CODE_REQUIRED'));
      return;
    }

    setIsMfaReauthLoading(true);
    setMfaError('');
    setMfaSuccess('');

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

      setMfaSuccess('');
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
    onBusyChange?.(isMfaBusy);
  }, [isMfaBusy, onBusyChange]);

  useEffect(() => {
    return () => {
      onBusyChange?.(false);
    };
  }, [onBusyChange]);

  useEffect(() => {
    if (isOpen && user) {
      const loadMfaState = async () => {
        try {
          setMfaError('');
          setMfaSuccess('');
          setIsMfaCodeSent(false);
          setMfaVerificationCode('');
          setMfaVerificationId('');
          setMfaResendTimer(0);
          resetMfaReauthFlow();

          await refreshCurrentMfaPhone(user);
        } catch (err) {
          console.error('Failed to load MFA state:', err);
        }
      };

      void loadMfaState();
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

  return (
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
        disabled={isMfaBusy}
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
                onChange={(e) => {
                  setMfaReauthPassword(e.target.value);
                  if (mfaError) setMfaError('');
                  if (mfaSuccess) setMfaSuccess('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleMfaReauthenticate();
                  }
                }}
                className={styles.input}
                autoComplete="current-password"
                placeholder="Confirm current password"
                disabled={isMfaBusy}
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
                  if (mfaSuccess) setMfaSuccess('');
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
                disabled={isMfaBusy}
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
        hasMfaPhoneInput ? (
          <div className={styles.mfaButtonGroup}>
            <FormButton
              variant="secondary"
              type="button"
              onClick={handleSendMfaVerificationCode}
              isLoading={isMfaLoading}
              loadingText="Sending Code..."
              disabled={!hasMfaPhoneInput}
            >
              Send Verification Code
            </FormButton>
          </div>
        ) : null
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
            disabled={isMfaBusy}
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
              disabled={isMfaBusy}
            >
              Change Phone Number
            </FormButton>

            {mfaResendTimer === 0 ? (
              <FormButton
                variant="secondary"
                type="button"
                onClick={handleSendMfaVerificationCode}
                disabled={isMfaBusy}
              >
                Resend Code
              </FormButton>
            ) : (
              <p className={styles.resendTimer}>Resend code in {mfaResendTimer}s</p>
            )}
          </div>
        </div>
      )}

      {mfaError && <FormMessage type="error" message={mfaError} />}
      {!mfaError && mfaSuccess && <FormMessage type="success" message={mfaSuccess} />}

      <div id={MFA_RECAPTCHA_CONTAINER_ID} className={styles.recaptchaContainer} />
    </div>
  );
};
