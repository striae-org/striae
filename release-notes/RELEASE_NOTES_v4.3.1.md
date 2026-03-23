# Striae Release Notes - v4.3.1

**Release Date**: March 22, 2026
**Period**: March 22 - March 22, 2026
**Total Commits**: 7 (non-merge since v4.3.0 release)

## Patch Release - Confirmation Import Signature Verification, Audit Trail Archival Fixes, and UI Refinements

## Summary

v4.3.1 delivers focused patch-level corrections to confirmation import workflows, audit trail archival operations, and targeted UI refinements. The release fixes signature verification logic in confirmation import flows, resolves audit trail archival fetch behavior, and applies polish to reviewer badge display and CSV export handling. Together, these updates enhance data integrity in confirmations pipeline and strengthen audit trail management reliability.

## Detailed Changes

### Confirmation Import and Signature Verification

- Fixed confirmation import signature verification logic to ensure accurate validation of imported confirmation signatures.
- Applied confirmation import audit refinements and enhanced status tracking during import workflows.

### Audit Trail Archival and Fetch Operations

- Fixed audit trail archival fetch logic to correctly retrieve archived audit entries.
- Corrected CSV export handling for audit data to ensure proper formatting and data integrity.
- Fixed reviewer badgeID display in audit viewer for accurate audit trail inspector UX.

### UI and Display Refinements

- Applied targeted refinements to confirmation status displays and badge rendering.
- Improved audit trail viewer presentation and reviewer information display accuracy.

## Release Statistics

- **Commit Range**: `v4.3.0..v4.3.1`
- **Commits Included**: 7 (non-merge)
- **Build Status**: Succeeded (npm run build)
- **Typecheck Status**: Passed (npm run typecheck)
- **Lint Status**: Passed with warnings — 0 errors, 12 warnings (npm run lint)

## Closing Note

v4.3.1 is a stabilization patch that strengthens confirmation import reliability through signature verification corrections, hardens audit trail archival operations, and applies targeted UI polish to enhance data integrity and inspection workflows across the confirmations and audit management surfaces.
