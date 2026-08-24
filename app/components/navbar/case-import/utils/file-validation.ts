// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

const CASE_EXPORT_DATA_FILE_REGEX = /_data\.json$/i;
const CONFIRMATION_EXPORT_FILE_REGEX = /^confirmation-data-.*\.json$/i;
const FORENSIC_MANIFEST_FILE_NAME = 'forensic_manifest.json';
const ENCRYPTION_MANIFEST_FILE_NAME = 'encryption_manifest.json';

function getLeafFileName(path: string): string {
	const segments = path.split('/').filter(Boolean);
	return segments.length > 0 ? segments[segments.length - 1] : path;
}

/**
 * Check if a file is a valid ZIP file
 */
export const isValidZipFile = (file: File): boolean => {
	return file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.name.toLowerCase().endsWith('.zip');
};

/**
 * Check if a file is valid for import (ZIP packages only)
 */
export const isValidImportFile = (file: File): boolean => {
	return isValidZipFile(file);
};

/**
 * Get import type based on file
 */
export const getImportType = (file: File): 'case' | 'confirmation' | null => {
	if (isValidZipFile(file)) return 'case';
	return null;
};

/**
 * Resolve import type, including ZIP package inspection.
 * Case ZIPs are identified by case data files or FORENSIC_MANIFEST.json.
 * Confirmation ZIPs are identified by confirmation-data-*.json plus ENCRYPTION_MANIFEST.json.
 */
export const resolveImportType = async (file: File): Promise<'case' | 'confirmation' | null> => {
	if (!isValidZipFile(file)) {
		return null;
	}

	try {
		const JSZip = (await import('jszip')).default;
		const zip = await JSZip.loadAsync(file);
		const fileEntries = Object.keys(zip.files).filter((path) => !zip.files[path].dir);

		const hasCaseData = fileEntries.some((path) => CASE_EXPORT_DATA_FILE_REGEX.test(getLeafFileName(path)));
		const hasManifest = fileEntries.some((path) => getLeafFileName(path).toLowerCase() === FORENSIC_MANIFEST_FILE_NAME);

		if (hasCaseData || hasManifest) {
			return 'case';
		}

		const hasConfirmationData = fileEntries.some((path) => CONFIRMATION_EXPORT_FILE_REGEX.test(getLeafFileName(path)));

		const hasEncryptionManifest = fileEntries.some((path) => getLeafFileName(path).toLowerCase() === ENCRYPTION_MANIFEST_FILE_NAME);

		if (hasConfirmationData && hasEncryptionManifest) {
			return 'confirmation';
		}

		return null;
	} catch {
		return null;
	}
};

/**
 * Reset file input element
 */
export const resetFileInput = (ref: React.RefObject<HTMLInputElement | null>): void => {
	if (ref.current) {
		ref.current.value = '';
	}
};
