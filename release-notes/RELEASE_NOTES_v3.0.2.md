# Striae Release Notes - v3.0.2

**Release Date**: March 9, 2026
**Period**: March 9 - March 9, 2026
**Total Commits**: 3 (non-merge; PDF report modularity, package version correction, footer branding update)

## Patch Release - PDF Report Modularity and Footer Branding

## Summary

- Added modular report-format request support for PDF generation with a typed `reportFormat` and `data` payload envelope.
- Refactored PDF worker type boundaries into shared report contracts to improve maintainability and prepare for additional report formats.
- Corrected package version sequencing during the release window prior to this patch increment.
- Added the Striae brand icon in generated PDF footer output next to "Notes formatted by Striae".

## Detailed Changes

### PDF Worker Modularity

- Updated PDF generation client action to submit a report-envelope payload instead of only top-level data fields.
- Added shared report type contracts (`report-types.ts`) and report-module loading for format-specific rendering.
- Preserved backward compatibility by supporting legacy top-level payload shape in worker request resolution.

### Version and Package Alignment

- Reverted an unintended npm patch bump during the release window.
- Finalized package metadata alignment for the `v3.0.2` patch release.

### Report Footer Branding

- Added `icon-256` branding in the Striae PDF footer template.
- Positioned icon output adjacent to "Notes formatted by Striae" with footer layout/style adjustments.

## Key Fix Summary

| Category | Change | Impact |
| --- | --- | --- |
| PDF Worker Architecture | Report-format envelope + modular report loader | Establishes cleaner extension path for additional report formats |
| Type Safety | Shared report type contracts across app/worker surfaces | Reduces payload drift and improves maintainability |
| Release Hygiene | npm patch rollback before final bump | Keeps version progression consistent and intentional |
| PDF Output | Footer brand icon integration | Improves branded report presentation |

## Technical Implementation Details

### Application Layer

- `generate-pdf` now sends a structured request with explicit report format selection.

### Worker Layer

- Introduced report-module loader mapping and report request normalization.
- Added shared report type definitions consumed by worker modules.

### Template Layer

- Updated Striae report template footer structure and styling to include the brand icon.

## Release Statistics

- **Commit Range**: `v3.0.1..HEAD`
- **Commits Included**: 3 (non-merge)
- **Build Status**: Succeeded (`npm run build`)

## Closing Note

v3.0.2 is a focused patch release that improves PDF worker modularity and report branding while keeping release/version metadata aligned.
