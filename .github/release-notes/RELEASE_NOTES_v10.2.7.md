# Striae Release Notes - v10.2.7

**Release Date**: August 28, 2026
**Period**: August 27, 2026 - August 28, 2026
**Total Commits**: 9 (non-merge since the v10.2.6 release)

## Patch Release - License Headers, Deploy GUI Refinements, and Admin-Service Example Hardening

## Summary

v10.2.7 is a small follow-up patch to v10.2.6. It adds SPDX license and copyright headers to the test suite restored in the previous release, removes the publishing action group from the deploy GUI and hardens its static-file path check, and replaces the admin-service example config's exposed Firebase service-account JSON key shape with a plain placeholder warning. It also carries a round of Bash 3.2 (macOS) compatibility fixes for `deploy-config.sh` and CRLF-stripping fixes for account ID handling in two deploy scripts, plus routine dependency and compatibility-date maintenance.

## Detailed Changes

### License Headers for Test Sources

- **SPDX Headers on Test Files** - Added `Copyright (c) 2025 Stephen J. Lu` / `SPDX-License-Identifier: Apache-2.0` headers to all 52 files restored to source control in v10.2.6, including the app-level `tests/app/**/*.test.ts` suites (account deletion, audit, case export/import, confirmations, forensics, security) and the per-worker `tests/workers/**/*.test.ts` suites and `vitest.config.mjs` files, keeping them in step with the header rollout completed in v10.2.3.

### Deploy GUI Refinements

- **Publishing Section Removed** - Removed the "Publishing" action group (`publish-npm`, `publish-npm-dry-run`, `publish-github`, `publish-github-dry-run`, `publish-all`, `publish-all-dry-run`) from `scripts/deploy-gui/actions.mjs`. Publishing to npm/GitHub Packages remains available via the existing `npm run publish:*` scripts directly, but is no longer surfaced in the GUI.
- **Static-File Path Check Hardening (Security Fix)** - Fixed the deploy GUI's static-file serving guard in `server.mjs` so it checks for a path-separator boundary (`resolved === PUBLIC_DIR || resolved.startsWith(PUBLIC_DIR + path.sep)`) instead of a raw `startsWith(PUBLIC_DIR)` prefix check, closing a sibling-directory bypass (e.g. a directory named `PUBLIC_DIR-evil` would previously have passed the check).
- **Screenshot Asset Cleanup** - Removed the local `public/assets/deploy-gui-screenshot.png` now that the deploy GUI screenshot referenced from release notes is served from `striae.org` directly.

### Admin-Service Example Hardening (Security Fix)

- **No More Exposed Key Shape** - Replaced the full Firebase service-account JSON key shape in `app/config-example/admin-service.json` with a single warning message instructing the user to replace the file with their actual admin service account configuration. This avoids publishing the exact field layout of a sensitive credential file in example form.

### Deploy Script Compatibility and Reliability Fixes

- **Bash 3.2 (macOS) Compatibility** - Replaced `${var,,}` lowercase expansions in `deploy-config.sh`'s `is_placeholder`, `env-utils.sh`'s `normalize_worker_label_value`, and `keys.sh`'s `is_admin_service_placeholder` with `shopt -s nocasematch` case-insensitive glob matching (and a pure-bash `to_lower_ascii` helper) since `${var,,}` and `local -l`/`declare -l` require Bash 4+ and previously broke on Bash 3.2, the default `/bin/bash` on macOS.
- **Account ID CRLF Stripping** - `deploy-pages.sh` and `upload-registries.sh` now strip stray carriage returns from `ACCOUNT_ID` before exporting it as `CLOUDFLARE_ACCOUNT_ID`, preventing Windows-originated `.env` line endings from breaking non-interactive account disambiguation for `wrangler pages deploy` and `wrangler r2 object put`.
- **Encoding Fix** - Corrected mis-encoded shield emoji characters in `deploy-pages.sh`'s admin-service guard log output.

### Dependency and Compatibility Maintenance

- **Dependency Bumps** - Bumped `isbot` to `5.2.2`, `@cloudflare/vite-plugin` to `1.54.1`, `@cloudflare/workers-types` to `5.20260827.1`, and `wrangler` to `4.127.1` at the root and across all six workers, with matching `package-lock.json` refreshes.
- **Compatibility-Date Refresh** - Updated `compatibility_date` to `2026-08-28` in `wrangler.toml.example` and all worker `wrangler.jsonc.example` files.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.6.md
- **Commits Included**: 9 (non-merge commits from 2026-08-27 through 2026-08-28)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.7 is a housekeeping patch: it closes out the license-header rollout for the restored test suite, trims and hardens the new deploy GUI from v10.2.6, and removes a sensitive credential shape from example configuration, all without changing runtime application behavior.
