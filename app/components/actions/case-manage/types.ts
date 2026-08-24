// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

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
