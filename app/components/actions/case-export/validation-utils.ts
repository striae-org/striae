import { validateCaseNumber } from '../case-manage';

/**
 * Validate case number format for export (includes file system checks)
 */
export function validateCaseNumberForExport(caseNumber: string): { isValid: boolean; error?: string } {
	if (!caseNumber || !caseNumber.trim()) {
		return { isValid: false, error: 'Case number is required' };
	}

	const trimmed = caseNumber.trim();

	// Use the main validation function first
	if (!validateCaseNumber(trimmed)) {
		return { isValid: false, error: 'Invalid case number format (only letters, numbers, and hyphens allowed, max 25 characters)' };
	}

	// Additional file system validation for export
	const invalidChars = /[<>:"/\\|?*]/;
	if (invalidChars.test(trimmed)) {
		return { isValid: false, error: 'Case number contains invalid characters for file export' };
	}

	return { isValid: true };
}
