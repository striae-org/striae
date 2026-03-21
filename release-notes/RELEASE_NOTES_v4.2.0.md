# Striae Release Notes - v4.2.0

**Release Date**: March 20, 2026
**Period**: March 19 - March 20, 2026
**Total Commits**: 62 (non-merge since v4.1.0)

## Minor Release - Case Archival Workflow, Integrity Hardening, and Navigation Refactor

## Summary

v4.2.0 introduces a full case archival workflow with stronger protections around archived case operations, including import, deletion, and review safeguards. The release also hardens package integrity and audit signature verification paths for archive handling and improves reliability through a shared verification utility. In parallel, the primary app navigation and modal surfaces were refactored to centralize actions and reduce UI complexity.

## Detailed Changes

### Case Archival Workflow and Archived-Case Guardrails

- Introduced case archival workflow phases with follow-up archival ID refinements and cleanup.
- Added support for archival imports and updated archived-case import gating behavior.
- Improved archived-case operation controls, including targeted fixes for confirm-button and deletion behavior.
- Added warnings and cleanup handling for archived-case re-import and lifecycle edge cases.

### Archive Integrity and Signature Verification Hardening

- Implemented a globally shared integrity verification utility to standardize verification behavior across related flows.
- Closed audit signature verification gaps and hardened verification handling for archived content.
- Added tamper-detection improvements for import preview checks on archived packages.
- Fixed archive image bundling and related import integrity paths to reduce verification regressions.

### Audit and User Metadata Coverage

- Expanded Badge/ID propagation across audit entries and related audit outputs.
- Improved user metadata flow into audit displays and supporting UI surfaces.
- Added bundled audit trail viewing refinements to improve retrieval and consistency.

### Navigation, Modal, and Layout Refactor

- Refactored case actions into the navbar and iterated a new navbar structure for primary workflows.
- Moved modal and notes surfaces into cleaner component structure and improved sidebar interactions.
- Standardized modal close and Escape-key behavior for more consistent interaction handling.
- Applied additional workflow UI refinements for labels, import modal titles, and case management actions.

### Operations and Compatibility Maintenance

- Updated compatibility-date metadata in deployment/runtime configuration.
- Removed stale keybase artifact and completed related repository cleanup in this release window.

## Release Statistics

- **Commit Range**: `v4.1.0..v4.2.0`
- **Commits Included**: 62 (non-merge)
- **Build Status**: Succeeded (npm run build)
- **Typecheck Status**: Succeeded (npm run typecheck)
- **Lint Status**: Passed (npm run lint)

## Closing Note
v4.2.0 focuses on making archived case handling safer and more reliable while consolidating navigation and modal behavior for smoother day-to-day workflows. It also strengthens verification and audit integrity paths so archive imports and forensic reporting remain consistent under stricter validation.
