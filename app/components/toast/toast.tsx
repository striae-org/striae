// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { useEffect, type ReactNode } from 'react';
import { useOverlayDismiss } from '~/hooks/useOverlayDismiss';
import styles from './toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'loading';

interface ToastProps {
	message: ReactNode;
	type: ToastType;
	isVisible: boolean;
	onClose: () => void;
	duration?: number;
}

export const Toast = ({ message, type, isVisible, onClose, duration = 4000 }: ToastProps) => {
	const { requestClose, handleOverlayMouseDown, handleOverlayKeyDown } = useOverlayDismiss({
		isOpen: isVisible,
		onClose,
		closeOnEscape: false,
	});

	useEffect(() => {
		if (isVisible && duration > 0) {
			const timer = setTimeout(() => {
				requestClose();
			}, duration);

			return () => clearTimeout(timer);
		}
	}, [isVisible, requestClose, duration]);

	if (!isVisible) return null;

	return (
		<>
			<div
				className={styles.backdrop}
				onMouseDown={handleOverlayMouseDown}
				onKeyDown={handleOverlayKeyDown}
				role="button"
				tabIndex={0}
				aria-label="Close notification"
			></div>
			<div className={`${styles.toast} ${styles[type]} ${isVisible ? styles.show : ''}`}>
				<div className={styles.icon}>
					{type === 'loading' ? (
						<span className={styles.spinner} aria-hidden="true" />
					) : type === 'success' ? (
						'✓'
					) : type === 'warning' ? (
						'!'
					) : (
						'✗'
					)}
				</div>
				<span className={styles.message}>{message}</span>
				<button className={styles.closeButton} onClick={requestClose} aria-label="Close notification">
					×
				</button>
			</div>
		</>
	);
};
