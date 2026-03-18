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
  type MultiFactorError,
} from 'firebase/auth';
import { PasswordReset } from '~/routes/auth/passwordReset';
import { EmailVerification } from '~/routes/auth/emailVerification';
import { EmailActionHandler } from '~/routes/auth/emailActionHandler';
import { handleAuthError } from '~/services/firebase/errors';
import { MFAVerification } from '~/components/auth/mfa-verification';
import { MFAEnrollment } from '~/components/auth/mfa-enrollment';
import { Toast } from '~/components/toast/toast';
import styles from './login.module.css';
import { Striae } from '~/routes/striae/striae';
import { getUserData, createUser } from '~/utils/data';
import { auditService } from '~/services/audit';
import { generateUniqueId } from '~/utils/common';
import { evaluatePasswordPolicy, buildActionCodeSettings, userHasMFA } from '~/utils/auth';
import {
  getUserFirstName,
  getUserNameParts,
  isOAuthUser,
  getAuthErrorCode,
  getAuthErrorEmail,
} from './components/auth-utils';
import { SSOOnboarding } from './components/sso-onboarding';
import { LoginForm } from './components/login-form';

const APP_CANONICAL_ORIGIN = 'PAGES_CUSTOM_DOMAIN';
const SOCIAL_IMAGE_PATH = '/social-image.png';
const SOCIAL_IMAGE_ALT = 'Striae forensic annotation and comparison workspace';
const LOGIN_PATH_ALIASES = new Set(['/auth', '/auth/', '/auth/login', '/auth/login/']);

const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

