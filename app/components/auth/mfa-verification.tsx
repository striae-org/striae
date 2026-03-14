import { useState, useEffect } from 'react';
import { 
  PhoneAuthProvider, 
  PhoneMultiFactorGenerator, 
  RecaptchaVerifier,
  MultiFactorResolver,
  UserCredential
} from 'firebase/auth';
import { auth } from '~/services/firebase';
import { handleAuthError, getValidationError } from '~/services/firebase/errors';
import { SignOut } from '~/components/actions/signout';
import { auditService } from '~/services/audit';
import { generateUniqueId } from '~/utils/id-generator';
import styles from './mfa-verification.module.css';

interface MFAVerificationProps {
  resolver: MultiFactorResolver;
  onSuccess: (result: UserCredential) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const isRecaptchaResetError = (authError: { code?: string; message?: string }): boolean => {
  return (
    authError.code === 'auth/captcha-check-failed' ||
    authError.code === 'auth/invalid-app-credential' ||
    authError.code === 'auth/missing-app-credential' ||
    (authError.message?.toLowerCase().includes('recaptcha') ?? false)
  );
};

export const MFAVerification = ({ resolver, onSuccess, onError, onCancel }: MFAVerificationProps) => {
  const [selectedHintIndex, setSelectedHintIndex] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Initialize reCAPTCHA verifier
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        const error = getValidationError('MFA_RECAPTCHA_EXPIRED');
        setErrorMessage(error);
        onError(error);
      }
    });
    setRecaptchaVerifier(verifier);

    return () => {
      verifier.clear();
    };
  }, [isClient, onError]);

  const sendVerificationCode = async () => {
    if (!recaptchaVerifier) {
      const error = getValidationError('MFA_RECAPTCHA_ERROR');
      setErrorMessage(error);
      onError(error);
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Clear any previous errors
    try {
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      
      const phoneInfoOptions = {
        multiFactorHint: resolver.hints[selectedHintIndex],
        session: resolver.session
      };

      const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
      setVerificationId(vId);
      setCodeSent(true);
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      let errorMsg = handleAuthError(authError).message;

      if (isRecaptchaResetError(authError)) {
        errorMsg = getValidationError('MFA_RECAPTCHA_ERROR');
      }
      setErrorMessage(errorMsg);
      onError(errorMsg);
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationId) {
      const error = getValidationError('MFA_NO_VERIFICATION_ID');
      setErrorMessage(error);
      onError(error);
      return;
    }
    
    if (!verificationCode.trim()) {
      const error = getValidationError('MFA_CODE_REQUIRED');
      setErrorMessage(error);
      onError(error);
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Clear any previous errors
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(credential);
      
      const result = await resolver.resolveSignIn(multiFactorAssertion);
      
      // Log successful MFA authentication audit event
      try {
        const sessionId = `session_${result.user.uid}_${Date.now()}_${generateUniqueId(8)}`;
        await auditService.logMfaAuthentication(
          result.user,
          'sms',
          'success',
          1, // Assuming first successful attempt since we got here
          sessionId,
          navigator.userAgent
        );
      } catch (auditError) {
        console.error('Failed to log MFA authentication success audit:', auditError);
        // Continue with success flow even if audit logging fails
      }
      
      onSuccess(result);
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string };
      let errorMsg = '';

      if (authError.code === 'auth/invalid-verification-code') {
        errorMsg = getValidationError('MFA_INVALID_CODE');
      } else if (authError.code === 'auth/code-expired') {
        errorMsg = getValidationError('MFA_CODE_EXPIRED');
      } else if (isRecaptchaResetError(authError)) {
        errorMsg = getValidationError('MFA_RECAPTCHA_ERROR');
      } else {
        const fallbackMessage = handleAuthError(authError).message;
        errorMsg = fallbackMessage;
      }
      setErrorMessage(errorMsg);
      onError(errorMsg);
      
      // Log security violation for failed MFA attempts
      try {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        let incidentType: 'unauthorized-access' | 'brute-force' = 'unauthorized-access';
        
        if (authError.code === 'auth/invalid-verification-code') {
          severity = 'high'; // Invalid MFA codes are serious security events
          incidentType = 'brute-force';
        }
        
        await auditService.logSecurityViolation(
          null, // No user object during MFA verification failure
          incidentType,
          severity,
          `Failed MFA verification: ${authError.code} - ${errorMsg}`,
          'mfa-verification-endpoint',
          true // Blocked by system
        );
      } catch (auditError) {
        console.error('Failed to log MFA security violation audit:', auditError);
        // Continue with error flow even if audit logging fails
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedHint = resolver.hints[selectedHintIndex];
  const maskedPhoneNumber = selectedHint?.displayName || 'your phone';

  if (!isClient) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Two-Factor Authentication Required</h2>
        
        {errorMessage && (
          <div className={styles.errorMessage}>
            {errorMessage}
          </div>
        )}
        
        {resolver.hints.length > 1 && (
          <div className={styles.hintSelection}>
            <label htmlFor="hint-select" className={styles.label}>Choose verification method:</label>
            <select 
              id="hint-select"
              title="Select verification method"
              value={selectedHintIndex} 
              onChange={(e) => {
                setSelectedHintIndex(Number(e.target.value));
                if (errorMessage) setErrorMessage(''); // Clear error when changing method
              }}
              className={styles.select}
            >
              {resolver.hints.map((hint, index) => (
                <option key={index} value={index}>
                  {hint.displayName || `Phone verification ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {!codeSent ? (
          <div className={styles.sendCode}>
            <p className={styles.description}>
              We&apos;ll send a verification code to {maskedPhoneNumber}
            </p>
            <button 
              onClick={sendVerificationCode} 
              disabled={loading}
              className={styles.button}
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        ) : (
          <div className={styles.verifyCode}>
            <p className={styles.description}>
              Enter the verification code sent to {maskedPhoneNumber}
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value);
                if (errorMessage) setErrorMessage(''); // Clear error on input
              }}
              className={styles.input}
              maxLength={6}
            />
            <div className={styles.buttons}>
              <button 
                onClick={verifyCode} 
                disabled={loading || verificationCode.length !== 6}
                className={styles.button}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button 
                onClick={() => {
                  setCodeSent(false);
                  setVerificationCode('');
                  setVerificationId('');
                  setErrorMessage(''); // Clear errors when requesting new code
                }}
                className={styles.secondaryButton}
              >
                Send New Code
              </button>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
          <div className={styles.signOutContainer}>
            <p className={styles.signOutText}>Need to sign in with a different account?</p>
            <SignOut redirectTo="/" />
          </div>
        </div>        
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};
