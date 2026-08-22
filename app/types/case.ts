import { type FileData, type OtherFileData } from './file';
import { type AnnotationData, type ConfirmationData } from './annotations';
import { type ValidationAuditEntry } from './audit';

// Case-related types and interfaces

export type CaseActionType = 'loaded' | 'created' | 'deleted' | null;

export interface BundledAuditTrailData {
	source: 'archive-bundle';
	importedAt: string;
	exportTimestamp?: string;
	totalEntries?: number;
	entries: ValidationAuditEntry[];
}

// Reviewing examiner audit entries merged into the original examiner's live case on confirmation import.
export interface ConfirmationAuditBundle {
	source: 'confirmation-bundle';
	importedAt: string;
	exportTimestamp?: string;
	totalEntries?: number;
	reviewingExaminerUid?: string;
	reviewingExaminerName?: string;
	reviewingExaminerBadgeId?: string;
	confirmationFileName?: string;
	entries: ValidationAuditEntry[];
}

export interface CaseData {
	createdAt: string;
	caseNumber: string;
	files: FileData[];
	otherFiles?: OtherFileData[];
	isReadOnly?: boolean;
	archived?: boolean;
	archivedAt?: string;
	archivedBy?: string;
	archivedByDisplay?: string;
	archiveReason?: string;
	bundledAuditTrail?: BundledAuditTrailData;
	confirmationAuditTrails?: ConfirmationAuditBundle[];
}

export interface ReadOnlyCaseData extends CaseData {
	isReadOnly?: boolean;
}

export interface CasesToDelete {
	casesToDelete: string[];
}

export interface CaseExportData {
	metadata: {
		caseNumber: string;
		caseCreatedDate: string;
		archived?: boolean;
		archivedAt?: string;
		archivedBy?: string;
		archivedByDisplay?: string;
		archiveReason?: string;
		exportDate: string;
		exportedBy: string | null;
		exportedByUid: string;
		exportedByName: string;
		exportedByCompany: string;
		exportedByBadgeId?: string;
		designatedReviewerEmail?: string;
		striaeExportSchemaVersion: string;
		totalFiles: number;
	};
	files: Array<{
		fileData: FileData;
		annotations?: AnnotationData;
		hasAnnotations: boolean;
	}>;
	otherFiles?: Array<{
		fileData: OtherFileData;
	}>;
	summary?: {
		filesWithAnnotations: number;
		filesWithoutAnnotations: number;
		totalBoxAnnotations: number;
		filesWithConfirmations?: number;
		filesWithConfirmationsRequested?: number;
		lastModified?: string;
		earliestAnnotationDate?: string;
		latestAnnotationDate?: string;
		exportError?: string;
	};
}

// Confirmation-related case types
export interface CaseConfirmations {
	[originalImageId: string]: ConfirmationData[];
}

export interface CaseDataWithConfirmations {
	createdAt: string;
	caseNumber: string;
	files: FileData[];
	otherFiles?: OtherFileData[];
	isReadOnly?: boolean;
	archived?: boolean;
	archivedAt?: string;
	archivedBy?: string;
	archivedByDisplay?: string;
	archiveReason?: string;
	importedAt?: string;
	originalImageIds?: { [originalId: string]: string };
	originalCaseOwnerUid?: string;
	confirmations?: CaseConfirmations;
	bundledAuditTrail?: BundledAuditTrailData;
}
