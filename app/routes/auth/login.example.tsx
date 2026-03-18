import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, type MetaFunction } from 'react-router';
import type { FirebaseError } from 'firebase/app';
import { auth } from '~/services/firebase';
import {
    signInWithEmailAndPassword, 
    signInWithPopup,
    fetchSignInMethodsForEmail,
    linkWithCredential,
    EmailAuthProvider,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
    GoogleAuthProvider,
  type AuthCredential,
  type User,
    updateProfile,
    getMultiFactorResolver,
    type MultiFactorResolver,
    type MultiFactorError
} from 'firebase/auth';
import { PasswordReset } from '~/routes/auth/passwordReset';
import { EmailVerification } from '~/routes/auth/emailVerification';
import { EmailActionHandler } from '~/routes/auth/emailActionHandler';
import { handleAuthError } from '~/services/firebase/errors';
import { MFAVerification } from '~/components/auth/mfa-verification';
import { MFAEnrollment } from '~/components/auth/mfa-enrollment';
import { Toast } from '~/components/toast/toast';
import { Icon } from '~/components/icon/icon';
import styles from './login.module.css';
import { Striae } from '~/routes/striae/striae';
import { getUserData, createUser } from '~/utils/data';
import { auditService } from '~/services/audit';
import { generateUniqueId } from '~/utils/common';
import { evaluatePasswordPolicy, buildActionCodeSettings, userHasMFA } from '~/utils/auth';

const APP_CANONICAL_ORIGIN = 'PAGES_CUSTOM_DOMAIN';
const SOCIAL_IMAGE_PATH = '/social-image.png';
const SOCIAL_IMAGE_ALT = 'Striae forensic annotation and comparison workspace';
const LOGIN_PATH_ALIASES = new Set(['/auth', '/auth/', '/auth/login', '/auth/login/']);
const GOOGLE_PROVIDER_ID = 'google.com';

const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

type AuthMetaContent = {
  title: string;
  description: string;
  robots: string;
};

type UserNameParts = {
  firstName: string;
  lastName: string;
};

const getCanonicalPath = (pathname: string): string => {
  if (!pathname || LOGIN_PATH_ALIASES.has(pathname)) {
    return '/';
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

const getAuthMetaContent = (mode: string | null, hasActionCode: boolean): AuthMetaContent => {
  if (!mode && !hasActionCode) {
    return {
      title: 'Striae: A Firearms Examiner\'s Comparison Companion',
      description: 'Sign in to Striae to access your comparison annotation workspace, case files, and review tools.',
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    };
  }

  if (mode === 'resetPassword') {
    return {
      title: 'Striae | Reset Your Password',
      description: 'Use this secure page to reset your Striae account password and restore access to your workspace.',
      robots: 'noindex,nofollow,noarchive',
    };
  }

  if (mode === 'verifyEmail') {
    return {
      title: 'Striae | Verify Your Email Address',
      description: 'Confirm your email address to complete Striae account activation and continue securely.',
      robots: 'noindex,nofollow,noarchive',
    };
  }

  if (mode === 'recoverEmail') {
    return {
      title: 'Striae | Recover Email Access',
      description: 'Complete your Striae account email recovery steps securely.',
      robots: 'noindex,nofollow,noarchive',
    };
  }

  return {
    title: 'Striae | Account Action',
    description: 'Complete your Striae account action securely.',
    robots: 'noindex,nofollow,noarchive',
  };
};

export const meta: MetaFunction = ({ location }) => {
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode');
  const hasActionCode = Boolean(searchParams.get('oobCode'));

  const canonicalPath = getCanonicalPath(location.pathname);
  const canonicalHref = `${APP_CANONICAL_ORIGIN}${canonicalPath}`;
  const socialImageHref = `${APP_CANONICAL_ORIGIN}${SOCIAL_IMAGE_PATH}`;
  const { title, description, robots } = getAuthMetaContent(mode, hasActionCode);

  return [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: robots },
    { property: 'og:site_name', content: 'Striae' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonicalHref },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: socialImageHref },
    { property: 'og:image:secure_url', content: socialImageHref },
    { property: 'og:image:alt', content: SOCIAL_IMAGE_ALT },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: socialImageHref },
    { name: 'twitter:image:alt', content: SOCIAL_IMAGE_ALT },
    { tagName: 'link', rel: 'canonical', href: canonicalHref },
  ];
};

