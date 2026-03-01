import { useState, useEffect, useRef } from 'react';
import { Link } from '@remix-run/react';
import { auth } from '~/services/firebase';
import {
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
    User,
    updateProfile,
    getMultiFactorResolver,
    MultiFactorResolver,
    MultiFactorError,
    multiFactor
} from 'firebase/auth';
import { PasswordReset } from '~/routes/auth/passwordReset';
import { EmailVerification } from '~/routes/auth/emailVerification';
import { handleAuthError } from '~/services/firebase-errors';
import { MFAVerification } from '~/components/auth/mfa-verification';
import { MFAEnrollment } from '~/components/auth/mfa-enrollment';
import { Turnstile } from '~/components/turnstile/turnstile';
import { verifyTurnstileToken } from '~/utils/turnstile';
import { Icon } from '~/components/icon/icon';
import styles from './login.module.css';
import { baseMeta } from '~/utils/meta';
import { Striae } from '~/routes/striae/striae';
import { getUserData, createUser } from '~/utils/permissions';
import { auditService } from '~/services/audit.service';
import { generateUniqueId } from '~/utils/id-generator';
import { AUTH_REGISTRATION_CONFIG } from '~/config/auth-registration';

export const meta = () => {
  return baseMeta({
    title: 'Welcome to Striae',
    description: 'Login to your Striae account to access your projects and data',
  });
};

const CAPTCHA_RETRY_DELAY_MS = 3000;
const CAPTCHA_RETRY_DELAY_SECONDS = Math.ceil(CAPTCHA_RETRY_DELAY_MS / 1000);

