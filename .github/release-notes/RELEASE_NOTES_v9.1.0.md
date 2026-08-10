# Striae Release Notes - v9.1.0

**Release Date**: August 9, 2026
**Period**: August 8, 2026 to August 9, 2026
**Total Commits**: 2 (non-merge after the v9.0.1 release)

## Minor Release - Confirmation Audit Trail Merge + Signature Trust-Anchor Hardening

## Summary

v9.1.0 focuses on the confirmation audit-trail merge implementation for confirmation imports. Reviewer-generated audit entries are now merged into the original examiner's live case audit trail so confirmation imports preserve a complete, attributable audit history and remain verifiable after import.

This release also closes a signature trust-anchor risk in import verification by removing bundled PEM trust as a source of truth and resolving verification keys from trusted configured key mappings by `keyId`.

## Detailed Changes

### Confirmation Audit Trail Merge

- Implemented the confirmation audit-trail merge flow during confirmation import so reviewer-generated audit entries are carried into the recipient case's live audit trail.
- Preserved audit continuity and provenance for confirmation imports by wiring the merge step into the existing verification and import handling path.
- Hardened the import workflow around malformed or unverifiable reviewer bundles so incomplete audit state is avoided when a merge cannot be completed safely.

### Signature Trust-Anchor Hardening

- Removed package-shipped PEM trust from case and confirmation import verification paths so bundled keys are no longer treated as the verification source of truth.
- Anchored signature verification to trusted configured signing keys resolved by signature `keyId`.
- Added a fail-closed packaged-PEM mismatch guard that rejects imports when a bundled PEM is present but does not match the trusted configured key for that `keyId`.

### Release and Packaging Alignment

- Updated package and worker package versions to v9.1.0.
- Refreshed release documentation and supported-version metadata to reflect the new minor release.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v9.0.1.md
- **Commits Included**: 2 (non-merge commits from 2026-08-08 through 2026-08-09)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v9.1.0 improves confirmation import audit fidelity by merging reviewer audit trails into the active case record so audit history remains complete and trustworthy.
