/**
 * Centralized data worker operations for case and file management.
 *
 * This module remains the public compatibility surface for existing imports.
 * Implementation details are split across domain modules in ./operations.
 */

export * from './operations';

export {
  getConfirmationSummaryTelemetry,
  resetConfirmationSummaryTelemetry,
  type CaseConfirmationSummary,
  type ConfirmationSummaryEnsureOptions,
  type ConfirmationSummaryTelemetry,
  type FileConfirmationSummary,
  type UserConfirmationSummaryDocument
} from './confirmation-summary/summary-core';
