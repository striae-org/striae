// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { previewCaseImport, previewConfirmationImport } from '~/components/actions/case-review';
import { type CaseImportPreview, type ConfirmationImportPreview } from '~/types';

interface UseFilePreviewReturn {
	casePreview: CaseImportPreview | null;
	confirmationPreview: ConfirmationImportPreview | null;
	loadCasePreview: (file: File) => Promise<void>;
	loadConfirmationPreview: (file: File) => Promise<void>;
	clearPreviews: () => void;
}

/**
 * Custom hook for handling file preview loading
 */
export const useFilePreview = (
	user: User | null,
	setError: (error: string) => void,
	setIsLoadingPreview: (loading: boolean) => void,
	clearImportData: () => void,
): UseFilePreviewReturn => {
	const [casePreview, setCasePreview] = useState<CaseImportPreview | null>(null);
	const [confirmationPreview, setConfirmationPreview] = useState<ConfirmationImportPreview | null>(null);

	const loadCasePreview = useCallback(
		async (file: File) => {
			if (!user) {
				setError('User authentication required');
				return;
			}

			setIsLoadingPreview(true);
			try {
				const preview = await previewCaseImport(file, user);
				setCasePreview(preview);
			} catch (error) {
				console.error('Error loading case preview:', error);
				setError(`Failed to read case information: ${error instanceof Error ? error.message : 'Unknown error'}`);
				clearImportData();
			} finally {
				setIsLoadingPreview(false);
			}
		},
		[user, setError, setIsLoadingPreview, clearImportData],
	);

	const loadConfirmationPreview = useCallback(
		async (file: File) => {
			if (!user) {
				setError('User authentication required');
				return;
			}

			setIsLoadingPreview(true);
			try {
				const preview = await previewConfirmationImport(file, user);
				setConfirmationPreview(preview);
			} catch (error) {
				console.error('Error loading confirmation preview:', error);
				setError(`Failed to read confirmation data: ${error instanceof Error ? error.message : 'Invalid confirmation package format'}`);
				clearImportData();
			} finally {
				setIsLoadingPreview(false);
			}
		},
		[user, setError, setIsLoadingPreview, clearImportData],
	);

	const clearPreviews = useCallback(() => {
		setCasePreview(null);
		setConfirmationPreview(null);
	}, []);

	return {
		casePreview,
		confirmationPreview,
		loadCasePreview,
		loadConfirmationPreview,
		clearPreviews,
	};
};
