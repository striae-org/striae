# Striae Release Notes - v10.1.0

**Release Date**: August 21, 2026
**Period**: August 16, 2026 to August 21, 2026
**Total Commits**: 11 (non-merge since the v10.0.1 release)

## Minor Release - Data Entry Enhancements, Legacy Type Removal, and Unencrypted Fallback Removal

## Summary

v10.1.0 expands item data entry with shotshell length and consolidated shot size capture, adds an 'RN' bullet type option, and removes legacy `classType`/single-`itemType` fallback handling now that the split item model is the sole path. It also removes unencrypted data-at-rest fallback pathways as a security hardening measure, closing out the last remaining plaintext code paths. The user worker gains a scheduled orphan file sweep that reconciles leftover R2 file blobs, and account deletion no longer blocks on incomplete per-case cleanup as a result. The audit trail write path now retries transparently in the background and warns the user only if all attempts are exhausted. Additional fixes cover case review import upload dates, confirmation-summary check timing, rename-case warnings, and PDF report formatting.

## Detailed Changes

### Data Entry Enhancements

- **Shotshell Length Field** - Added a shotshell length input to item data entry, with corresponding state, shared field definitions, and annotation type updates.
- **Shot Size Consolidation** - Consolidated shot size data entry into a single field with custom/other value support, replacing the previous split entry pattern.
- **Bullet Type Option** - Added 'RN' (round nose) to the bullet type option list.

### Legacy Type and Fallback Removal

- **`classType`/Single-`itemType` Fallback Removal** - Removed legacy `classType` and single-`itemType` fallback handling across canvas rendering, notes editor, file filters, confirmation summary, case export, and the PDF `striae` format, now that all call sites rely solely on the split item model.
- **Unencrypted Data Fallback Removal (Security Fix)** - Removed remaining unencrypted data-at-rest fallback pathways from the data worker's storage routes, key registry, audit/data worker types, account-deletion cleanup, and related deploy-config/secrets scripts and examples, ensuring encrypted-only handling with no plaintext fallback.

### Scheduled Orphan File Sweep and Account Deletion Reliability

- **Daily Orphan File Sweep** - Added a scheduled (`cron`, daily at 03:00 UTC) user-worker job that reconciles `STRIAE_FILES` against file IDs referenced by case data in `STRIAE_DATA` and deletes unreferenced file blobs older than a 24-hour grace period, capped per run to bound execution time.
- **Shared Best-Effort Case File Reader** - Extracted case-data file-reference resolution into a shared `case-data-reader.ts` helper used by both account deletion and the new sweep; it tolerates legacy/undecryptable records and never throws, so callers can always proceed.
- **Account Deletion No Longer Blocks on Case Cleanup Errors** - Firebase Authentication and KV record removal now always complete during account deletion, even if per-case R2 cleanup encounters errors. Cleanup failures are reported back via the response `success`/`message` fields instead of aborting the deletion, with the new sweep acting as a safety net for any leftover file blobs.

### Audit Trail Write Reliability

- **Background Retry on Persist Failure** - The audit write path now retries a failed entry up to two additional times in the background (1s, then 2s spacing) before giving up, without blocking the caller or the triggering user action.
- **Failure Notification Toast** - Added `AuditService.subscribeToPersistFailures` so the main workspace and login screens can show a one-time warning toast when all three write attempts fail, informing the user the entry may be missing from the audit trail while leaving their completed action unaffected.

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

v10.1.0 continues the split item data model transition to completion by removing legacy class/item type fallbacks, closes the remaining plaintext data-at-rest gap with a security-focused fallback removal, and rounds out item data entry with shotshell length and shot size consolidation. A new scheduled orphan file sweep and a more resilient, non-blocking account deletion flow improve storage hygiene and reliability, and the audit trail write path is now more resilient to transient failures with background retries and clear user-facing feedback when persistence ultimately fails. Case review import, confirmation-summary timing, and PDF report formatting fixes round out the release.
