// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from 'react';

// State interfaces
interface ImportState {
	selectedFile: File | null;
	isImporting: boolean;
	isClearing: boolean;
	isLoadingPreview: boolean;
	showConfirmation: boolean;
	importType: 'case' | 'confirmation' | null;
}

interface MessageState {
	error: string;
	success: string;
}

interface ProgressState {
	stage: string;
	progress: number;
	details?: string;
}

/**
 * Custom hook for managing import-related state
 */
export const useImportState = () => {
	const [importState, setImportState] = useState<ImportState>({
		selectedFile: null,
		isImporting: false,
		isClearing: false,
		isLoadingPreview: false,
		showConfirmation: false,
		importType: null,
	});

	const [messages, setMessages] = useState<MessageState>({
		error: '',
		success: '',
	});

	const [importProgress, setImportProgress] = useState<ProgressState | null>(null);

	// Helper functions
	const clearMessages = useCallback(() => {
		setMessages({ error: '', success: '' });
	}, []);

	const setError = useCallback((error: string) => {
		setMessages({ error, success: '' });
	}, []);

	const setSuccess = useCallback((success: string) => {
		setMessages({ error: '', success });
	}, []);

	const updateImportState = useCallback((updates: Partial<ImportState>) => {
		setImportState((prev) => ({ ...prev, ...updates }));
	}, []);

	const resetImportState = useCallback(() => {
		setImportState({
			selectedFile: null,
			isImporting: false,
			isClearing: false,
			isLoadingPreview: false,
			showConfirmation: false,
			importType: null,
		});
		clearMessages();
		setImportProgress(null);
	}, [clearMessages]);

	return {
		// State
		importState,
		messages,
		importProgress,

		// Actions
		clearMessages,
		setError,
		setSuccess,
		updateImportState,
		resetImportState,
		setImportProgress,
	};
};
