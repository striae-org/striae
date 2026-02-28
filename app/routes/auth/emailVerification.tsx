import { useState } from 'react';
import { Link } from '@remix-run/react';
import { sendEmailVerification, User } from 'firebase/auth';
import { auditService } from '~/services/audit.service';
import styles from './login.module.css';

interface EmailVerificationProps {
  user: User;  
  onSignOut: () => void; // This will sign out the user and show the login form
  error?: string;
  success?: string;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export const EmailVerification = ({
  user,  
  onSignOut,
  error,
  success,
  onError,
  onSuccess
}: EmailVerificationProps) => {
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);  

  const handleResendVerification = async () => {
    if (!user || resendCooldown > 0 || isResending) return;
    
    setIsResending(true);
    onError('');
    onSuccess('');
    
    try {
      await sendEmailVerification(user);
      
      // Log email verification resend audit event
      try {
        await auditService.logEmailVerification(
          user,
          'pending',
          'email-link',
          1, // Attempt number (could be tracked for multiple resends)
          undefined, // No sessionId during verification
          navigator.userAgent,
          [] // No errors since we successfully sent the email
        );
      } catch (auditError) {
        console.error('Failed to log email verification resend audit:', auditError);
        // Continue even if audit logging fails
      }
      
      onSuccess('Verification email sent! Please check your inbox and spam folder.');
      
      // Add 60-second cooldown to prevent spam
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      onError('Failed to send verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };  

  return (
    <div className={styles.container}>
      <Link 
        viewTransition
        prefetch="intent"
        to="/" 
        className={styles.logoLink}>
        <div className={styles.logo} />
      </Link>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Email Verification Required</h1>
        <p className={styles.verificationDescription}>Please check your email and verify your account before continuing.</p>
        
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
        
        <div className={styles.verificationActions}>
          <button 
            onClick={handleResendVerification}
            className={styles.button}
            disabled={isResending || resendCooldown > 0}
            title={resendCooldown > 0 ? `Please wait ${resendCooldown} seconds` : undefined}
          >
            {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
          </button>
          <button 
            onClick={onSignOut}
            className={styles.secondaryButton}
          >
            Login to Striae
          </button>
        </div>
        
        <div className={styles.verificationHints}>
          <p className={styles.hint}>Didn't receive the email?</p>
          <ul className={styles.hintList}>
            <li>Check your spam or junk folder</li>
            <li>Make sure {user?.email} is correct</li>
            <li>Add info@striae.org to your contacts</li>
          </ul>
        </div>
      </div>
    </div>
  );
};