export const Login = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [captchaWidgetId, setCaptchaWidgetId] = useState<string | null>(null);
  const [isCaptchaCoolingDown, setIsCaptchaCoolingDown] = useState(false);
  const [captchaCooldownSeconds, setCaptchaCooldownSeconds] = useState(0);
  const captchaCooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captchaCooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // MFA state
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Email validation with regex and domain allowlist
  const validateEmailDomain = (email: string): boolean => {
    // Email regex pattern for basic validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // First check if email format is valid
    if (!emailRegex.test(email)) {
      return false;
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedAllowedDomains = AUTH_REGISTRATION_CONFIG.allowedDomainEmails
      .map((allowedDomainEmail) => allowedDomainEmail.trim().toLowerCase())
      .filter((allowedDomainEmail) => allowedDomainEmail.length > 0);

    if (normalizedAllowedDomains.length === 0) {
      return true;
    }

    const allowedDomainEmail = normalizedAllowedDomains.some(
      (allowedDomainEmail) => normalizedEmail.endsWith(allowedDomainEmail)
    );

    if (!allowedDomainEmail) {
      return false;
    }

    return true;
  };

  const checkPasswordStrength = (password: string, confirmPassword?: string): boolean => {
    const hasMinLength = password.length >= 10;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const passwordsMatch = confirmPassword !== undefined ? password === confirmPassword : true;
    
    const isStrong = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar && passwordsMatch;
    setPasswordStrength(
      `Password must contain:
      ${!hasMinLength ? '❌' : '✅'} At least 10 characters
      ${!hasUpperCase ? '❌' : '✅'} Capital letters
      ${!hasNumber ? '❌' : '✅'} Numbers
      ${!hasSpecialChar ? '❌' : '✅'} Special characters${confirmPassword !== undefined ? `
      ${!passwordsMatch ? '❌' : '✅'} Passwords must match` : ''}`
    );
    
    return isStrong;
  };  

  // Check if user exists in the USER_DB using centralized function
  const checkUserExists = async (uid: string): Promise<boolean> => {
    try {
      // Create a minimal user object for the centralized function
      const tempUser = { uid } as User;
      const userData = await getUserData(tempUser);
      
      return userData !== null;
    } catch (error) {
      console.error('Error checking user existence:', error);
      // On network/API errors, throw error to prevent login
      throw new Error('System error. Please try logging in at a later time.');
    }
  };  

   useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
   if (user) {
      // Set user state first so verification prompt can show for unverified users
      setUser(user);
      
      if (!user.emailVerified) {
        // Don't sign out immediately - let them see the verification prompt
        setError('');
        setSuccess('Please verify your email before continuing. Check your inbox for the verification link.');
        setShowMfaEnrollment(false);
        setIsCheckingUser(false);
        return;
      }      
      
      // Check if user exists in the USER_DB
      setIsCheckingUser(true);
      try {
        const userExists = await checkUserExists(user.uid);
        setIsCheckingUser(false);
        
        if (!userExists) {
          handleSignOut();
          setError('This account does not exist or has been deleted');
          return;
        }
      } catch (error) {
        setIsCheckingUser(false);
        handleSignOut();
        setError(error instanceof Error ? error.message : 'System error. Please try logging in at a later time.');
        return;
      }
      
      // Check if user has MFA enrolled
      const mfaFactors = multiFactor(user).enrolledFactors;
      if (mfaFactors.length === 0) {
        // User has no MFA factors enrolled - require enrollment
        setShowMfaEnrollment(true);
        return;
      }
      
      console.log("User signed in:", user.email);
      setShowMfaEnrollment(false);
      
      // Log successful login audit
      try {
        const sessionId = `session_${user.uid}_${Date.now()}_${generateUniqueId(8)}`;
        await auditService.logUserLogin(
          user,
          sessionId,
          'firebase',
          navigator.userAgent
        );
      } catch (auditError) {
        console.error('Failed to log user login audit:', auditError);
        // Continue with login even if audit logging fails
      }      
    } else {
      setUser(null);
      setShowMfaEnrollment(false);
      setIsCheckingUser(false);
    }
  });

   return () => unsubscribe();
}, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');
  setSuccess('');

  if (isCaptchaCoolingDown) {
    setError('Please wait a few seconds before trying again.');
    setIsLoading(false);
    return;
  }

  const formData = new FormData(e.currentTarget as HTMLFormElement);
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const captchaToken = formData.get('cf-turnstile-response') as string | null;
  // Use state values for these fields instead of FormData
  const formFirstName = firstName;
  const formLastName = lastName;
  const formCompany = company;

  try {
    if (!captchaToken) {
      setError('Please complete CAPTCHA verification before continuing.');
      setIsLoading(false);
      return;
    }

    const verificationResult = await verifyTurnstileToken(captchaToken);
    if (!('success' in verificationResult) || !verificationResult.success) {
      setError('CAPTCHA verification failed. Please try again.');
      setIsCaptchaCoolingDown(true);
      setCaptchaCooldownSeconds(CAPTCHA_RETRY_DELAY_SECONDS);

      if (captchaCooldownTimer.current) {
        clearTimeout(captchaCooldownTimer.current);
      }

      if (captchaCooldownInterval.current) {
        clearInterval(captchaCooldownInterval.current);
      }

      captchaCooldownInterval.current = setInterval(() => {
        setCaptchaCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);

      captchaCooldownTimer.current = setTimeout(() => {
        setIsCaptchaCoolingDown(false);
        setCaptchaCooldownSeconds(0);

        if (captchaCooldownInterval.current) {
          clearInterval(captchaCooldownInterval.current);
          captchaCooldownInterval.current = null;
        }

        captchaCooldownTimer.current = null;
      }, CAPTCHA_RETRY_DELAY_MS);

      if (captchaWidgetId && window.turnstile) {
        window.turnstile.reset(captchaWidgetId);
      }
      setIsLoading(false);
      return;
    }

    if (!isLogin) {
      // Registration validation
      if (!validateEmailDomain(email)) {
        setError('Registration is restricted to authorized users only');
        setIsLoading(false);
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      
      if (!checkPasswordStrength(password)) {
        setError('Password does not meet requirements');
        setIsLoading(false);
        return;
      }

      // Registration
      const createCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(createCredential.user, {
        displayName: `${formFirstName} ${formLastName}`
      });

      const companyName = (AUTH_REGISTRATION_CONFIG.autoSetLabCompanyOnRegistration
        ? AUTH_REGISTRATION_CONFIG.defaultLabCompanyName
        : formCompany).trim();

      // Create user data using centralized function
      await createUser(
        createCredential.user,
        formFirstName,
        formLastName,
        companyName || '',
        true
      );

      // Log user registration audit event
      try {
        await auditService.logUserRegistration(
          createCredential.user,
          formFirstName,
          formLastName,
          companyName || '',
          'email-password',
          navigator.userAgent
        );
      } catch (auditError) {
        console.error('Failed to log user registration audit:', auditError);
        // Continue with registration flow even if audit logging fails
      }

      await sendEmailVerification(createCredential.user);
      
      // Log email verification sent audit event
      try {
        // This logs that we sent the verification email, not that it was verified
        // The actual verification happens when user clicks the email link
        await auditService.logEmailVerification(
          createCredential.user,
          'pending', // Status pending until user clicks verification link
          'email-link',
          1, // First attempt
          undefined, // No sessionId during registration
          navigator.userAgent,
          [] // No errors since we successfully sent the email
        );
      } catch (auditError) {
        console.error('Failed to log email verification audit:', auditError);
        // Continue with registration flow even if audit logging fails
      }
      
      setError('');
      setSuccess('Account created successfully! Please check your email to verify your account.');
      // Don't sign out - let user stay logged in but unverified to see verification screen
    } else {
      // Login
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (loginError: unknown) {
        // Check if it's a Firebase Auth error with MFA requirement
        if (
          loginError && 
          typeof loginError === 'object' && 
          'code' in loginError && 
          loginError.code === 'auth/multi-factor-auth-required'
        ) {
          // Handle MFA requirement
          const resolver = getMultiFactorResolver(auth, loginError as MultiFactorError);
          setMfaResolver(resolver);
          setShowMfaVerification(true);
          setIsLoading(false);
          return;
        }
        throw loginError; // Re-throw non-MFA errors
      }
    }
  } catch (err) {
    const { message } = handleAuthError(err);
    setError(message);
    
    // Log security violation for failed authentication attempts
    try {
      // Extract error details for audit
      const errorCode = err && typeof err === 'object' && 'code' in err ? err.code : 'unknown';
      const isAuthError = typeof errorCode === 'string' && errorCode.startsWith('auth/');
      
      if (isAuthError) {
        // Determine severity based on error type
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        let incidentType: 'unauthorized-access' | 'brute-force' | 'privilege-escalation' = 'unauthorized-access';
        
        if (errorCode === 'auth/too-many-requests') {
          severity = 'high';
          incidentType = 'brute-force';
        } else if (errorCode === 'auth/user-disabled') {
          severity = 'critical';
        }
        
        await auditService.logSecurityViolation(
          null, // No user object for failed auth
          incidentType,
          severity,
          `Failed authentication attempt: ${errorCode} - ${message}`,
          'authentication-endpoint',
          true // Blocked by system
        );
      }
    } catch (auditError) {
      console.error('Failed to log security violation audit:', auditError);
      // Continue with error flow even if audit logging fails
    }
  } finally {
    if (captchaWidgetId && window.turnstile) {
      window.turnstile.reset(captchaWidgetId);
    }
    setIsLoading(false);
  }
};

  // Add proper sign out handling
  const handleSignOut = async () => {
    try {
      await auth.signOut();      
      setUser(null);
      setIsLoading(false);
      setShowMfaEnrollment(false);
      setShowMfaVerification(false);
      setMfaResolver(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // MFA handlers
  const handleMfaSuccess = () => {
    setShowMfaVerification(false);
    setMfaResolver(null);
    // The auth state listener will handle the rest
  };

  const handleMfaError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleMfaCancel = () => {
    setShowMfaVerification(false);
    setMfaResolver(null);
    setError('Authentication cancelled');
  };

  // MFA enrollment handlers
  const handleMfaEnrollmentSuccess = () => {
    setShowMfaEnrollment(false);
    setError('');
    // The auth state listener will re-evaluate the user's MFA status
  };

  const handleMfaEnrollmentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  useEffect(() => {
    return () => {
      if (captchaCooldownTimer.current) {
        clearTimeout(captchaCooldownTimer.current);
      }
      if (captchaCooldownInterval.current) {
        clearInterval(captchaCooldownInterval.current);
      }
    };
  }, []);

  

  return (
    <>
      {user ? (
        user.emailVerified ? (
          <Striae user={user} />
        ) : (
          <EmailVerification 
            user={user}            
            error={error}
            success={success}
            onError={setError}
            onSuccess={setSuccess}
            onSignOut={handleSignOut}            
          />
        )
      ) : isResetting ? (
        <PasswordReset onBack={() => setIsResetting(false)}/>
      ) : (
        <div className={styles.container}>
          <Link 
            viewTransition
            prefetch="intent"
            to="/" 
            className={styles.logoLink}>
            <div className={styles.logo} />
          </Link>
          <div className={styles.formWrapper}>
            <h1 className={styles.title}>{isLogin ? 'Login to Striae' : 'Register a Striae Account'}</h1>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="email"
                name="email"
                placeholder={isLogin ? "Email" : "Work Email Address"}
                autoComplete="email"
                className={styles.input}
                required
                disabled={isLoading}
              />
              {!isLogin && (
                <p className={styles.hint}>Registration is restricted to authorized users only</p>
              )}
              <div className={styles.passwordField}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className={styles.input}
                  required
                  disabled={isLoading}
                  onChange={(e) => !isLogin && checkPasswordStrength(e.target.value, confirmPasswordValue)}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon icon={showPassword ? "eye-off" : "eye"} />
                </button>
              </div>
              
              {!isLogin && (
                <>
                  <div className={styles.passwordField}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      autoComplete="new-password"
                      className={styles.input}
                      required
                      disabled={isLoading}
                      value={confirmPasswordValue}
                      onChange={(e) => {
                        setConfirmPasswordValue(e.target.value);
                        const passwordInput = (e.target.form?.elements.namedItem('password') as HTMLInputElement);
                        if (passwordInput) {
                          checkPasswordStrength(passwordInput.value, e.target.value);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      <Icon icon={showConfirmPassword ? "eye-off" : "eye"} />
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
                    onChange={(e) => setFirstName(e.target.value)}
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
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  <input
                    type="text"
                    name="company"
                    required={!AUTH_REGISTRATION_CONFIG.autoSetLabCompanyOnRegistration}
                    placeholder={`${AUTH_REGISTRATION_CONFIG.defaultLabCompanyName} (required)`}
                    autoComplete="organization"
                    className={styles.input}
                    disabled={isLoading || AUTH_REGISTRATION_CONFIG.autoSetLabCompanyOnRegistration}
                    value={AUTH_REGISTRATION_CONFIG.autoSetLabCompanyOnRegistration ? AUTH_REGISTRATION_CONFIG.defaultLabCompanyName : company}
                    onChange={(e) => setCompany(e.target.value)}
                  />                      
                  {passwordStrength && (
                    <div className={styles.passwordStrength}>
                      <pre>{passwordStrength}</pre>
                    </div>
                  )}
                </>
              )}
              
              {isLogin && (
                <button 
                  type="button"
                  onClick={() => setIsResetting(true)}
                  className={styles.resetLink}
                >
                  Forgot Password?
                </button>
              )}
              
              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.success}>{success}</p>}

              <Turnstile
                className="route-turnstile"
                onWidgetId={(id) => setCaptchaWidgetId(id)}
              />
              
              <button 
                type="submit" 
                className={styles.button}
                disabled={isLoading || isCheckingUser || isCaptchaCoolingDown}
              >
                {isCaptchaCoolingDown
                  ? `Try again in ${captchaCooldownSeconds || 1}s`
                  : isCheckingUser
                    ? 'Verifying account...'
                    : isLoading
                      ? 'Loading...'
                      : isLogin
                        ? 'Login'
                        : 'Register'}
              </button>
            </form>
            
            <p className={styles.toggle}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                  setPasswordStrength('');
                  setError('');
                  setFirstName('');
                  setLastName('');
                  setCompany('');
                  setConfirmPasswordValue('');
                }}
                className={styles.toggleButton}
                disabled={isLoading || isCheckingUser}
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      )}
      
      {isClient && showMfaVerification && mfaResolver && (
        <MFAVerification 
          resolver={mfaResolver}
          onSuccess={handleMfaSuccess}
          onError={handleMfaError}
          onCancel={handleMfaCancel}
        />
      )}
      
      {isClient && showMfaEnrollment && user && (
        <MFAEnrollment 
          user={user}
          onSuccess={handleMfaEnrollmentSuccess}
          onError={handleMfaEnrollmentError}
          mandatory={true}
        />
      )}
    </>
  );
};

export default Login;