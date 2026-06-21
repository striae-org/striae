import { useState, useEffect, useRef } from 'react';
import { multiFactor, TotpMultiFactorGenerator, type TotpSecret, type User } from 'firebase/auth';
import { toDataURL as qrToDataURL } from 'qrcode';
import { handleAuthError, getValidationError } from '~/services/firebase/errors';
import { auditService } from '~/services/audit';
import styles from './auth.module.css';

interface MfaTotpEnrollmentProps {
  user: User;
  onSuccess: () => void;
  onError: (error: string) => void;
  onBack?: () => void;
}

export const MfaTotpEnrollment: React.FC<MfaTotpEnrollmentProps> = ({
  user,
  onSuccess,
  onError,
  onBack,
}) => {
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSecret, setIsFetchingSecret] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  // Persists the secret across re-renders to avoid regenerating it
  const secretRef = useRef<TotpSecret | null>(null);

  useEffect(() => {
    if (secretRef.current) {
      setTotpSecret(secretRef.current);
      setIsFetchingSecret(false);
      return;
    }

    const generateSecret = async () => {
      setIsFetchingSecret(true);
      setErrorMessage('');
      try {
        const session = await multiFactor(user).getSession();
        const secret = await TotpMultiFactorGenerator.generateSecret(session);
        secretRef.current = secret;
        setTotpSecret(secret);

        const qrUrl = secret.generateQrCodeUrl(user.email ?? 'user', 'Striae');
        const dataUrl = await qrToDataURL(qrUrl, { width: 200, margin: 1 });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        const { message } = handleAuthError(err);
        setErrorMessage(message);
        onError(message);
      } finally {
        setIsFetchingSecret(false);
      }
    };

    void generateSecret();
  }, [user, onError]);

  const handleVerify = async () => {
    if (!totpSecret) {
      const error = getValidationError('MFA_TOTP_SETUP_ERROR');
      setErrorMessage(error);
      onError(error);
      return;
    }

    if (verificationCode.length !== 6) {
      const error = getValidationError('MFA_CODE_REQUIRED');
      setErrorMessage(error);
      onError(error);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecret,
        verificationCode
      );
      await multiFactor(user).enroll(assertion, 'Authenticator App');

      try {
        await auditService.logMfaEnrollment(
          user,
          undefined,
          'totp',
          'success',
          1,
          undefined,
          navigator.userAgent
        );
      } catch (auditErr) {
        console.error('Failed to log TOTP enrollment audit:', auditErr);
      }

      onSuccess();
    } catch (err) {
      const authError = err as { code?: string; message?: string };
      let errorMsg: string;

      if (authError.code === 'auth/invalid-verification-code') {
        errorMsg = getValidationError('MFA_INVALID_CODE');
      } else if (authError.code === 'auth/code-expired') {
        errorMsg = getValidationError('MFA_CODE_EXPIRED');
      } else {
        errorMsg = handleAuthError(authError).message;
      }

      setErrorMessage(errorMsg);
      onError(errorMsg);

      try {
        await auditService.logSecurityViolation(
          user,
          'unauthorized-access',
          authError.code === 'auth/invalid-verification-code' ? 'high' : 'medium',
          `Failed TOTP enrollment: ${authError.code} - ${errorMsg}`,
          'mfa-totp-enrollment-endpoint',
          true
        );
      } catch (auditErr) {
        console.error('Failed to log TOTP enrollment security violation audit:', auditErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingSecret) {
    return (
      <div className={styles.totpStep}>
        <p className={styles.note}>Setting up authenticator&hellip;</p>
      </div>
    );
  }

  return (
    <div className={styles.totpStep}>
      <h3>Set Up Authenticator App</h3>

      {errorMessage && (
        <div className={styles.errorMessage}>{errorMessage}</div>
      )}

      {qrCodeDataUrl && (
        <div className={styles.qrCodeContainer}>
          <p className={styles.note}>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
          </p>
          <img
            src={qrCodeDataUrl}
            alt="TOTP QR Code — scan with your authenticator app"
            className={styles.qrCodeImage}
            width={200}
            height={200}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowSecretKey((v) => !v)}
        className={styles.enrollmentSecondaryButton}
        style={{ marginBottom: '1rem' }}
      >
        {showSecretKey ? 'Hide' : 'Show'} setup key
      </button>

      {showSecretKey && totpSecret && (
        <div className={styles.secretKeyDisplay}>
          <p className={styles.note}>
            If you cannot scan the QR code, enter this key manually in your authenticator app:
          </p>
          <code className={styles.secretKey}>{totpSecret.secretKey}</code>
        </div>
      )}

      <p className={styles.note}>
        After scanning, enter the 6-digit code from your authenticator app below.
      </p>
      <input
        type="text"
        inputMode="numeric"
        value={verificationCode}
        onChange={(e) => {
          setVerificationCode(e.target.value.replace(/\D/g, ''));
          if (errorMessage) setErrorMessage('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && verificationCode.length === 6) {
            e.preventDefault();
            void handleVerify();
          }
        }}
        placeholder="123456"
        maxLength={6}
        className={styles.enrollmentInput}
        disabled={isLoading}
        autoComplete="one-time-code"
      />

      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={handleVerify}
          disabled={isLoading || verificationCode.length !== 6}
          className={styles.primaryButton}
        >
          {isLoading ? 'Verifying…' : 'Complete Setup'}
        </button>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className={styles.enrollmentSecondaryButton}
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
};
