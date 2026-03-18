import type { FormEvent } from 'react';
import { Link } from 'react-router';
import type { User } from 'firebase/auth';
import { getUserFirstName } from './auth-utils';
import styles from '../login.module.css';

interface SSOOnboardingProps {
  user: User;
  company: string;
  error: string;
  isLoading: boolean;
  onCompanyChange: (value: string) => void;
  onSubmit: () => void;
}

export const SSOOnboarding = ({
  user,
  company,
  error,
  isLoading,
  onCompanyChange,
  onSubmit,
}: SSOOnboardingProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className={styles.container}>
      <Link viewTransition prefetch="intent" to="/" className={styles.logoLink}>
        <div className={styles.logo} />
      </Link>
      <div className={styles.formWrapper}>
        <h1 className={styles.title}>One More Step</h1>
        <form className={styles.form} onSubmit={handleSubmit}>
          <p className={styles.ssoOnboardingDescription}>
            Welcome, {getUserFirstName(user)}! Enter your organization name to complete sign-up.
          </p>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.inlineActionRow}>
            <input
              type="text"
              name="company"
              placeholder="Organization / Lab Name (required)"
              autoComplete="organization"
              className={`${styles.input} ${styles.inlineActionInput}`}
              value={company}
              onChange={(e) => onCompanyChange(e.target.value)}
              disabled={isLoading}
              required
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <button
              type="submit"
              className={`${styles.button} ${styles.inlineActionButton}`}
              disabled={isLoading}
            >
              {isLoading ? 'Setting up...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
