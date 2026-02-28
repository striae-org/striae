import { useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '~/services/firebase';
import { handleAuthError, ERROR_MESSAGES } from '~/services/firebase-errors';
import { auditService } from '~/services/audit.service';
import styles from './passwordReset.module.css';

interface PasswordResetProps {
  isModal?: boolean;
  onBack: () => void;
}

export const PasswordReset = ({ isModal, onBack }: PasswordResetProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formRef.current?.email.value;
    if (!email) return;

    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await sendPasswordResetEmail(auth, email);
      
      // Log successful password reset request
      await auditService.logPasswordReset(
        email,
        'email',
        'success'
      );
      
      setSuccess(ERROR_MESSAGES.RESET_EMAIL_SENT);
      setTimeout(onBack, 2000);
    } catch (err) {
      const { message } = handleAuthError(err);
      
      // Log failed password reset attempt
      await auditService.logPasswordReset(
        email,
        'email',
        'failure',
        undefined, // no reset token on failure
        'email-link',
        1, // first attempt
        undefined, // password complexity not relevant here
        undefined, // previous password reuse not relevant here
        undefined, // no session ID
        [message] // error details
      );
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const FormContent = (
    <form ref={formRef} onSubmit={handleReset} className={styles.form}>
      <input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        className={styles.input}
        required
      />
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
      <button type="submit" className={styles.button} disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send Reset Link'}
      </button>
      <button 
        type="button" 
        onClick={onBack}
        className={styles.secondaryButton}
      >
        Back
      </button>
    </form>
  );

  if (isModal) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <h2 className={styles.modalTitle}>Reset Password</h2>
          {FormContent}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link 
        viewTransition
        prefetch="intent"
        to="/" 
      >
        <div className={styles.logo} />
      </Link>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>Reset Password</h1>
        <form ref={formRef} onSubmit={handleReset} className={styles.form}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            className={styles.input}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}
          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <button 
            type="button" 
            onClick={onBack}
            className={styles.secondaryButton}
          >
            Back
          </button>
        </form>
      </div>
    </div>
  );
};