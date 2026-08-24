// Copyright (c) 2025 Stephen J. Lu
// SPDX-License-Identifier: Apache-2.0

// Export-related types and interfaces

export interface ExportOptions {
	includeMetadata?: boolean;
	includeUserInfo?: boolean;
	protectForensicData?: boolean;
	designatedReviewerEmail?: string;
	archivePackageMode?: boolean;
}
