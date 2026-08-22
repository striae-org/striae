import { useState, useCallback, useRef, useEffect } from 'react';
import styles from './mobile-warning.module.css';

const DISMISSED_KEY = 'striae-mobile-warning-dismissed';

const isBrowser = typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export function MobileWarning() {
	const [dismissed, setDismissed] = useState<boolean>(() => {
		if (!isBrowser) {
			// Match previous server behavior: render null during SSR.
			return true;
		}

		try {
			return window.sessionStorage.getItem(DISMISSED_KEY) === '1';
		} catch {
			return false;
		}
	});

	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!dismissed && buttonRef.current) {
			buttonRef.current.focus();
		}
	}, [dismissed]);

	const handleDismiss = useCallback(() => {
		if (isBrowser) {
			try {
				window.sessionStorage.setItem(DISMISSED_KEY, '1');
			} catch {
				// Ignore storage errors and still dismiss for this session.
			}
		}
		setDismissed(true);
	}, []);

	useEffect(() => {
		if (dismissed) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleDismiss();
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [dismissed, handleDismiss]);

	if (dismissed) {
		return null;
	}

	return (
		<div
			className={styles.overlay}
			role="dialog"
			aria-modal="true"
			aria-labelledby="mobile-warning-title"
			aria-describedby="mobile-warning-message"
		>
			{/* Backdrop dismiss button covers area outside dialog content */}
			<button type="button" className={styles.backdrop} onClick={handleDismiss} aria-label="Dismiss" tabIndex={-1} />
			<div className={styles.content}>
				<div className={styles.icon}>
					<svg
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
						<line x1="12" y1="18" x2="12.01" y2="18" />
					</svg>
				</div>
				<h2 className={styles.title} id="mobile-warning-title">
					Desktop Experience Only
				</h2>
				<p className={styles.message} id="mobile-warning-message">
					Striae is designed for desktop browsers and is not optimized for mobile devices or tablets. For the best experience, please use a
					desktop computer.
				</p>
				<button ref={buttonRef} type="button" className={styles.dismissButton} onClick={handleDismiss}>
					Continue Anyway
				</button>
			</div>
		</div>
	);
}
