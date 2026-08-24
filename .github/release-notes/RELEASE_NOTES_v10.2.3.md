# Striae Release Notes - v10.2.3

**Release Date**: August 23, 2026
**Period**: August 23, 2026 (same-day)
**Total Commits**: 1 (non-merge since the v10.2.2 release)

## Patch Release - License and Copyright Headers

## Summary

v10.2.3 is a small, same-day patch that adds SPDX license and copyright headers across the project's source files and introduces an automated script (plus companion npm commands) to insert and verify those headers going forward. No application behavior, worker logic, or API contracts changed.

## Detailed Changes

### License and Copyright Header Rollout (Repository Hygiene)

- **Bulk Header Insertion** - Added a `Copyright (c) 2025 Stephen J. Lu` / `SPDX-License-Identifier: Apache-2.0` header block to 337 in-scope tracked source files across `app/`, `workers/`, `functions/`, `shared/`, `scripts/`, and eligible root-level config files (`vite.config.ts`, `react-router.config.ts`, `load-context.ts`, `eslint.config.js`).
- **New Header Automation Script** - Added `scripts/add-license-headers.mjs`, which discovers in-scope tracked files via `git ls-files`, inserts the appropriate comment-style header (`//` for TS/JS, CSS-style for `.css`, `#` for shell scripts) when missing, and supports a `--check` mode that exits non-zero if any in-scope file lacks a header.
- **New npm Scripts** - Added `npm run add-license-headers` (writes missing headers) and `npm run check-license-headers` (verification-only); `npm run lint` now also runs `check-license-headers` as part of its pipeline so future files without headers fail linting.
- **Scope Exclusions** - `tests/` and `.d.ts` files are excluded from header enforcement.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.2.md
- **Commits Included**: 1 (non-merge commit from 2026-08-23)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.3 is a repository-hygiene-only patch with no changes to application behavior, worker logic, storage formats, or public APIs.
