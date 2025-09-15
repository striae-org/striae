import { useRef, useState } from 'react';
import { Link } from '@remix-run/react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '~/services/firebase';
import { handleAuthError, ERROR_MESSAGES } from '~/services/firebase-errors';
import styles from './passwordReset.module.css';

interface PasswordResetProps {
  isModal?: boolean;
  onBack: () => void;
}

export const PasswordReset = ({ isModal, onBack }: PasswordResetProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = formRef.current?.email.value;
    if (!email) return;

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setError(ERROR_MESSAGES.RESET_EMAIL_SENT);
      setTimeout(onBack, 2000);
    } catch (err) {
      const { message } = handleAuthError(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const FormContent = (
    <form ref={formRef} onSubmit={handleReset} className={styles.form}>
      <h2 className={styles.title}>Reset Password</h2>
      <input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        className={styles.input}
        required
      />
      {error && <p className={styles.error}>{error}</p>}
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
        to="/#top" 
        className={styles.logoLink}>
        <div className={styles.logo} />
      </Link>
      <div className={styles.formWrapper}>
        {FormContent}
      </div>
    </div>
  );
};