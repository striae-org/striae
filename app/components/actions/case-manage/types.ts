export interface DeleteCaseResult {
	missingImages: string[];
}

export interface CaseArchiveDetails {
	archived: boolean;
	archivedAt?: string;
	archivedBy?: string;
	archivedByDisplay?: string;
	archiveReason?: string;
}

export interface DeleteFileWithoutAuditOptions {
	skipCaseDataUpdate?: boolean;
	skipValidation?: boolean;
}

export interface DeleteFileWithoutAuditResult {
	imageMissing: boolean;
	fileName: string;
}
