# Striae Release Notes - v4.3.2

**Release Date**: March 22, 2026
**Period**: March 22 - March 22, 2026
**Total Commits**: 1 (non-merge since v4.3.1 release)

## Patch Release - Code Review Fixes for Confirmation Import Audit Filtering, Case Refresh Guardrails, and Audit Export Reviewer Metadata

## Summary

v4.3.2 is a focused code review patch that tightens confirmation import audit filtering, clarifies case refresh behavior after import operations, and corrects reviewer badge metadata sourcing in audit export summaries. These updates improve audit trail query accuracy, prevent unnecessary UI version increments, and keep reviewer information consistent in exported audit reports.

## Detailed Changes

### Confirmation Import Audit Filtering

- Updated audit viewer filtering logic to correctly include both dedicated `confirmation-import` actions and legacy import entries with confirmation workflow phase metadata.
- Aligned confirmation-import action matching to a shared helper for consistent filtering behavior.

### Case Refresh and Confirmation Version Guardrails

- Adjusted import result handling so confirmation version bumps occur only when a different case is updated.
- Preserved full annotation refresh behavior when the currently loaded case is the one updated.

### Audit Export Reviewer Metadata Correction

- Corrected reviewer badge ID resolution in confirmation import summaries by using the canonical `reviewerBadgeId` field.
- Removed stale dependency on nested profile details for reviewer badge mapping in export output.

## Release Statistics

- **Commit Range**: `v4.3.1..v4.3.2`
- **Commits Included**: 1 (non-merge)
- **Build Status**: Succeeded (npm run build)
- **Typecheck Status**: Passed (npm run typecheck)
- **Lint Status**: Passed with warnings - 0 errors, 12 warnings (npm run lint)

## Closing Note

v4.3.2 delivers targeted stabilization from code review findings, improving correctness across audit filtering, case refresh handling, and audit export reviewer attribution with minimal surface-area change.
