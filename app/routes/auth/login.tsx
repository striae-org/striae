import { useState, useEffect } from 'react';
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
import { handleAuthError } from '~/services/firebase-errors';
import { MFAVerification } from '~/components/auth/mfa-verification';
import { MFAEnrollment } from '~/components/auth/mfa-enrollment';
import { Icon } from '~/components/icon/icon';
import styles from './login.module.css';
import { baseMeta } from '~/utils/meta';
import { Striae } from '~/routes/striae/striae';
import { getUserApiKey } from '~/utils/auth';
import paths from '~/config/config.json';
import freeEmailDomains from 'free-email-domains';

export const meta = () => {
  return baseMeta({
    title: 'Welcome to Striae',
    description: 'Login to your Striae account to access your projects and data',
  });
};

interface UserData {
  uid: string;
  email: string | null;
  firstName: string;
  lastName: string;
  company: string;
  permitted: boolean;
  cases: Array<{
    caseNumber: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const USER_WORKER_URL = paths.user_worker_url;

const createUserData = (
  uid: string,
  email: string | null,
  firstName: string,
  lastName: string,
  company: string
): UserData => ({
  uid,
  email,
  firstName,
  lastName,
  company,
  permitted: true,
  cases: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export const Login = () => {
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // MFA state
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Email validation with regex and domain checking
  const validateEmailDomain = (email: string): boolean => {
    // Email regex pattern for basic validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // First check if email format is valid
    if (!emailRegex.test(email)) {
      return false;
    }
    
    const emailDomain = email.toLowerCase().split('@')[1];
    return !!emailDomain && !freeEmailDomains.includes(emailDomain);
  };

  const checkPasswordStrength = (password: string): boolean => {
    const hasMinLength = password.length >= 10;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const isStrong = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
    setPasswordStrength(
      `Password must contain:
      ${!hasMinLength ? '❌' : '✅'} At least 10 characters
      ${!hasUpperCase ? '❌' : '✅'} Capital letters
      ${!hasNumber ? '❌' : '✅'} Numbers
      ${!hasSpecialChar ? '❌' : '✅'} Special characters`
    );
    
    return isStrong;
  };  

  // Check if user exists in the USER_DB
  const checkUserExists = async (uid: string): Promise<boolean> => {
    try {
      const apiKey = await getUserApiKey();
      const response = await fetch(`${USER_WORKER_URL}/${uid}`, {
        headers: {
          'X-Custom-Auth-Key': apiKey
        }
      });
      
      // If response is 404, user doesn't exist
      if (response.status === 404) {
        return false;
      }
      
      // If response is ok, user exists
      if (response.ok) {
        return true;
      }
      
      // For other errors (500, etc.), log but assume user exists to avoid false positives
      console.error('Error checking user existence, status:', response.status);
      return true;
    } catch (error) {
      console.error('Error checking user existence:', error);
      // On network/API errors, assume user exists to avoid false positives
      return true;
    }
  };  

   useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
   if (user) {
      if (!user.emailVerified) {
        handleSignOut();
        setError('Please verify your email before logging in');
        return;
      }      
      
      // Check if user exists in the USER_DB
      setIsCheckingUser(true);
      const userExists = await checkUserExists(user.uid);
      setIsCheckingUser(false);
      
      if (!userExists) {
        handleSignOut();
        setError('This account does not exist or has been deleted');
        return;
      }
      
      // Check if user has MFA enrolled
      const mfaFactors = multiFactor(user).enrolledFactors;
      if (mfaFactors.length === 0) {
        // User has no MFA factors enrolled - require enrollment
        setShowMfaEnrollment(true);
        setUser(user); // Still set user so enrollment component can use it
        return;
      }
      
      console.log("Logged in user:", user.email);
      setUser(user);
      setShowMfaEnrollment(false);      
    } else {
      console.log("No user logged in");
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

  const formData = new FormData(e.currentTarget as HTMLFormElement);
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const company = formData.get('company') as string;

  try {
    if (!isLogin) {
      // Registration validation
      if (!validateEmailDomain(email)) {
        setError('Please use a work email address. Personal email providers (Gmail, Yahoo, etc.) are not allowed');
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
        displayName: `${firstName} ${lastName}`
      });

      // Get API key      
      const apiKey = await getUserApiKey();

      // Add to KV database
      const userData = createUserData(
        createCredential.user.uid,
        createCredential.user.email,
        firstName,
        lastName,
        company || '' // Use company from form, fallback to empty string
      );

      const response = await fetch(`${USER_WORKER_URL}/${createCredential.user.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Auth-Key': apiKey
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to create user data');
      }

      await sendEmailVerification(createCredential.user);
      setError('Please check your email to verify your account');
      handleSignOut();
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
  } finally {
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

  return (
    <>
      {user ? (
        user.emailVerified ? (
          <Striae user={user} />
        ) : (
          <div className={styles.verificationPrompt}>
            <h2>Email Verification Required</h2>
            <p>Please check your email and verify your account before continuing.</p>
            <button 
              onClick={handleSignOut}
              className={styles.button}
            >
              Sign Out
            </button>
          </div>
        )
      ) : isResetting ? (
        <PasswordReset onBack={() => setIsResetting(false)}/>
      ) : (
        <div className={styles.container}>
          <Link 
            viewTransition
            prefetch="intent"
            to="/#top" 
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
                <p className={styles.hint}>Please use your work email address. Personal email providers (Gmail, Yahoo, Outlook, etc.) are not allowed.</p>
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
                  onChange={(e) => !isLogin && checkPasswordStrength(e.target.value)}
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
                  />
                  <input
                    type="text"
                    name="lastName"
                    required
                    placeholder="Last Name (required)"
                    autoComplete="family-name"
                    className={styles.input}
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    name="company"
                    required
                    placeholder="Lab/Company Name (required)"
                    autoComplete="organization"
                    className={styles.input}
                    disabled={isLoading}
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
              
              <button 
                type="submit" 
                className={styles.button}
                disabled={isLoading || isCheckingUser}
              >
                {isCheckingUser ? 'Verifying account...' : isLoading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
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