type AuthMetaContent = {
  title: string;
  description: string;
  robots: string;
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
      title: "Striae: A Firearms Examiner's Comparison Companion",
      description:
        'Sign in to Striae to access your comparison annotation workspace, case files, and review tools.',
      robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    };
  }
  if (mode === 'resetPassword') {
    return {
      title: 'Striae | Reset Your Password',
      description:
        'Use this secure page to reset your Striae account password and restore access to your workspace.',
      robots: 'noindex,nofollow,noarchive',
    };
  }
  if (mode === 'verifyEmail') {
    return {
      title: 'Striae | Verify Your Email Address',
      description:
        'Confirm your email address to complete Striae account activation and continue securely.',
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

export const Login = () => {
  const [searchParams] = useSearchParams();
  const shouldShowWelcomeToastRef = useRef(false);
  const loginMethodRef = useRef<'firebase' | 'sso' | 'api-key' | 'manual'>('firebase');

  // Login state
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

  // OAuth account-linking state
  const [pendingOAuthCredential, setPendingOAuthCredential] = useState<AuthCredential | null>(null);
  const [pendingOAuthProviderLabel, setPendingOAuthProviderLabel] = useState('');
  const [pendingLinkEmail, setPendingLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [isLinkingAccount, setIsLinkingAccount] = useState(false);

  // SSO onboarding state
  const [pendingOAuthOnboardingUser, setPendingOAuthOnboardingUser] = useState<User | null>(null);
  const [oAuthOnboardingCompany, setOAuthOnboardingCompany] = useState('');

  // Email action parameters
  const actionMode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const continueUrl = searchParams.get('continueUrl');
  const actionLang = searchParams.get('lang');

  const shouldHandleEmailAction = Boolean(
    actionMode && actionCode && SUPPORTED_EMAIL_ACTION_MODES.has(actionMode),
  );

  // ─── OAuth link helpers ────────────────────────────────────────────────────

  const resetPendingOAuthLink = () => {
    setPendingOAuthCredential(null);
    setPendingOAuthProviderLabel('');
    setPendingLinkEmail('');
    setLinkPassword('');
    setIsLinkingAccount(false);
  };

  const tryStartOAuthAccountLink = async (
    authError: unknown,
    providerLabel: string,
    credentialExtractor: (err: FirebaseError) => AuthCredential | null,
  ): Promise<boolean> => {
    const errorCode = getAuthErrorCode(authError);
    if (errorCode !== 'auth/account-exists-with-different-credential') {
      return false;
    }
    const pendingCredential = credentialExtractor(authError as FirebaseError);
    const email = getAuthErrorEmail(authError);
    if (!pendingCredential || !email) {
      return false;
    }
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      if (signInMethods.includes(EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD)) {
        setPendingOAuthCredential(pendingCredential);
        setPendingOAuthProviderLabel(providerLabel);
        setPendingLinkEmail(email);
        setLinkPassword('');
        setError('');
        setSuccess(
          `An account with this email already exists. Enter your password below to link ${providerLabel} sign-in.`,
        );
        return true;
      }
      setError(
        `This email is already linked to another provider. Sign in with that provider first, then link ${providerLabel} from your account settings.`,
      );
      setSuccess('');
      return true;
    } catch (linkLookupError) {
      console.error('Failed to start account linking flow:', linkLookupError);
      setError('Unable to start account linking right now. Please try again.');
      setSuccess('');
      return true;
    }
  };

  const completePendingOAuthLink = async (currentUser: User) => {
    if (!pendingOAuthCredential) {
      return;
    }
    const label = pendingOAuthProviderLabel;
    await linkWithCredential(currentUser, pendingOAuthCredential);
    resetPendingOAuthLink();
    loginMethodRef.current = 'sso';
    shouldShowWelcomeToastRef.current = true;
    setError('');
    setSuccess(`${label} sign-in linked successfully. You can now sign in with either method.`);
  };

  // ─── Auth helpers ──────────────────────────────────────────────────────────

  const waitForCurrentUser = async (): Promise<User | null> => {
    const maxRetries = 10;
    const retryDelayMs = 100;
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      if (auth.currentUser) {
        return auth.currentUser;
      }
      await new Promise<void>((resolve) => { window.setTimeout(resolve, retryDelayMs); });
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
        let incidentType: 'unauthorized-access' | 'brute-force' | 'privilege-escalation' =
          'unauthorized-access';
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
          true,
        );
      }
    } catch (auditError) {
      console.error('Failed to log security violation audit:', auditError);
    }
  };

  const checkPasswordStrength = (password: string, confirmPassword?: string): boolean => {
    const normalizedConfirmPassword = confirmPassword ?? '';
    if (password.length === 0 && normalizedConfirmPassword.length === 0) {
      setPasswordStrength('');
      return false;
    }
    const policy = evaluatePasswordPolicy(password, confirmPassword);
    setPasswordStrength(
      `Password must contain:\n      ${!policy.hasMinLength ? '❌' : '✅'} At least 10 characters\n      ${!policy.hasUpperCase ? '❌' : '✅'} Capital letters\n      ${!policy.hasNumber ? '❌' : '✅'} Numbers\n      ${!policy.hasSpecialChar ? '❌' : '✅'} Special characters${confirmPassword !== undefined ? `\n      ${!policy.passwordsMatch ? '❌' : '✅'} Passwords must match` : ''}`,
    );
    return policy.isStrong;
  };

  const validateRegistrationEmail = (email: string): { valid: boolean } => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return { valid: emailRegex.test(email) };
  };

  const checkUserExists = async (currentUser: User): Promise<boolean> => {
    try {
      const userData = await getUserData(currentUser);
      return userData !== null;
    } catch {
      throw new Error('System error. Please try logging in at a later time.');
    }
  };

  // ─── Sign-out ──────────────────────────────────────────────────────────────

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
      setPendingOAuthOnboardingUser(null);
      setOAuthOnboardingCompany('');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // ─── SSO onboarding ────────────────────────────────────────────────────────

  const handleCompleteOAuthOnboarding = async () => {
    if (!pendingOAuthOnboardingUser) {
      return;
    }
    const trimmedCompany = oAuthOnboardingCompany.trim();
    if (!trimmedCompany) {
      setError('Please enter your organization name to continue.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const onboardingUser = pendingOAuthOnboardingUser;
      const { firstName: derivedFirstName, lastName: derivedLastName } = getUserNameParts(onboardingUser);
      await createUser(onboardingUser, derivedFirstName, derivedLastName, trimmedCompany, true);
      try {
        await auditService.logUserRegistration(
          onboardingUser,
          derivedFirstName,
          derivedLastName,
          trimmedCompany,
          'sso',
          navigator.userAgent,
        );
      } catch (auditError) {
        console.error('Failed to log SSO user registration audit:', auditError);
      }
      setPendingOAuthOnboardingUser(null);
      setOAuthOnboardingCompany('');
      loginMethodRef.current = 'sso';
      if (!userHasMFA(onboardingUser)) {
        setShowMfaEnrollment(true);
      } else {
        shouldShowWelcomeToastRef.current = true;
        setWelcomeToastMessage(`Welcome to Striae, ${getUserFirstName(onboardingUser)}!`);
        setIsWelcomeToastVisible(true);
        try {
          const sessionId = `session_${onboardingUser.uid}_${Date.now()}_${generateUniqueId(8)}`;
          await auditService.logUserLogin(onboardingUser, sessionId, 'sso', navigator.userAgent);
        } catch (auditError) {
          console.error('Failed to log user login audit:', auditError);
        }
      }
    } catch (err) {
      const { message } = handleAuthError(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Google sign-in ────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    shouldShowWelcomeToastRef.current = true;
    loginMethodRef.current = 'sso';
    resetPendingOAuthLink();
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      const linkingStarted = await tryStartOAuthAccountLink(
        err,
        'Google',
        (e) => GoogleAuthProvider.credentialFromError(e),
      );
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

  // ─── OAuth account linking ─────────────────────────────────────────────────

  const handleLinkOAuthAccount = async () => {
    if (!pendingOAuthCredential || !pendingLinkEmail) {
      return;
    }
    if (!linkPassword.trim()) {
      setError(`Enter your password to link your ${pendingOAuthProviderLabel} sign-in.`);
      setSuccess('');
      return;
    }
    setIsLinkingAccount(true);
    setError('');
    setSuccess('');
    try {
      loginMethodRef.current = 'firebase';
      const existingCredential = await signInWithEmailAndPassword(auth, pendingLinkEmail, linkPassword);
      await completePendingOAuthLink(existingCredential.user);
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
        setSuccess(`Complete MFA to finish linking ${pendingOAuthProviderLabel} sign-in.`);
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

  // ─── Email/password form submit ────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
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
        const createCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(createCredential.user, {
          displayName: `${formFirstName} ${formLastName}`,
        });
        const companyName = formCompany.trim();
        await createUser(createCredential.user, formFirstName, formLastName, companyName || '', true);
        try {
          await auditService.logUserRegistration(
            createCredential.user,
            formFirstName,
            formLastName,
            companyName || '',
            'email-password',
            navigator.userAgent,
          );
        } catch (auditError) {
          console.error('Failed to log user registration audit:', auditError);
        }
        await sendEmailVerification(createCredential.user, buildActionCodeSettings());
        try {
          await auditService.logEmailVerification(
            createCredential.user,
            'pending',
            'email-link',
            1,
            undefined,
            navigator.userAgent,
            [],
          );
        } catch (auditError) {
          console.error('Failed to log email verification audit:', auditError);
        }
        setError('');
        setSuccess('Account created successfully! Please check your email to verify your account.');
      } else {
        shouldShowWelcomeToastRef.current = true;
        loginMethodRef.current = 'firebase';
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (loginError: unknown) {
          if (
            loginError &&
            typeof loginError === 'object' &&
            'code' in loginError &&
            loginError.code === 'auth/multi-factor-auth-required'
          ) {
            const resolver = getMultiFactorResolver(auth, loginError as MultiFactorError);
            setMfaResolver(resolver);
            setShowMfaVerification(true);
            setIsLoading(false);
            return;
          }
          shouldShowWelcomeToastRef.current = false;
          loginMethodRef.current = 'firebase';
          throw loginError;
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

  // ─── MFA handlers ──────────────────────────────────────────────────────────

  const handleMfaSuccess = () => {
    const finalize = async () => {
      setShowMfaVerification(false);
      setMfaResolver(null);
      const currentUser = await waitForCurrentUser();
      if (pendingOAuthCredential && currentUser) {
        try {
          await completePendingOAuthLink(currentUser);
        } catch (linkError) {
          const { message } = handleAuthError(linkError);
          setError(message);
        }
      }
    };
    void finalize();
  };

  const handleMfaError = (errorMessage: string) => { setError(errorMessage); };

  const handleMfaCancel = () => {
    setShowMfaVerification(false);
    setMfaResolver(null);
    setError('Authentication cancelled');
  };

  const handleMfaEnrollmentSuccess = () => {
    setShowMfaEnrollment(false);
    setError('');
  };

  const handleMfaEnrollmentError = (errorMessage: string) => { setError(errorMessage); };

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let currentUser = user;
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
          setError('');
          setSuccess('Please verify your email before continuing. Check your inbox for the verification link.');
          setShowMfaEnrollment(false);
          setIsCheckingUser(false);
          return;
        }
        setIsCheckingUser(true);
        try {
          const userExists = await checkUserExists(currentUser);
          if (!userExists && isOAuthUser(currentUser)) {
            setPendingOAuthOnboardingUser(currentUser);
            setIsCheckingUser(false);
            return;
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
        if (!userHasMFA(currentUser)) {
          setShowMfaEnrollment(true);
          return;
        }
        console.log('User signed in:', currentUser.email);
        setShowMfaEnrollment(false);
        if (shouldShowWelcomeToastRef.current) {
          setWelcomeToastMessage(`Welcome to Striae, ${getUserFirstName(currentUser)}!`);
          setIsWelcomeToastVisible(true);
          shouldShowWelcomeToastRef.current = false;
        }
        try {
          const sessionId = `session_${currentUser.uid}_${Date.now()}_${generateUniqueId(8)}`;
          await auditService.logUserLogin(currentUser, sessionId, loginMethodRef.current, navigator.userAgent);
        } catch (auditError) {
          console.error('Failed to log user login audit:', auditError);
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
    return () => { isMounted = false; };
  }, [shouldHandleEmailAction]);

  // ─── Render ────────────────────────────────────────────────────────────────

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
        pendingOAuthOnboardingUser ? (
          <SSOOnboarding
            user={pendingOAuthOnboardingUser}
            company={oAuthOnboardingCompany}
            error={error}
            isLoading={isLoading}
            onCompanyChange={setOAuthOnboardingCompany}
            onSubmit={() => void handleCompleteOAuthOnboarding()}
          />
        ) : user.emailVerified ? (
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
        <PasswordReset onBack={() => setIsResetting(false)} />
      ) : (
        <div className={styles.container}>
          <Link viewTransition prefetch="intent" to="/" className={styles.logoLink}>
            <div className={styles.logo} />
          </Link>
          <LoginForm
            isLogin={isLogin}
            onToggleMode={() => {
              setIsLogin(!isLogin);
              setShowPassword(false);
              setShowConfirmPassword(false);
              setPasswordStrength('');
              setError('');
              setFirstName('');
              setLastName('');
              setCompany('');
              setConfirmPasswordValue('');
              resetPendingOAuthLink();
            }}
            isLoading={isLoading}
            isCheckingUser={isCheckingUser}
            onSubmit={(e) => void handleSubmit(e)}
            error={error}
            success={success}
            showPassword={showPassword}
            onToggleShowPassword={() => setShowPassword(!showPassword)}
            showConfirmPassword={showConfirmPassword}
            onToggleShowConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
            confirmPasswordValue={confirmPasswordValue}
            onConfirmPasswordChange={setConfirmPasswordValue}
            onPasswordChange={checkPasswordStrength}
            passwordStrength={passwordStrength}
            firstName={firstName}
            onFirstNameChange={setFirstName}
            lastName={lastName}
            onLastNameChange={setLastName}
            company={company}
            onCompanyChange={setCompany}
            onForgotPassword={() => setIsResetting(true)}
            onGoogleSignIn={() => void handleGoogleSignIn()}
            pendingOAuthCredential={pendingOAuthCredential}
            pendingLinkEmail={pendingLinkEmail}
            pendingOAuthProviderLabel={pendingOAuthProviderLabel}
            linkPassword={linkPassword}
            onLinkPasswordChange={setLinkPassword}
            isLinkingAccount={isLinkingAccount}
            onLinkOAuthAccount={() => void handleLinkOAuthAccount()}
            onCancelOAuthLink={resetPendingOAuthLink}
          />
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
