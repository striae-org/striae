// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect, useCallback } from 'react';
import { multiFactor, type MultiFactorInfo, type User } from 'firebase/auth';
import { handleAuthError } from '~/services/firebase/errors';
import { getMfaMethodLabel } from '~/utils/auth';
import { FormButton, FormMessage } from '../form';
import styles from './user.module.css';

interface MfaEnrolledFactorsProps {
	user: User | null;
	refreshKey?: number;
	onFactorRemoved: () => void;
	onBusyChange?: (isBusy: boolean) => void;
}

export const MfaEnrolledFactors = ({ user, refreshKey, onFactorRemoved, onBusyChange }: MfaEnrolledFactorsProps) => {
	const [enrolledFactors, setEnrolledFactors] = useState<MultiFactorInfo[]>([]);
	const [removingUid, setRemovingUid] = useState<string | null>(null);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const loadFactors = useCallback(async (currentUser: User) => {
		try {
			await currentUser.reload();
			setEnrolledFactors([...multiFactor(currentUser).enrolledFactors]);
		} catch (err) {
			console.error('Failed to reload user factors:', err);
		}
	}, []);

	useEffect(() => {
		if (user) {
			void loadFactors(user);
		}
	}, [user, loadFactors, refreshKey]);

	const handleRemove = async (factor: MultiFactorInfo) => {
		if (!user) return;
		if (enrolledFactors.length <= 1) return;

		setRemovingUid(factor.uid);
		setError('');
		setSuccess('');
		onBusyChange?.(true);

		try {
			await multiFactor(user).unenroll(factor.uid);
			setSuccess(`${getMfaMethodLabel(factor.factorId)} removed successfully.`);
			await loadFactors(user);
			onFactorRemoved();
		} catch (err) {
			const { data, message } = handleAuthError(err);
			if (data?.code === 'auth/user-token-expired' || data?.code === 'auth/requires-recent-login') {
				setError('For security, please sign out and sign in again, then remove this factor.');
			} else {
				setError(message);
			}
		} finally {
			setRemovingUid(null);
			onBusyChange?.(false);
		}
	};

	useEffect(() => {
		return () => {
			onBusyChange?.(false);
		};
	}, [onBusyChange]);

	if (!user || enrolledFactors.length === 0) return null;

	return (
		<div className={styles.formGroup}>
			<p className={styles.sectionLabel}>Enrolled 2-Step Verification Methods</p>
			{error && <FormMessage type="error" message={error} />}
			{success && <FormMessage type="success" message={success} />}
			<ul className={styles.enrolledFactorsList}>
				{enrolledFactors.map((factor) => (
					<li key={factor.uid} className={styles.enrolledFactorItem}>
						<div className={styles.enrolledFactorInfo}>
							<span className={styles.enrolledFactorLabel}>{getMfaMethodLabel(factor.factorId)}</span>
							{factor.displayName && factor.displayName !== getMfaMethodLabel(factor.factorId) && (
								<span className={styles.enrolledFactorName}>{factor.displayName}</span>
							)}
							{factor.enrollmentTime && (
								<span className={styles.enrolledFactorDate}>Added {new Date(factor.enrollmentTime).toLocaleDateString()}</span>
							)}
						</div>
						<FormButton
							variant="secondary"
							type="button"
							onClick={() => handleRemove(factor)}
							isLoading={removingUid === factor.uid}
							loadingText="Removing…"
							disabled={removingUid !== null || enrolledFactors.length <= 1}
						>
							Remove
						</FormButton>
					</li>
				))}
			</ul>
			{enrolledFactors.length <= 1 && (
				<p className={styles.enrolledFactorsNote}>At least one 2-step verification method is required and cannot be removed.</p>
			)}
		</div>
	);
};
