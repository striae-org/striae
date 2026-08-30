# Striae Release Notes - v10.2.9

**Release Date**: August 30, 2026
**Period**: August 29, 2026 - August 30, 2026
**Total Commits**: 13 (non-merge since the v10.2.8 release)

## Patch Release - Case Deletion Cleanup, Audit Trail Accuracy Fixes, Test Formatting Coverage, and Contribution Policy Clarification

## Summary

v10.2.9 is a small follow-up patch to v10.2.7/v10.2.8. It removes a duplicated deletion/audit code path in case deletion, fixes several audit trail accuracy issues around deleted-file counts and file byte sizes, extends Prettier formatting coverage to the `tests/` and `workers/` directories, strips ANSI escape codes from deploy GUI log output before it reaches the browser, refreshes dependencies and compatibility dates, and clarifies the project's contributing policy.

## Detailed Changes

### Case Deletion Cleanup

- **Deduplicated No-Files Deletion Path (Internal Refactor)** - `deleteCase` in `app/components/actions/case-manage/operations.ts` previously had a separate, near-duplicate code block for removing user case data, cleaning up the confirmation summary, and audit-logging the deletion when a case had no files to delete. That block has been removed in favor of a single shared exit path, with the `missingFiles` tracking variable hoisted so the "already missing" note in the audit message is preserved regardless of whether the case had files.

### Audit Trail Accuracy Fixes

- **Accurate Deleted-File Count on Case Deletion (Bug Fix)** - `deleteCase`'s audit message previously reported the case's total file count as "deleted" even when some files were already missing (tracked separately in `missingFiles`). The audit message now reports the actual deleted count (`fileCount - missingFiles.length`), keeping the "already missing" note distinct from the deleted count.
- **Byte Size Tracking for Case Image Files (Bug Fix)** - `FileData` (case image files) previously had no byte-size field at all, unlike `OtherFileData` (associated files), which already tracked `byteLength`. Image uploads (`uploadFile` in `image-manage.ts`, `uploadImageBlob` in `case-import/image-operations.ts`) now record `byteLength` at upload time, and file-delete/file-access audit entries for images use the tracked size instead of a hardcoded `0`.
- **File-Access Audit Entries Now Report Real Size** - `logFileAccess` and `buildFileAccessAuditParams` gained an optional `fileSize` parameter, threaded from the already-available `FileData`/`OtherFileData` object at all image and associated-file access call sites, instead of always reporting `0`.
- **"N/A" Instead of Misleading "0" for Untracked Sizes** - `PerformanceMetrics.fileSizeBytes` and `FileAuditDetails.fileSize` are now optional (`number | undefined`) rather than required, so genuinely not-applicable events (case create/rename/delete/archive failures, confirmation and PDF-generation events, annotation events) omit the field instead of faking `0`. The Audit Trail viewer (`AuditEntriesList`) now always renders the File Size row for `file-upload`/`file-delete`/`file-access` entries, showing the formatted size in MB when tracked, or **"N/A"** when not (e.g. files uploaded before size-tracking existed).

### Test Formatting and Deploy GUI Log Cleanup

- **Prettier Coverage Extended to Tests and Workers** - `format`/`format:check` npm scripts now also cover `tests/**/*.{ts,mjs,json,jsonc}` and `workers/**/*.{ts,js}`; `.prettierignore` no longer excludes `tests/`. All in-scope test files and a handful of worker source files were reformatted to match, and the per-worker `.prettierrc` files (which duplicated the root config) were removed.
- **Deploy GUI ANSI Stripping Fix (Bug Fix)** - `scripts/deploy-gui/runner.mjs` now strips ANSI escape sequences from a log chunk before emitting the `log` event (previously only the derived `progress` event was stripped), preventing raw escape codes from reaching the browser's `<pre>` log pane, which can't render them.

### Dependency and Compatibility Maintenance

- **Cloudflare Toolchain Bump** - Bumped `@cloudflare/vite-plugin` from `~1.43.1` to `^1.54.2` at the root; `@cloudflare/vitest-pool-workers` stayed at `^0.18.0`.
- **Compatibility-Date Refresh** - Bumped `compatibility_date` to `2026-08-28` in `wrangler.toml.example` and all worker `wrangler.jsonc.example` files.
- **Lockfile Refresh** - Refreshed the root `package-lock.json` to match the updated dependency tree.

### Contribution Policy and Socket Badge Removal

- **Selective Contribution Policy Clarified** - `.github/CONTRIBUTING.md` now explicitly states that Striae moderates contributions closely given its sensitive forensic workflows and cannot accept unsolicited pull requests; contributors are asked to reach out to `dev@striae.org` before starting work, and PRs opened without prior contact will be closed without review.

### Release Metadata

- **Version Bump** - Bumped `package.json`/`package-lock.json` and all seven worker `package.json`/`package-lock.json` files to `10.2.9`, and updated the supported version table in `.github/SECURITY.md`.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.8.md
- **Commits Included**: 13 (non-merge commits from 2026-08-29 through 2026-08-30)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.9 is a housekeeping patch: it removes duplicated deletion logic, fixes several audit trail accuracy issues around deleted-file counts and file byte sizes, extends formatting coverage to tests and workers, fixes a deploy GUI log-rendering rough edge, refreshes dependencies and compatibility dates, and clarifies the project's contribution policy.
