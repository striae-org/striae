# Striae Release Notes - v4.3.1

**Release Date**: March 22, 2026
**Period**: March 22 - March 22, 2026
**Total Commits**: 8 (non-merge since v4.3.0 release)

## Patch Release - Confirmation Import Signature Verification, Audit Trail Archival Fixes, Case Management Read-Only Guardrails, and UI Refinements

## Summary

v4.3.1 delivers focused patch-level corrections to confirmation import workflows, audit trail archival operations, case management behavior, and targeted UI refinements. The release fixes signature verification logic in confirmation import flows, resolves audit trail archival fetch behavior, strengthens read-only and archive case management guardrails, and applies polish to reviewer badge display and CSV export handling. Together, these updates enhance data integrity in the confirmations pipeline, prevent unsafe operations on read-only cases, and strengthen audit trail management reliability.

## Detailed Changes

### Confirmation Import and Signature Verification

- Fixed confirmation import signature verification logic to ensure accurate validation of imported confirmation signatures.
- Applied confirmation import audit refinements and enhanced status tracking during import workflows.

### Audit Trail Archival and Fetch Operations

- Fixed audit trail archival fetch logic to correctly retrieve archived audit entries.
- Corrected CSV export handling for audit data to ensure proper formatting and data integrity.
- Fixed reviewer badgeID display in audit viewer for accurate audit trail inspector UX.

### Case Management Read-Only and Archive Guardrails

- Disabled **Open Case** and **List All Cases** in the Case Management menu when a read-only or archived case is loaded, requiring the read-only case to be cleared first before switching or listing cases.
- Disabled **Delete Case** while a read-only case is loaded to prevent improper deletion that would not correctly clear the read-only state.
- Added **Clear RO Case** to the Maintenance section of the Case Management menu, available only when a read-only or archived case is active, providing a proper cleanup workflow.
- Blocked archive import when the case already exists in the user's regular case list (active or archived). A clear error message is now shown directing the user to delete the existing case before importing the archive.

### UI and Display Refinements

- Applied targeted refinements to confirmation status displays and badge rendering.
- Improved audit trail viewer presentation and reviewer information display accuracy.

## Release Statistics

- **Commit Range**: `v4.3.0..v4.3.1`
- **Commits Included**: 8 (non-merge)
- **Build Status**: Succeeded (npm run build)
- **Typecheck Status**: Passed (npm run typecheck)
- **Lint Status**: Passed with warnings — 0 errors, 12 warnings (npm run lint)

## Closing Note

v4.3.1 is a stabilization patch that strengthens confirmation import reliability through signature verification corrections, hardens audit trail archival operations, enforces read-only and archive case management guardrails, and applies targeted UI polish to enhance data integrity and inspection workflows across the confirmations, case management, and audit management surfaces.
