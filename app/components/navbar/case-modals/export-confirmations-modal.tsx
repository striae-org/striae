// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import styles from './case-modal-shared.module.css';

interface ExportConfirmationsModalProps {
	isOpen: boolean;
	caseNumber: string;
	confirmedCount: number;
	unconfirmedCount: number;
	isSubmitting?: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export const ExportConfirmationsModal = ({
	isOpen,
	caseNumber,
	confirmedCount,
	unconfirmedCount,
	isSubmitting = false,
	onClose,
	onConfirm,
}: ExportConfirmationsModalProps) => {
	const confirmButtonRef = useRef<HTMLButtonElement>(null);

	const { requestClose, overlayProps, getCloseButtonProps } = useOverlayDismiss({
		isOpen,
		onClose,
		canDismiss: !isSubmitting,
	});

	useEffect(() => {
		if (!isOpen) return;

		const focusId = window.requestAnimationFrame(() => {
			confirmButtonRef.current?.focus();
		});

		return () => {
			window.cancelAnimationFrame(focusId);
		};
	}, [isOpen]);

	if (!isOpen) return null;

	const confirmationLabel = confirmedCount === 1 ? '1 confirmation' : `${confirmedCount} confirmations`;

	return (
		<div className={styles.overlay} aria-label="Close export confirmations dialog" {...overlayProps}>
			<div className={`${styles.modal} ${styles.modalCompact}`} role="dialog" aria-modal="true" aria-label="Export Confirmations">
				<button {...getCloseButtonProps({ ariaLabel: 'Close export confirmations dialog' })}>×</button>
				<h3 className={styles.title}>Export Confirmations</h3>
				<p className={styles.subtitle}>Case: {caseNumber}</p>
				{unconfirmedCount > 0 && (
					<div className={styles.warningPanel}>
						<p>
							<strong>
								{unconfirmedCount} image{unconfirmedCount !== 1 ? 's' : ''} {unconfirmedCount !== 1 ? 'are' : 'is'} unconfirmed.
							</strong>
						</p>
						<p>Only confirmed images will be included in this export.</p>
					</div>
				)}
				<p className={styles.description}>
					{confirmedCount === 0 ? 'No confirmed images found for this case.' : `${confirmationLabel} will be exported.`}
				</p>
				<div className={styles.actions}>
					<button type="button" className={styles.cancelButton} onClick={requestClose} disabled={isSubmitting}>
						Cancel
					</button>
					<button
						ref={confirmButtonRef}
						type="button"
						className={`${styles.confirmButton} ${styles.confirmButtonPrimary}`}
						onClick={onConfirm}
						disabled={isSubmitting || confirmedCount === 0}
					>
						{isSubmitting ? 'Exporting...' : 'Export Confirmations'}
					</button>
				</div>
			</div>
		</div>
	);
};
