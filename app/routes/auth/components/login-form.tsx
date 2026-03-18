import type { AuthCredential } from 'firebase/auth';
import { Icon } from '~/components/icon/icon';
import styles from '../login.module.css';

interface LoginFormProps {
  // Mode
  isLogin: boolean;
  onToggleMode: () => void;
  // Loading state
  isLoading: boolean;
  isCheckingUser: boolean;
  // Form submit
  onSubmit: (e: React.FormEvent) => void;
  // Error / success
  error: string;
  success: string;
  // Password fields
  showPassword: boolean;
  onToggleShowPassword: () => void;
  showConfirmPassword: boolean;
  onToggleShowConfirmPassword: () => void;
  confirmPasswordValue: string;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordChange: (value: string, confirm: string) => void;
  passwordStrength: string;
  // Registration fields
  firstName: string;
  onFirstNameChange: (value: string) => void;
  lastName: string;
  onLastNameChange: (value: string) => void;
  company: string;
  onCompanyChange: (value: string) => void;
  // Forgot password
  onForgotPassword: () => void;
  // Google sign-in
  onGoogleSignIn: () => void;
  // OAuth account linking
  pendingOAuthCredential: AuthCredential | null;
  pendingLinkEmail: string;
  pendingOAuthProviderLabel: string;
  linkPassword: string;
  onLinkPasswordChange: (value: string) => void;
  isLinkingAccount: boolean;
  onLinkOAuthAccount: () => void;
  onCancelOAuthLink: () => void;
  // Optional wrapper (for demo banner etc.)
  formPanelWrapper?: (children: React.ReactNode) => React.ReactNode;
}

export const LoginForm = ({
  isLogin,
  onToggleMode,
  isLoading,
  isCheckingUser,
  onSubmit,
  error,
  success,
  showPassword,
  onToggleShowPassword,
  showConfirmPassword,
  onToggleShowConfirmPassword,
  confirmPasswordValue,
  onConfirmPasswordChange,
  onPasswordChange,
  passwordStrength,
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  company,
  onCompanyChange,
  onForgotPassword,
  onGoogleSignIn,
  pendingOAuthCredential,
  pendingLinkEmail,
  pendingOAuthProviderLabel,
  linkPassword,
  onLinkPasswordChange,
  isLinkingAccount,
  onLinkOAuthAccount,
  onCancelOAuthLink,
  formPanelWrapper,
}: LoginFormProps) => {
  const formPanel = (
    <div className={styles.formWrapper}>
      <h1 className={styles.title}>{isLogin ? 'Login to Striae' : 'Register a Striae Account'}</h1>

      <form onSubmit={onSubmit} className={styles.form}>
        <input
          type="email"
          name="email"
          placeholder={isLogin ? 'Email' : 'Email Address'}
          autoComplete="email"
          className={styles.input}
          required
          disabled={isLoading}
        />
        <div className={styles.passwordField}>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            className={styles.input}
            required
            disabled={isLoading}
            onChange={(e) => !isLogin && onPasswordChange(e.target.value, confirmPasswordValue)}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={onToggleShowPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon icon={showPassword ? 'eye-off' : 'eye'} />
          </button>
        </div>

        {!isLogin && (
          <>
            <div className={styles.passwordField}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                autoComplete="new-password"
                className={styles.input}
                required
                disabled={isLoading}
                value={confirmPasswordValue}
                onChange={(e) => {
                  onConfirmPasswordChange(e.target.value);
                  const passwordInput = e.target.form?.elements.namedItem('password') as HTMLInputElement | null;
                  if (passwordInput) {
                    onPasswordChange(passwordInput.value, e.target.value);
                  }
                }}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={onToggleShowConfirmPassword}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                <Icon icon={showConfirmPassword ? 'eye-off' : 'eye'} />
              </button>
            </div>

            <input
              type="text"
              name="firstName"
              required
              placeholder="First Name (required)"
              autoComplete="given-name"
              className={styles.input}
              disabled={isLoading}
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
            />
            <input
              type="text"
              name="lastName"
              required
              placeholder="Last Name (required)"
              autoComplete="family-name"
              className={styles.input}
              disabled={isLoading}
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
            />
            <input
              type="text"
              name="company"
              required
              placeholder="Company/Lab (required)"
              autoComplete="organization"
              className={styles.input}
              disabled={isLoading}
              value={company}
              onChange={(e) => onCompanyChange(e.target.value)}
            />
            {passwordStrength && (
              <div className={styles.passwordStrength}>
                <pre>{passwordStrength}</pre>
              </div>
            )}
          </>
        )}

        {isLogin && (
          <button type="button" onClick={onForgotPassword} className={styles.resetLink}>
            Forgot Password?
          </button>
        )}

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <button type="submit" className={styles.button} disabled={isLoading || isCheckingUser}>
          {isCheckingUser
            ? 'Verifying account...'
            : isLoading
              ? 'Loading...'
              : isLogin
                ? 'Login'
                : 'Register'}
        </button>

        {isLogin && (
          <>
            <div className={styles.socialDivider} role="separator" aria-label="or">
              <span>or</span>
            </div>
            <button
              type="button"
              className={styles.googleButton}
              onClick={onGoogleSignIn}
              disabled={isLoading || isCheckingUser}
            >
              Continue with Google
            </button>
          </>
        )}

        {isLogin && pendingOAuthCredential && pendingLinkEmail && (
          <div className={styles.linkAccountSection}>
            <p className={styles.linkAccountTitle}>Link Existing Account</p>
            <p className={styles.linkAccountDescription}>
              Enter the password for {pendingLinkEmail} to link {pendingOAuthProviderLabel} sign-in.
            </p>
            <input
              type="password"
              name="linkPassword"
              placeholder="Current password"
              autoComplete="current-password"
              className={styles.input}
              disabled={isLoading || isCheckingUser || isLinkingAccount}
              value={linkPassword}
              onChange={(e) => onLinkPasswordChange(e.target.value)}
            />
            <div className={styles.linkAccountActions}>
              <button
                type="button"
                className={styles.button}
                onClick={onLinkOAuthAccount}
                disabled={isLoading || isCheckingUser || isLinkingAccount}
              >
                {isLinkingAccount ? 'Linking...' : `Link ${pendingOAuthProviderLabel} Sign-In`}
              </button>
              <button
                type="button"
                className={styles.linkCancelButton}
                onClick={onCancelOAuthLink}
                disabled={isLoading || isCheckingUser || isLinkingAccount}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </form>

      <p className={styles.toggle}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={onToggleMode} className={styles.toggleButton} disabled={isLoading || isCheckingUser}>
          {isLogin ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  );

  return formPanelWrapper ? <>{formPanelWrapper(formPanel)}</> : formPanel;
};
