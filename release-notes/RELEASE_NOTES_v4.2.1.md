# Striae Release Notes - v4.2.1

**Release Date**: March 21, 2026
**Period**: March 20 - March 21, 2026
**Total Commits**: 18 (non-merge since v4.2.0)

## Patch Release - Notes UX Polish, Confirmation Status Cleanup, and Worker/Dependency Tightening

## Summary

v4.2.1 delivers focused patch-level refinements across the case notes workflow, confirmation status lifecycle handling, and worker/API reliability. The release includes UI polish for notes and case information spacing, stronger cleanup behavior for confirmation status files during account/case lifecycle events, and tightening of worker flow/fallback behavior. It also captures maintenance updates including Firebase and Wrangler dependency bumps plus compatibility-date refreshes.

## Detailed Changes

### Notes and Case UI Refinements

- Refactored notes modal naming and adjusted notes modal spacing/styling for cleaner layout behavior.
- Shifted notes feedback messaging to toast-based interactions for more consistent status signaling.
- Applied case information spacing refinements and added sidebar open-case button polish.

### Confirmation Status File Lifecycle Hardening

- Added modular confirmation status utilities to support cleaner lifecycle handling.
- Ensured confirmation status files are cleaned during account deletion paths.
- Updated deletion/archival case paths so confirmation status state is consistently updated and pruned.

### Data and Worker Flow Tightening

- Continued data operations modular refactor work.
- Tightened worker flow behavior and removed API gateway fallback paths to reduce drift and ambiguity.
- Included follow-up code review resolution refinements in this release window.

### Dependency and Compatibility Maintenance

- Bumped Firebase from 12.10.0 to 12.11.0.
- Bumped Wrangler from 4.75.0 to 4.76.0.
- Refreshed compatibility-date metadata and removed Tailwind/PostCSS footprint during cleanup.
- Updated license notice content as part of repository hygiene.

## Release Statistics

- **Commit Range**: `v4.2.0..v4.2.1`
- **Commits Included**: 18 (non-merge)
- **Build Status**: Succeeded (npm run build)
- **Typecheck Status**: Passed (npm run typecheck)
- **Lint Status**: Passed with warnings — 0 errors, 12 warnings (npm run lint)

## Closing Note

v4.2.1 is a stabilization patch that improves notes/case interaction quality, strengthens confirmation-state cleanup guarantees, and tightens worker communication behavior while keeping dependency and runtime metadata current.
