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
}: SSOOnboardingProps) => (
  <div className={styles.container}>
    <Link viewTransition prefetch="intent" to="/" className={styles.logoLink}>
      <div className={styles.logo} />
    </Link>
    <div className={styles.formWrapper}>
      <h1 className={styles.title}>One More Step</h1>
      <p className={styles.linkAccountDescription}>
        Welcome, {getUserFirstName(user)}! Enter your organization name to complete sign-up.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <input
        type="text"
        placeholder="Organization / Lab Name (required)"
        autoComplete="organization"
        className={styles.input}
        value={company}
        onChange={(e) => onCompanyChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        disabled={isLoading}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
      <button
        type="button"
        className={styles.button}
        onClick={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Setting up...' : 'Continue'}
      </button>
    </div>
  </div>
);
