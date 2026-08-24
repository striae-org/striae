// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

export { loadCaseExportActions, type CaseExportActionsModule } from '~/utils/data/operations/case-export-loader';

export const getExportProgressLabel = (progress: number): string => {
	if (progress < 30) {
		return 'Loading case data';
	}

	if (progress < 50) {
		return 'Preparing archive';
	}

	if (progress < 80) {
		return 'Adding files';
	}

	if (progress < 96) {
		return 'Finalizing';
	}

	return 'Downloading';
};
