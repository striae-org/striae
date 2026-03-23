/**
 * Common messages for case import, export, and case management operations.
 * Centralizing messages prevents drift and ensures consistent user experience across the app.
 */

// Import validation messages
export const IMPORT_FILE_TYPE_NOT_ALLOWED =
  'Only Striae case ZIP files, confirmation ZIP files, or confirmation JSON files are allowed.';

export const IMPORT_FILE_TYPE_NOT_SUPPORTED =
  'The selected file is not a supported Striae case or confirmation import package.';

// Import blocking messages
export const ARCHIVED_REGULAR_CASE_BLOCK_MESSAGE =
  'This archived case cannot be imported because the case already exists in your regular case list. Delete the regular case before importing this archive.';

// Read-only case operations
export const CREATE_READ_ONLY_CASE_EXISTS_ERROR = (caseNumber: string): string =>
  `Case "${caseNumber}" already exists as a read-only review case.`;

export const CLEAR_READ_ONLY_CASE_SUCCESS = (caseNumber: string): string =>
  `Removed read-only case "${caseNumber}"`;

export const CLEAR_READ_ONLY_CASE_PARTIAL_FAILURE = (caseNumber: string): string =>
  `Failed to fully clear read-only case "${caseNumber}". Please try again. If this was an archived import that overlaps a regular case, verify that all case images are accessible before retrying.`;

export const CLEAR_READ_ONLY_CASE_GENERIC_ERROR =
  'Failed to clear existing case';

export const NO_READ_ONLY_CASE_LOADED =
  'No read-only case is currently loaded.';

export const CANNOT_DELETE_READ_ONLY_CASE_FILES =
  'Cannot delete files for read-only cases.';

export const READ_ONLY_CASE_CANNOT_ARCHIVE_AGAIN =
  'This case is already read-only and cannot be archived again.';

// Data integrity messages
export const DATA_INTEGRITY_VALIDATION_PASSED = '✓ Validation passed';

export const DATA_INTEGRITY_VALIDATION_FAILED = '✗ Validation failed';

export const DATA_INTEGRITY_BLOCKED_TAMPERING =
  '⚠️ Import Blocked: Data hash validation failed. This file may have been tampered with or corrupted and cannot be imported.';

// Confirmation/review messages
export const CONFIRM_CASE_IMPORT =
  'Are you sure you want to import this case for review?';

// Export operation messages
export const EXPORT_FAILED = 'Export failed. Please try again.';

export const EXPORT_ALL_FAILED = 'Export all cases failed. Please try again.';

export const ENTER_CASE_NUMBER_REQUIRED = 'Please enter a case number';

// Deletion confirmation and errors
export const DELETE_CASE_CONFIRMATION = (caseNumber: string): string =>
  `Are you sure you want to delete case ${caseNumber}? This will permanently delete all associated files and cannot be undone. If any image assets are already missing (404), they will be skipped and the case deletion will continue.`;

export const DELETE_FILE_CONFIRMATION = (fileName: string): string =>
  `Are you sure you want to delete ${fileName}? This action cannot be undone.`;

export const DELETE_CASE_FAILED = 'Failed to delete case.';

export const DELETE_FILE_FAILED = 'Failed to delete file.';

export const RENAME_CASE_FAILED = 'Failed to rename case.';