const SUPPORTED_EMAIL_ACTION_MODES = new Set(['resetPassword', 'verifyEmail', 'recoverEmail']);

const getUserFirstName = (user: User): string => {
  const displayName = user.displayName?.trim();
  if (displayName) {
    const [firstName] = displayName.split(/\s+/);
    if (firstName) {
      return firstName;
    }
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  if (emailPrefix) {
    return emailPrefix;
  }

  return 'User';
};

const getUserNameParts = (user: User): UserNameParts => {
  const displayName = user.displayName?.trim();
  if (displayName) {
    const [firstName = 'User', ...lastNameParts] = displayName.split(/\s+/);
    return {
      firstName,
      lastName: lastNameParts.join(' '),
    };
  }

  const emailPrefix = user.email?.split('@')[0]?.trim();
  if (emailPrefix) {
    return {
      firstName: emailPrefix,
      lastName: '',
    };
  }

  return {
    firstName: 'User',
    lastName: '',
  };
};

const isGoogleAuthUser = (user: User): boolean => {
  return user.providerData.some((providerData) => providerData.providerId === GOOGLE_PROVIDER_ID);
};

export const Login = () => {
  const [searchParams] = useSearchParams();
  const shouldShowWelcomeToastRef = useRef(false);
  const loginMethodRef = useRef<'firebase' | 'sso' | 'api-key' | 'manual'>('firebase');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [welcomeToastMessage, setWelcomeToastMessage] = useState('');
  const [isWelcomeToastVisible, setIsWelcomeToastVisible] = useState(false);
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
  
  // MFA state
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<AuthCredential | null>(null);
  const [pendingLinkEmail, setPendingLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);

  const actionMode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');
  const actionLang = searchParams.get('lang');

  const resetPendingGoogleLink = () => {
    setPendingGoogleCredential(null);
    setPendingLinkEmail('');
    setLinkPassword('');
    setIsLinkingAccount(false);
  };

  const getAuthErrorCode = (authError: unknown): string => {
    if (authError && typeof authError === 'object' && 'code' in authError && typeof authError.code === 'string') {
      return authError.code;
    }

    return 'unknown';
  };

  const getAuthErrorEmail = (authError: unknown): string => {
    if (
      authError &&
      typeof authError === 'object' &&
      'customData' in authError &&
      authError.customData &&
      typeof authError.customData === 'object' &&
      'email' in authError.customData &&
      typeof authError.customData.email === 'string'
    ) {
      return authError.customData.email;
    }

    return '';
  };

  const waitForCurrentUser = async (): Promise<User | null> => {
    const maxRetries = 10;
    const retryDelayMs = 100;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      if (auth.currentUser) {
        return auth.currentUser;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, retryDelayMs);
      });
    }

    return auth.currentUser;
  };

  const logFailedAuthAttempt = async (authError: unknown, message: string): Promise<void> => {
    try {
      const errorCode = getAuthErrorCode(authError);
      const isAuthError = typeof errorCode === 'string' && errorCode.startsWith('auth/');

      if (
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request' ||
        errorCode === 'auth/popup-blocked' ||
        errorCode === 'auth/account-exists-with-different-credential'
      ) {
        return;
      }

      if (isAuthError) {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        let incidentType: 'unauthorized-access' | 'brute-force' | 'privilege-escalation' = 'unauthorized-access';

        if (errorCode === 'auth/too-many-requests') {
          severity = 'high';
          incidentType = 'brute-force';
        } else if (errorCode === 'auth/user-disabled') {
          severity = 'critical';
        }

        await auditService.logSecurityViolation(
          null,
          incidentType,
          severity,
          `Failed authentication attempt: ${errorCode} - ${message}`,
          'authentication-endpoint',
          true
        );
      }
    } catch (auditError) {
      console.error('Failed to log security violation audit:', auditError);
    }
  };

  const tryStartGoogleAccountLink = async (authError: unknown): Promise<boolean> => {
    const errorCode = getAuthErrorCode(authError);
    if (errorCode !== 'auth/account-exists-with-different-credential') {
      return false;
    }

    const pendingCredential = GoogleAuthProvider.credentialFromError(authError as FirebaseError);
    const email = getAuthErrorEmail(authError);

    if (!pendingCredential || !email) {
      return false;
    }

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);

      if (signInMethods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD)) {
        setPendingGoogleCredential(pendingCredential);
        setPendingLinkEmail(email);
        setLinkPassword('');
        setError('');
        setSuccess('An account with this email already exists. Enter your password below to link Google sign-in.');
        return true;
      }

      setError('This email is already linked to another provider. Sign in with that provider first, then link Google from your account settings.');
      setSuccess('');
      return true;
    } catch (linkLookupError) {
      console.error('Failed to start account linking flow:', linkLookupError);
      setError('Unable to start account linking right now. Please try again.');
      setSuccess('');
      return true;
    }
  };

  const completePendingGoogleLink = async (currentUser: User) => {
    if (!pendingGoogleCredential) {
      return;
    }

    await linkWithCredential(currentUser, pendingGoogleCredential);
    resetPendingGoogleLink();
    loginMethodRef.current = 'sso';
    shouldShowWelcomeToastRef.current = true;
    setError('');
    setSuccess('Google sign-in linked successfully. You can now sign in with either method.');
  };

  const ensureGoogleUserRecord = async (googleUser: User): Promise<void> => {
    const userData = await getUserData(googleUser);
    if (userData) {
      return;
    }

    const { firstName: derivedFirstName, lastName: derivedLastName } = getUserNameParts(googleUser);
    const derivedCompany = googleUser.email?.split('@')[1]?.trim() || '';

    await createUser(
      googleUser,
      derivedFirstName,
      derivedLastName,
      derivedCompany,
      true
    );

    try {
      await auditService.logUserRegistration(
        googleUser,
        derivedFirstName,
        derivedLastName,
        derivedCompany,
        'sso',
        navigator.userAgent
      );
    } catch (auditError) {
      console.error('Failed to log Google user registration audit:', auditError);
    }
  };

  const shouldHandleEmailAction = Boolean(
    actionMode &&
    actionCode &&
    SUPPORTED_EMAIL_ACTION_MODES.has(actionMode)
  );

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Email validation with regex
  const validateRegistrationEmail = (email: string): { valid: boolean } => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false };
    }

    return { valid: true };
  };

  const checkPasswordStrength = (password: string, confirmPassword?: string): boolean => {
    const normalizedConfirmPassword = confirmPassword ?? '';
    if (password.length === 0 && normalizedConfirmPassword.length === 0) {
      setPasswordStrength('');
      return false;
    }

    const policy = evaluatePasswordPolicy(password, confirmPassword);

    setPasswordStrength(
      `Password must contain:
      ${!policy.hasMinLength ? '❌' : '✅'} At least 10 characters
      ${!policy.hasUpperCase ? '❌' : '✅'} Capital letters
      ${!policy.hasNumber ? '❌' : '✅'} Numbers
      ${!policy.hasSpecialChar ? '❌' : '✅'} Special characters${confirmPassword !== undefined ? `
      ${!policy.passwordsMatch ? '❌' : '✅'} Passwords must match` : ''}`
    );
    
    return policy.isStrong;
  };  

  // Check if user exists in the USER_DB using centralized function
  const checkUserExists = async (currentUser: User): Promise<boolean> => {
    try {
      const userData = await getUserData(currentUser);
      
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
      let currentUser = user;

      // Refresh auth profile so emailVerified is accurate right after email verification.
      try {
        await currentUser.reload();
        if (auth.currentUser) {
          currentUser = auth.currentUser;
        }
      } catch (reloadError) {
        console.error('Failed to refresh user verification status:', reloadError);
      }

      setUser(currentUser);
      
      if (!currentUser.emailVerified) {
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
        let userExists = await checkUserExists(currentUser);

        if (!userExists && isGoogleAuthUser(currentUser)) {
          await ensureGoogleUserRecord(currentUser);
          userExists = true;
        }

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
      if (!userHasMFA(currentUser)) {
        // User has no MFA factors enrolled - require enrollment
        setShowMfaEnrollment(true);
        return;
      }
      
      console.log("User signed in:", currentUser.email);
      setShowMfaEnrollment(false);

      if (shouldShowWelcomeToastRef.current) {
        setWelcomeToastMessage(`Welcome to Striae, ${getUserFirstName(currentUser)}!`);
        setIsWelcomeToastVisible(true);
        shouldShowWelcomeToastRef.current = false;
      }
      
      // Log successful login audit
      try {
        const sessionId = `session_${currentUser.uid}_${Date.now()}_${generateUniqueId(8)}`;
        await auditService.logUserLogin(
          currentUser,
          sessionId,
          loginMethodRef.current,
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
      setIsWelcomeToastVisible(false);
      shouldShowWelcomeToastRef.current = false;
    }
  });

   return () => unsubscribe();
}, []);

  useEffect(() => {
    if (shouldHandleEmailAction) {
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    let isMounted = true;

    const syncMfaAfterEmailAction = async () => {
      try {
        await currentUser.reload();
        const refreshedUser = auth.currentUser ?? currentUser;

        if (!isMounted) {
          return;
        }

        setUser(refreshedUser);

        if (!refreshedUser.emailVerified) {
          return;
        }

        setShowMfaEnrollment(!userHasMFA(refreshedUser));
      } catch (refreshError) {
        console.error('Failed to sync MFA state after email action:', refreshError);
      }
    };

    void syncMfaAfterEmailAction();

    return () => {
      isMounted = false;
    };
  }, [shouldHandleEmailAction]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    shouldShowWelcomeToastRef.current = true;
    loginMethodRef.current = 'sso';
    resetPendingGoogleLink();

    try {
      const signInCredential = await signInWithPopup(auth, googleAuthProvider);

      if (isGoogleAuthUser(signInCredential.user)) {
        await ensureGoogleUserRecord(signInCredential.user);
      }
    } catch (err: unknown) {
      const linkingStarted = await tryStartGoogleAccountLink(err);
      if (linkingStarted) {
        shouldShowWelcomeToastRef.current = false;
        loginMethodRef.current = 'firebase';
        return;
      }

      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'auth/multi-factor-auth-required'
      ) {
        const resolver = getMultiFactorResolver(auth, err as MultiFactorError);
        setMfaResolver(resolver);
        setShowMfaVerification(true);
        setIsLoading(false);
        return;
      }

      shouldShowWelcomeToastRef.current = false;
      loginMethodRef.current = 'firebase';
      const { message } = handleAuthError(err);
      setError(message);
      await logFailedAuthAttempt(err, message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGoogleAccount = async () => {
    if (!pendingGoogleCredential || !pendingLinkEmail) {
      return;
    }

    if (!linkPassword.trim()) {
      setError('Enter your password to link your Google sign-in.');
      setSuccess('');
      return;
    }

    setIsLinkingAccount(true);
    setError('');
    setSuccess('');

    try {
      loginMethodRef.current = 'firebase';
      const existingCredential = await signInWithEmailAndPassword(auth, pendingLinkEmail, linkPassword);
      await completePendingGoogleLink(existingCredential.user);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'auth/multi-factor-auth-required'
      ) {
        const resolver = getMultiFactorResolver(auth, err as MultiFactorError);
        setMfaResolver(resolver);
        setShowMfaVerification(true);
        setSuccess('Complete MFA to finish linking Google sign-in.');
        return;
      }

      const { message } = handleAuthError(err);
      setError(message);
      setSuccess('');
      await logFailedAuthAttempt(err, message);
    } finally {
      setIsLinkingAccount(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');
  setSuccess('');

  const formData = new FormData(e.currentTarget as HTMLFormElement);
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  // Use state values for these fields instead of FormData
  const formFirstName = firstName;
  const formLastName = lastName;
  const formCompany = company;

  try {
    if (!isLogin) {
      const emailValidation = validateRegistrationEmail(email);
      if (!emailValidation.valid) {
        setError('Please enter a valid email address');
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
    }

    if (!isLogin) {
      // Registration
      const createCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(createCredential.user, {
        displayName: `${formFirstName} ${formLastName}`
      });

      const companyName = formCompany.trim();

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

      await sendEmailVerification(createCredential.user, buildActionCodeSettings());
      
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
      shouldShowWelcomeToastRef.current = true;
      loginMethodRef.current = 'firebase';
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
        shouldShowWelcomeToastRef.current = false;
        loginMethodRef.current = 'firebase';
        throw loginError; // Re-throw non-MFA errors
      }
    }
  } catch (err) {
    shouldShowWelcomeToastRef.current = false;
    loginMethodRef.current = 'firebase';
    const { message } = handleAuthError(err);
    setError(message);

    await logFailedAuthAttempt(err, message);
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
      setIsWelcomeToastVisible(false);
      shouldShowWelcomeToastRef.current = false;
      loginMethodRef.current = 'firebase';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // MFA handlers
  const handleMfaSuccess = () => {
    const finalize = async () => {
      setShowMfaVerification(false);
      setMfaResolver(null);

      const currentUser = await waitForCurrentUser();

      if (pendingGoogleCredential && currentUser) {
        try {
          await completePendingGoogleLink(currentUser);
        } catch (linkError) {
          const { message } = handleAuthError(linkError);
          setError(message);
        }
      }
      // The auth state listener will handle the rest
    };

    void finalize();
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
      {shouldHandleEmailAction ? (
        <EmailActionHandler
          mode={actionMode}
          oobCode={actionCode}
          continueUrl={continueUrl}
          lang={actionLang}
        />
      ) : user ? (
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
                placeholder={isLogin ? "Email" : "Email Address"}
                autoComplete="email"
                className={styles.input}
                required
                disabled={isLoading}
              />
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
                    required
                    placeholder="Company/Lab (required)"
                    autoComplete="organization"
                    className={styles.input}
                    disabled={isLoading}
                    value={company}
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
              
              <button 
                type="submit" 
                className={styles.button}
                disabled={isLoading || isCheckingUser}
              >
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
                    onClick={handleGoogleSignIn}
                    disabled={isLoading || isCheckingUser}
                  >
                    Continue with Google
                  </button>
                </>
              )}

              {isLogin && pendingGoogleCredential && pendingLinkEmail && (
                <div className={styles.linkAccountSection}>
                  <p className={styles.linkAccountTitle}>Link Existing Account</p>
                  <p className={styles.linkAccountDescription}>
                    Enter the password for {pendingLinkEmail} to link Google sign-in.
                  </p>
                  <input
                    type="password"
                    name="linkPassword"
                    placeholder="Current password"
                    autoComplete="current-password"
                    className={styles.input}
                    disabled={isLoading || isCheckingUser || isLinkingAccount}
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                  />
                  <div className={styles.linkAccountActions}>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={handleLinkGoogleAccount}
                      disabled={isLoading || isCheckingUser || isLinkingAccount}
                    >
                      {isLinkingAccount ? 'Linking...' : 'Link Google Sign-In'}
                    </button>
                    <button
                      type="button"
                      className={styles.linkCancelButton}
                      onClick={resetPendingGoogleLink}
                      disabled={isLoading || isCheckingUser || isLinkingAccount}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
                  resetPendingGoogleLink();
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
      
      {!shouldHandleEmailAction && isClient && showMfaVerification && mfaResolver && (
        <MFAVerification 
          resolver={mfaResolver}
          onSuccess={handleMfaSuccess}
          onError={handleMfaError}
          onCancel={handleMfaCancel}
        />
      )}
      
      {!shouldHandleEmailAction && isClient && showMfaEnrollment && user && (
        <MFAEnrollment 
          user={user}
          onSuccess={handleMfaEnrollmentSuccess}
          onError={handleMfaEnrollmentError}
          mandatory={true}
        />
      )}

      {!shouldHandleEmailAction && (
        <Toast
          message={welcomeToastMessage}
          type="success"
          isVisible={isWelcomeToastVisible}
          onClose={() => setIsWelcomeToastVisible(false)}
        />
      )}
      
    </>
  );
};

export default Login;