import type { AuthCredential } from 'firebase/auth';
import { Icon } from '~/components/icon/icon';
import styles from '../login.module.css';

const GoogleMark = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 18 18"
    className={className}
  >
    <path
      fill="#4285F4"
      d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7963 2.7164v2.2582h2.9081c1.7018-1.5664 2.6846-3.8741 2.6846-6.6155z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.4673-.8055 5.9564-2.1782l-2.9081-2.2582c-.8055.54-1.8355.8591-3.0482.8591-2.3441 0-4.3282-1.5832-5.0364-3.71H.9573v2.3327C2.4382 15.9832 5.4818 18 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.9636 10.7127C3.7832 10.1727 3.6818 9.5959 3.6818 9s.1014-1.1727.2818-1.7127V4.9545H.9573A8.9955 8.9955 0 000 9c0 1.4523.3482 2.8277.9573 4.0455l3.0063-2.3328z"
    />
    <path
      fill="#EA4335"
      d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3455l2.5827-2.5828C13.4632.8918 11.425.0009 9 0 5.4818 0 2.4382 2.0168.9573 4.9545l3.0063 2.3328C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
    />
  </svg>
);

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
              aria-label="Sign in with Google"
              disabled={isLoading || isCheckingUser}
            >
              <span className={styles.googleButtonMark}>
                <GoogleMark className={styles.googleButtonIcon} />
              </span>
              <span className={styles.googleButtonLabel}>Sign in with Google</span>
              <span className={styles.googleButtonSpacer} aria-hidden="true" />
            </button>
            <p className={styles.googleAttribution}>Google is a trademark of Google LLC.</p>
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
