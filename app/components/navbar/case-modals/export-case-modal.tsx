import { useEffect, useRef, useState } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import styles from './case-modal-shared.module.css';

interface ExportCaseModalProps {
	isOpen: boolean;
	caseNumber: string;
	currentUserEmail?: string;
	isSubmitting?: boolean;
	onClose: () => void;
	onSubmit: (designatedReviewerEmail: string | undefined) => Promise<void>;
}

export const ExportCaseModal = ({
	isOpen,
	caseNumber,
	currentUserEmail,
	isSubmitting = false,
	onClose,
	onSubmit,
}: ExportCaseModalProps) => {
	const [email, setEmail] = useState<string>('');

	const isSelfEmail = email.trim().length > 0 && !!currentUserEmail && email.trim().toLowerCase() === currentUserEmail.toLowerCase();
	const inputRef = useRef<HTMLInputElement>(null);

	const handleClose = () => {
		setEmail('');
		onClose();
	};

	const isSubmitDisabled = isSubmitting || isSelfEmail;

	const { requestClose, overlayProps, getCloseButtonProps } = useOverlayDismiss({
		isOpen,
		onClose: handleClose,
		canDismiss: !isSubmitting,
	});

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const focusId = window.requestAnimationFrame(() => {
			inputRef.current?.focus();
		});

		return () => {
			window.cancelAnimationFrame(focusId);
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const handleSubmit = async () => {
		const trimmed = email.trim() || undefined;
		await onSubmit(trimmed);
		setEmail('');
	};

	return (
		<div className={styles.overlay} aria-label="Close export case dialog" {...overlayProps}>
			<div className={`${styles.modal} ${styles.modalWide}`} role="dialog" aria-modal="true" aria-label="Export Case">
				<button {...getCloseButtonProps({ ariaLabel: 'Close export case dialog' })}>×</button>
				<h3 className={styles.title}>Export Case</h3>
				<p className={styles.subtitle}>Case: {caseNumber}</p>
				<p className={styles.description}>
					You may designate a specific email address for review approval. Only the user with the supplied email address will be able to open
					your case for review in Striae. (Optional)
				</p>
				<input
					ref={inputRef}
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className={styles.input}
					placeholder="Reviewer email address (optional)"
					disabled={isSubmitting}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && !isSubmitDisabled) {
							void handleSubmit();
						}
					}}
				/>
				{isSelfEmail && (
					<p className={styles.emailError}>You cannot designate yourself as the reviewer. The recipient must be a different Striae user.</p>
				)}
				<div className={styles.actions}>
					<button type="button" className={styles.cancelButton} onClick={requestClose} disabled={isSubmitting}>
						Cancel
					</button>
					<button
						type="button"
						className={`${styles.confirmButton} ${styles.confirmButtonPrimary}`}
						onClick={() => void handleSubmit()}
						disabled={isSubmitDisabled}
					>
						{isSubmitting ? 'Exporting...' : 'Export Case'}
					</button>
				</div>
			</div>
		</div>
	);
};
