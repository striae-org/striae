import type { User } from 'firebase/auth';
import { checkUserExistsApi } from '~/utils/api';
import { type CaseExportData, type ConfirmationImportData } from '~/types';
import { type ManifestSignatureVerificationResult, verifyConfirmationSignature } from '~/utils/forensics';
import { checkExistingCase } from '../case-manage';
export { removeForensicWarning, validateConfirmationHash } from '~/utils/forensics';

const REDACTED_UID_VALUES = new Set(['[user info excluded]', 'n/a', 'na', 'unknown', 'null', 'undefined']);

function toNonEmptyString(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function normalizeExporterUid(value: unknown): string | null {
	const candidate = toNonEmptyString(value);
	if (!candidate) {
		return null;
	}

	if (REDACTED_UID_VALUES.has(candidate.toLowerCase())) {
		return null;
	}

	return candidate;
}

function resolveExporterUid(caseData: CaseExportData, parsedData: unknown): string | null {
	const root = parsedData && typeof parsedData === 'object' ? (parsedData as Record<string, unknown>) : {};
	const metadata = root.metadata && typeof root.metadata === 'object' ? (root.metadata as Record<string, unknown>) : {};

	const candidates: unknown[] = [
		caseData.metadata.exportedByUid,
		caseData.metadata.archivedBy,
		metadata.exportedByUid,
		metadata.exportedByUID,
		metadata.exporterUid,
		metadata.exporterUID,
		metadata.archivedBy,
		metadata.archivedByUid,
		metadata.archivedByUID,
		metadata.userUid,
		metadata.userUID,
		root.exportedByUid,
		root.exportedByUID,
		root.exporterUid,
		root.exporterUID,
		root.archivedBy,
		root.archivedByUid,
		root.archivedByUID,
		root.userUid,
		root.userUID,
	];

	for (const candidate of candidates) {
		const resolved = normalizeExporterUid(candidate);
		if (resolved) {
			return resolved;
		}
	}

	return null;
}

/**
 * Validate that a user exists in the database by UID and is not the current user
 */
export async function validateExporterUid(exporterUid: string, currentUser: User): Promise<{ exists: boolean; isSelf: boolean }> {
	const exists = await checkUserExistsApi(currentUser, exporterUid);
	const isSelf = exporterUid === currentUser.uid;

	return { exists, isSelf };
}

export function isArchivedExportData(parsedData: unknown): boolean {
	if (!parsedData || typeof parsedData !== 'object') {
		return false;
	}

	const root = parsedData as Record<string, unknown>;

	if (root.archived === true) {
		return true;
	}

	if (typeof root.archivedAt === 'string' && root.archivedAt.trim().length > 0) {
		return true;
	}

	const metadata = root.metadata;
	if (!metadata || typeof metadata !== 'object') {
		return false;
	}

	const metadataRecord = metadata as Record<string, unknown>;

	if (metadataRecord.archived === true) {
		return true;
	}

	if (typeof metadataRecord.archivedAt === 'string' && metadataRecord.archivedAt.trim().length > 0) {
		return true;
	}

	return false;
}

export async function validateCaseExporterUidForImport(
	caseData: CaseExportData,
	currentUser: User,
	parsedData: unknown = caseData,
): Promise<{
	exists: boolean;
	isSelf: boolean;
	isArchivedExport: boolean;
	allowArchivedSelfImport: boolean;
}> {
	const isArchivedExport = isArchivedExportData(parsedData);
	const exportedByUid = resolveExporterUid(caseData, parsedData);

	if (!exportedByUid) {
		if (isArchivedExport) {
			// Some legacy or privacy-sanitized archived exports may not retain exporter UID fields.
			// Archived import safety is still enforced by integrity/signature checks and regular-case conflict checks.
			return {
				exists: true,
				isSelf: false,
				isArchivedExport: true,
				allowArchivedSelfImport: true,
			};
		}

		throw new Error('Case export is missing usable exporter UID information. This case cannot be imported.');
	}

	let validation: { exists: boolean; isSelf: boolean };
	try {
		validation = await validateExporterUid(exportedByUid, currentUser);
	} catch {
		throw new Error('Unable to validate exporter identity right now. Please retry the import.');
	}

	if (!validation.exists) {
		throw new Error('The original exporter is not a valid Striae user. This case cannot be imported.');
	}

	let allowArchivedSelfImport = false;

	if (isArchivedExport) {
		const existingRegularCase = await checkExistingCase(currentUser, caseData.metadata.caseNumber);
		allowArchivedSelfImport = existingRegularCase === null;
	}

	if (validation.isSelf && !allowArchivedSelfImport) {
		throw new Error(
			'You cannot import a case that you originally exported unless it is an archived case that has already been deleted from your regular case list.',
		);
	}

	return {
		...validation,
		isArchivedExport,
		allowArchivedSelfImport,
	};
}

/**
 * Check if file is a confirmation data import
 */
export function isConfirmationDataFile(filename: string): boolean {
	return filename.startsWith('confirmation-data') && filename.endsWith('.json');
}

/**
 * Validate imported case data integrity (optional verification)
 */
export function validateCaseIntegrity(
	caseData: CaseExportData,
	imageFiles: { [filename: string]: Blob },
): { isValid: boolean; issues: string[] } {
	const issues: string[] = [];

	// Check if all referenced images exist
	for (const fileEntry of caseData.files) {
		const filename = fileEntry.fileData.originalFilename;
		if (!imageFiles[filename]) {
			issues.push(`Missing image file: ${filename}`);
		}
	}

	// Check if there are extra images not referenced in case data
	const referencedFiles = new Set(caseData.files.map((f) => f.fileData.originalFilename));
	for (const filename of Object.keys(imageFiles)) {
		if (!referencedFiles.has(filename)) {
			issues.push(`Unreferenced image file: ${filename}`);
		}
	}

	// Validate metadata completeness
	if (!caseData.metadata.caseNumber) {
		issues.push('Missing case number in metadata');
	}

	if (!caseData.metadata.exportDate) {
		issues.push('Missing export date in metadata');
	}

	// Validate annotation data
	for (const fileEntry of caseData.files) {
		if (fileEntry.hasAnnotations && !fileEntry.annotations) {
			issues.push(`File ${fileEntry.fileData.originalFilename} marked as having annotations but no annotation data found`);
		}
	}

	return {
		isValid: issues.length === 0,
		issues,
	};
}

/**
 * Validate confirmation data file signature.
 */
export async function validateConfirmationSignatureFile(
	confirmationData: Partial<ConfirmationImportData>,
): Promise<ManifestSignatureVerificationResult> {
	return verifyConfirmationSignature(confirmationData);
}
