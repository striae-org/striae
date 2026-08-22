import { useState, useCallback, useEffect, useRef } from 'react';
import {
	EmailAuthProvider,
	getMultiFactorResolver,
	PhoneAuthProvider,
	PhoneMultiFactorGenerator,
	RecaptchaVerifier,
	multiFactor,
	reauthenticateWithCredential,
	type MultiFactorError,
	type MultiFactorInfo,
	type MultiFactorResolver,
	type User,
} from 'firebase/auth';
import { auth } from '~/services/firebase';
import { ERROR_MESSAGES, getValidationError, handleAuthError } from '~/services/firebase/errors';
import { hasTotpEnrolled, getMaskedFactorDisplay } from '~/utils/auth';
import { MfaTotpEnrollment } from '../auth/mfa-totp-enrollment';
import { FormButton, FormMessage } from '../form';
import styles from './user.module.css';

const TOTP_RECAPTCHA_CONTAINER_ID = 'recaptcha-container-totp-section';

interface MfaTotpSectionProps {
	user: User | null;
	isOpen: boolean;
	onBusyChange?: (isBusy: boolean) => void;
	onTotpEnrolled: () => void;
}

export const MfaTotpSection = ({ user, isOpen, onBusyChange, onTotpEnrolled }: MfaTotpSectionProps) => {
	const [showEnrollment, setShowEnrollment] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [isTotpEnrolled, setIsTotpEnrolled] = useState(false);

	// Re-auth state
	const [showReauthPrompt, setShowReauthPrompt] = useState(false);
	const [reauthPassword, setReauthPassword] = useState('');
	const [reauthResolver, setReauthResolver] = useState<MultiFactorResolver | null>(null);
	const [reauthHint, setReauthHint] = useState<MultiFactorInfo | null>(null);
	const [reauthVerificationId, setReauthVerificationId] = useState('');
	const [reauthVerificationCode, setReauthVerificationCode] = useState('');
	const [isReauthCodeSent, setIsReauthCodeSent] = useState(false);
	const [isReauthLoading, setIsReauthLoading] = useState(false);
	const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

	const isBusy = isLoading || isReauthLoading;

	const resetReauthFlow = useCallback(() => {
		setShowReauthPrompt(false);
		setReauthPassword('');
		setReauthResolver(null);
		setReauthHint(null);
		setReauthVerificationId('');
		setReauthVerificationCode('');
		setIsReauthCodeSent(false);
	}, []);

	const refreshTotpStatus = useCallback(async (currentUser: User) => {
		await currentUser.reload();
		setIsTotpEnrolled(hasTotpEnrolled(currentUser));
	}, []);

	useEffect(() => {
		if (isOpen && user) {
			void refreshTotpStatus(user);
			setShowEnrollment(false);
			setError('');
			setSuccess('');
			resetReauthFlow();
		}
	}, [isOpen, user, refreshTotpStatus, resetReauthFlow]);

	useEffect(() => {
		onBusyChange?.(isBusy);
	}, [isBusy, onBusyChange]);

	useEffect(() => {
		return () => {
			onBusyChange?.(false);
		};
	}, [onBusyChange]);

	useEffect(() => {
		if (!isOpen || !user) return;

		const verifier = new RecaptchaVerifier(auth, TOTP_RECAPTCHA_CONTAINER_ID, {
			size: 'invisible',
			callback: () => {},
			'expired-callback': () => {
				setError(getValidationError('MFA_RECAPTCHA_EXPIRED'));
			},
		});
		recaptchaVerifierRef.current = verifier;

		return () => {
			verifier.clear();
			recaptchaVerifierRef.current = null;
		};
	}, [isOpen, user]);

	const handleStartEnrollment = async () => {
		if (!user) {
			setError(ERROR_MESSAGES.NO_USER);
			return;
		}

		setIsLoading(true);
		setError('');
		setSuccess('');

		try {
			// Attempt a dummy getSession to trigger re-auth if needed
			await multiFactor(user).getSession();
			setShowEnrollment(true);
		} catch (err) {
			const { data, message } = handleAuthError(err);

			if (data?.code === 'auth/requires-recent-login') {
				const supportsPasswordReauth = user.providerData.some((p) => p.providerId === 'password');
				if (supportsPasswordReauth && user.email) {
					resetReauthFlow();
					setShowReauthPrompt(true);
					return;
				}
				setError('For security, please sign out and sign in again, then try this action again.');
				return;
			}

			setError(message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleReauthenticate = async () => {
		if (!user) {
			setError(ERROR_MESSAGES.NO_USER);
			return;
		}
		if (!user.email) {
			setError('Please sign out and sign in again to continue.');
			return;
		}
		if (!reauthPassword.trim()) {
			setError('Please enter your password to continue.');
			return;
		}

		setIsReauthLoading(true);
		setError('');

		try {
			const credential = EmailAuthProvider.credential(user.email, reauthPassword);
			await reauthenticateWithCredential(user, credential);
			resetReauthFlow();
			setShowEnrollment(true);
		} catch (err) {
			const { data, message } = handleAuthError(err);

			if (data?.code === 'auth/multi-factor-auth-required') {
				if (!recaptchaVerifierRef.current) {
					setError(getValidationError('MFA_RECAPTCHA_ERROR'));
					return;
				}

				const resolver = getMultiFactorResolver(auth, err as MultiFactorError);
				const phoneHint = resolver.hints.find((h) => h.factorId === PhoneMultiFactorGenerator.FACTOR_ID);

				if (!phoneHint) {
					setError('This account requires a non-phone MFA method. Please sign out and sign in again.');
					return;
				}

				setShowReauthPrompt(true);
				setReauthResolver(resolver);
				setReauthHint(phoneHint);
				setReauthVerificationId('');
				setReauthVerificationCode('');
				setIsReauthCodeSent(false);
				return;
			}

			setError(message);
		} finally {
			setIsReauthLoading(false);
		}
	};

	const handleSendReauthCode = async () => {
		const captchaVerifier = recaptchaVerifierRef.current;
		if (!reauthResolver || !reauthHint || !captchaVerifier) {
			setError(getValidationError('MFA_RECAPTCHA_ERROR'));
			return;
		}

		setIsReauthLoading(true);
		setError('');

		try {
			const phoneAuthProvider = new PhoneAuthProvider(auth);
			const verificationId = await phoneAuthProvider.verifyPhoneNumber(
				{ multiFactorHint: reauthHint, session: reauthResolver.session },
				captchaVerifier,
			);
			setReauthVerificationId(verificationId);
			setReauthVerificationCode('');
			setIsReauthCodeSent(true);
		} catch (err) {
			const { message } = handleAuthError(err);
			setError(message);
		} finally {
			setIsReauthLoading(false);
		}
	};

	const handleVerifyReauthCode = async () => {
		if (!reauthResolver || !reauthVerificationId || !reauthVerificationCode.trim()) {
			setError(getValidationError('MFA_CODE_REQUIRED'));
			return;
		}

		setIsReauthLoading(true);
		setError('');

		try {
			const credential = PhoneAuthProvider.credential(reauthVerificationId, reauthVerificationCode.trim());
			const assertion = PhoneMultiFactorGenerator.assertion(credential);
			await reauthResolver.resolveSignIn(assertion);
			resetReauthFlow();
			setShowEnrollment(true);
		} catch (err) {
			const { data, message } = handleAuthError(err);
			let errorMessage = message;
			if (data?.code === 'auth/invalid-verification-code') {
				errorMessage = getValidationError('MFA_INVALID_CODE');
			} else if (data?.code === 'auth/code-expired') {
				errorMessage = getValidationError('MFA_CODE_EXPIRED');
				setIsReauthCodeSent(false);
				setReauthVerificationId('');
				setReauthVerificationCode('');
			}
			setError(errorMessage);
		} finally {
			setIsReauthLoading(false);
		}
	};

	const handleEnrollmentSuccess = async () => {
		setShowEnrollment(false);
		setSuccess('Authenticator app added successfully.');
		if (user) await refreshTotpStatus(user);
		onTotpEnrolled();
	};

	const handleEnrollmentError = (msg: string) => {
		setError(msg);
	};

	if (!user) return null;

	return (
		<div className={styles.formGroup}>
			<p className={styles.sectionLabel}>Authenticator App (TOTP)</p>

			{error && <FormMessage type="error" message={error} />}
			{success && <FormMessage type="success" message={success} />}

			{!showEnrollment && !showReauthPrompt && (
				<>
					<p className={styles.helpText}>
						Current status: <strong>{isTotpEnrolled ? 'Configured' : 'Not configured'}</strong>
					</p>
					{!isTotpEnrolled && (
						<div className={styles.mfaButtonGroup}>
							<FormButton variant="secondary" type="button" onClick={handleStartEnrollment} isLoading={isLoading} loadingText="Setting up…">
								Add Authenticator App
							</FormButton>
						</div>
					)}
				</>
			)}

			{showReauthPrompt && (
				<div className={styles.mfaReauthSection}>
					{!reauthResolver ? (
						<>
							<label htmlFor="totpReauthPassword">Confirm Password</label>
							<p className={styles.helpText}>Your session expired. Enter your password to refresh your sign-in.</p>
							<input
								id="totpReauthPassword"
								type="password"
								value={reauthPassword}
								onChange={(e) => {
									setReauthPassword(e.target.value);
									if (error) setError('');
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										void handleReauthenticate();
									}
								}}
								className={styles.input}
								autoComplete="current-password"
								placeholder="Confirm current password"
								disabled={isBusy}
							/>
							<div className={styles.mfaButtonGroup}>
								<FormButton
									variant="primary"
									type="button"
									onClick={handleReauthenticate}
									isLoading={isReauthLoading}
									loadingText="Confirming…"
									disabled={!reauthPassword.trim()}
								>
									Confirm Password
								</FormButton>
								<FormButton
									variant="secondary"
									type="button"
									onClick={() => {
										resetReauthFlow();
										setError('');
									}}
									disabled={isReauthLoading}
								>
									Cancel
								</FormButton>
							</div>
						</>
					) : !isReauthCodeSent ? (
						<>
							<p className={styles.helpText}>
								Password accepted. Send a code to {getMaskedFactorDisplay(reauthHint)} to finish re-authentication.
							</p>
							<div className={styles.mfaButtonGroup}>
								<FormButton
									variant="primary"
									type="button"
									onClick={handleSendReauthCode}
									isLoading={isReauthLoading}
									loadingText="Sending…"
								>
									Send MFA Code
								</FormButton>
								<FormButton
									variant="secondary"
									type="button"
									onClick={() => {
										resetReauthFlow();
										setError('');
									}}
									disabled={isReauthLoading}
								>
									Cancel
								</FormButton>
							</div>
						</>
					) : (
						<>
							<label htmlFor="totpReauthCode">MFA Verification Code</label>
							<p className={styles.helpText}>Enter the 6-digit code sent to {getMaskedFactorDisplay(reauthHint)}.</p>
							<input
								id="totpReauthCode"
								type="text"
								value={reauthVerificationCode}
								onChange={(e) => {
									setReauthVerificationCode(e.target.value.replace(/\D/g, ''));
									if (error) setError('');
								}}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										void handleVerifyReauthCode();
									}
								}}
								className={styles.input}
								autoComplete="one-time-code"
								placeholder="Enter 6-digit code"
								maxLength={6}
								disabled={isBusy}
							/>
							<div className={styles.mfaButtonGroup}>
								<FormButton
									variant="primary"
									type="button"
									onClick={handleVerifyReauthCode}
									isLoading={isReauthLoading}
									loadingText="Verifying…"
									disabled={reauthVerificationCode.trim().length !== 6}
								>
									Verify and Continue
								</FormButton>
								<FormButton variant="secondary" type="button" onClick={handleSendReauthCode} disabled={isReauthLoading}>
									Send New Code
								</FormButton>
								<FormButton
									variant="secondary"
									type="button"
									onClick={() => {
										resetReauthFlow();
										setError('');
									}}
									disabled={isReauthLoading}
								>
									Cancel
								</FormButton>
							</div>
						</>
					)}
				</div>
			)}

			{showEnrollment && user && (
				<MfaTotpEnrollment
					user={user}
					onSuccess={handleEnrollmentSuccess}
					onError={handleEnrollmentError}
					onBack={() => {
						setShowEnrollment(false);
						setError('');
					}}
				/>
			)}

			<div id={TOTP_RECAPTCHA_CONTAINER_ID} className={styles.recaptchaContainer} />
		</div>
	);
};
