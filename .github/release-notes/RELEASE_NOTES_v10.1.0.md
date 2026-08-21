# Striae Release Notes - v10.1.0

**Release Date**: August 21, 2026
**Period**: August 16, 2026 to August 21, 2026
**Total Commits**: 11 (non-merge since the v10.0.1 release)

## Minor Release - Data Entry Enhancements, Legacy Type Removal, and Unencrypted Fallback Removal

## Summary

v10.1.0 expands item data entry with shotshell length and consolidated shot size capture, adds an 'RN' bullet type option, and removes legacy `classType`/single-`itemType` fallback handling now that the split item model is the sole path. It also removes unencrypted data-at-rest fallback pathways as a security hardening measure, closing out the last remaining plaintext code paths. Additional fixes cover case review import upload dates, confirmation-summary check timing, rename-case warnings, and PDF report formatting.

## Detailed Changes

### Data Entry Enhancements

- **Shotshell Length Field** - Added a shotshell length input to item data entry, with corresponding state, shared field definitions, and annotation type updates.
- **Shot Size Consolidation** - Consolidated shot size data entry into a single field with custom/other value support, replacing the previous split entry pattern.
- **Bullet Type Option** - Added 'RN' (round nose) to the bullet type option list.

### Legacy Type and Fallback Removal

- **`classType`/Single-`itemType` Fallback Removal** - Removed legacy `classType` and single-`itemType` fallback handling across canvas rendering, notes editor, file filters, confirmation summary, case export, and the PDF `striae` format, now that all call sites rely solely on the split item model.
- **Unencrypted Data Fallback Removal (Security Fix)** - Removed remaining unencrypted data-at-rest fallback pathways from the data worker's storage routes, key registry, audit/data worker types, account-deletion cleanup, and related deploy-config/secrets scripts and examples, ensuring encrypted-only handling with no plaintext fallback.

### Case Review Import and Confirmation Fixes

- **Original Upload Date Retention** - Fixed case review imports to retain the original uploaded date for images instead of assigning a new one during import.
- **Confirmation-Summary Check Interval** - Increased the confirmation-summary staleness check interval from 5 minutes to one hour to reduce unnecessary recomputation.
- **Rename Case Warning** - Added a warning to the rename-case modal, with a follow-up wording refinement.

### Report and File Management Refinements

- **PDF Report Formatting** - Refined report layout and `striae` format rendering for improved output consistency.
- **Other-Files Modal and Filtering** - Improved the other-files modal with a file extension filter and applied related code-review follow-ups to the case sidebar and PDF `striae` format.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.0.1.md
- **Commits Included**: 11 (non-merge commits from 2026-08-16 through 2026-08-21)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.1.0 continues the split item data model transition to completion by removing legacy class/item type fallbacks, closes the remaining plaintext data-at-rest gap with a security-focused fallback removal, and rounds out item data entry with shotshell length and shot size consolidation. Case review import, confirmation-summary timing, and PDF report formatting fixes round out the release.
