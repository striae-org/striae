# Striae Release Notes - v4.3.0

**Release Date**: March 22, 2026
**Period**: March 21 - March 22, 2026
**Total Commits**: 37 (non-merge since v4.2.1 release)

## Minor Release - Case Management Expansion, Annotation Detail Enhancements, and PDF Formatting Evolution

## Summary

v4.3.0 expands case-management workflows, deepens annotation metadata/detail handling, and continues the modular PDF formatting trajectory. This release adds and refines file/case management modal behavior, introduces additional annotation detail capabilities (including class-type and calculation context), and evolves report formatting with multi-page format work and worker-side support updates.

## Detailed Changes

### Case and Notes Management UX Expansion

- Added and iterated file-management and case-management modal flows.
- Continued notes workflow development and styling refinements across entry and display surfaces.
- Unified modal styling and applied targeted text-entry and management-surface polish.
- Added sidebar confirmation-export flow support.

### Annotation Metadata and Ballistics Detail Enhancements

- Added/propagated class-type metadata in stored case/annotation data.
- Refactored class-details handling and pushed class details into additional notes pathways.
- Added calculation explanation coverage and diameter-calculation workflow updates.
- Added new annotation types, including shotshell characteristic support.
- Expanded selectable value handling (for example, jacket metal includes a none option).

### PDF Report Formatting and Worker Support

- Continued modular PDF report formatting implementation, including multi-page format work.
- Added worker/report formatting follow-up updates and generated-assets example refreshes.
- Applied worker wrangler/config alignment and review-window hardening updates.

### Platform Maintenance and Stabilization

- Captured additional code-review follow-up stabilization updates.
- Maintained runtime and tooling alignment (including compatibility-date refresh and dependency upkeep in the release window).

## Release Statistics

- **Commit Range**: `v4.2.1 (release baseline)..v4.3.0`
- **Commits Included**: 37 (non-merge)
- **Build Status**: Succeeded (npm run build)
- **Typecheck Status**: Passed (npm run typecheck)
- **Lint Status**: Passed with warnings - 0 errors, 12 warnings (npm run lint)

## Closing Note

v4.3.0 advances day-to-day examiner workflow efficiency through stronger management surfaces, richer annotation/context capture, and ongoing PDF/report pipeline modularization while preserving release-window stability checks and validation discipline.
